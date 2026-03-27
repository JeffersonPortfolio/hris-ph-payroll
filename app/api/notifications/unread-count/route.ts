import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ count: 0 });
    }

    const userId = (session.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ count: 0 });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Notification count error:", error);
    return NextResponse.json({ count: 0 });
  }
}