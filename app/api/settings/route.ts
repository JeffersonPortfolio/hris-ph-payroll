import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getCompanyContext } from '@/lib/tenant';

// GET system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get company-specific settings first, then fall back to global
    const where: any = {};
    if (ctx.companyId) {
      where.OR = [
        { companyId: ctx.companyId },
        { companyId: null },
      ];
    }

    const settings = await prisma.systemSettings.findMany({ where });

    // Company-specific settings override global ones
    const settingsMap: Record<string, string> = {};
    // First apply global settings
    settings.filter(s => !s.companyId).forEach(s => {
      settingsMap[s.key] = s.value;
    });
    // Then override with company-specific settings
    settings.filter(s => s.companyId).forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// POST/PUT system settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPER_ADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const ctx = await getCompanyContext();
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 });
    }

    // Upsert each setting scoped to company
    const updates = Object.entries(settings).map(async ([key, value]) => {
      if (ctx.companyId) {
        // Company-specific settings - find existing or create
        const existing = await prisma.systemSettings.findFirst({
          where: { key, companyId: ctx.companyId },
        });
        if (existing) {
          return prisma.systemSettings.update({
            where: { id: existing.id },
            data: { value: String(value) },
          });
        } else {
          return prisma.systemSettings.create({
            data: { key, value: String(value), companyId: ctx.companyId },
          });
        }
      } else {
        // Global settings (super admin without impersonation)
        const existing = await prisma.systemSettings.findFirst({
          where: { key, companyId: null },
        });
        if (existing) {
          return prisma.systemSettings.update({
            where: { id: existing.id },
            data: { value: String(value) },
          });
        } else {
          return prisma.systemSettings.create({
            data: { key, value: String(value) },
          });
        }
      }
    });

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
