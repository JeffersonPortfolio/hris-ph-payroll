-- Phase 1: Multi-Tenancy Foundation Migration
-- This migration adds the Company model and company_id foreign keys to core tables

-- Create SubscriptionStatus enum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL', 'EXPIRED');

-- Create SubscriptionType enum
CREATE TYPE "SubscriptionType" AS ENUM ('TRIAL', 'BASIC', 'PREMIUM', 'ENTERPRISE');

-- Add SUPER_ADMIN to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN' BEFORE 'ADMIN';

-- Create Company table
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "employeeLimit" INTEGER NOT NULL DEFAULT 50,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "subscriptionType" "SubscriptionType" NOT NULL DEFAULT 'TRIAL',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "demoExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- Add companyId to User table
ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
CREATE INDEX "User_companyId_idx" ON "User"("companyId");
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add companyId to Employee table
ALTER TABLE "Employee" ADD COLUMN "companyId" TEXT;
CREATE INDEX "Employee_companyId_idx" ON "Employee"("companyId");
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add companyId to Department table
ALTER TABLE "Department" ADD COLUMN "companyId" TEXT;
CREATE INDEX "Department_companyId_idx" ON "Department"("companyId");
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update Department unique constraint (name should be unique per company, not globally)
ALTER TABLE "Department" DROP CONSTRAINT IF EXISTS "Department_name_key";
CREATE UNIQUE INDEX "Department_name_companyId_key" ON "Department"("name", "companyId");

-- Add companyId to Role table (JobRole)
ALTER TABLE "Role" ADD COLUMN "companyId" TEXT;
CREATE INDEX "Role_companyId_idx" ON "Role"("companyId");
ALTER TABLE "Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Update Role unique constraint (name should be unique per company, not globally)
ALTER TABLE "Role" DROP CONSTRAINT IF EXISTS "Role_name_key";
CREATE UNIQUE INDEX "Role_name_companyId_key" ON "Role"("name", "companyId");
