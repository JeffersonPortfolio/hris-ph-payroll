import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any)?.id;
    const { isRead } = await request.json();

    // Only allow updating own notifications
    const notification = await prisma.notification.findFirst({
      where: { id: params.id, userId },
    });

    if (!notification) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id: params.id },
      data: { isRead },
    });

    return NextResponse.json({ message: "Updated" });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
