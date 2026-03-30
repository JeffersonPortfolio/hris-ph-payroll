import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        leaveBalances: {
          where: { year: new Date().getFullYear() },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Get employee error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    const employeeIdFromSession = (session.user as any)?.employeeId;
    const { id } = params;

    // Employees can only update their own contact info
    if (role === "EMPLOYEE" && employeeIdFromSession !== id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();

    // If employee role, only allow contact info updates
    let updateData: any = {};
    if (role === "EMPLOYEE") {
      updateData = {
        mobileNumber: data.mobileNumber,
        currentAddress: data.currentAddress,
        permanentAddress: data.permanentAddress,
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelation: data.emergencyContactRelation,
        emergencyContactNumber: data.emergencyContactNumber,
      };
    } else {
      // Admin/HR can update all fields
      updateData = {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        gender: data.gender,
        civilStatus: data.civilStatus,
        nationality: data.nationality,
        placeOfBirth: data.placeOfBirth,
        currentAddress: data.currentAddress,
        permanentAddress: data.permanentAddress,
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelation: data.emergencyContactRelation,
        emergencyContactNumber: data.emergencyContactNumber,
        departmentId: data.departmentId !== undefined ? (data.departmentId || null) : undefined,
        roleId: data.roleId !== undefined ? (data.roleId || null) : undefined,
        employmentType: data.employmentType,
        employmentStatus: data.employmentStatus,
        regularizationDate: data.regularizationDate
          ? new Date(data.regularizationDate)
          : undefined,
        resignationDate: data.resignationDate
          ? new Date(data.resignationDate)
          : undefined,
        sssNumber: data.sssNumber,
        philHealthNumber: data.philHealthNumber,
        pagIbigNumber: data.pagIbigNumber,
        tinNumber: data.tinNumber,
        bankName: data.bankName,
        bankAccountNumber: data.bankAccountNumber,
        profilePhoto: data.profilePhoto,
        basicSalary: data.basicSalary !== undefined ? parseFloat(data.basicSalary) : undefined,
        geoEnabled: data.geoEnabled,
        geoLocationName: data.geoLocationName,
        geoLatitude: data.geoLatitude !== undefined ? (data.geoLatitude ? parseFloat(data.geoLatitude) : null) : undefined,
        geoLongitude: data.geoLongitude !== undefined ? (data.geoLongitude ? parseFloat(data.geoLongitude) : null) : undefined,
        geoRadius: data.geoRadius !== undefined ? parseFloat(data.geoRadius) : undefined,
      };
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        role: true,
      },
    });

    return NextResponse.json({ employee });
  } catch (error) {
    console.error("Update employee error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as any)?.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = params;

    // Soft delete - set isActive to false
    await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });

    // Also deactivate associated user account
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (employee?.userId) {
      await prisma.user.update({
        where: { id: employee.userId },
        data: { isActive: false },
      });
    }

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Delete employee error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}