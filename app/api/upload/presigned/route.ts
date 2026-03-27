import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { generatePresignedUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { fileName, contentType, isPublic } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json(
        { message: "fileName and contentType are required" },
        { status: 400 }
      );
    }

    const { uploadUrl, cloudStoragePath } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic || false
    );

    return NextResponse.json({ uploadUrl, cloudStoragePath });
  } catch (error) {
    console.error("Presigned URL error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}