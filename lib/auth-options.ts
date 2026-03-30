import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            employee: true,
            company: true,
          },
        });

        if (!user || !user.isActive) {
          throw new Error("Invalid credentials or account disabled");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // Check if the user's company is active (skip for super admins)
        if (user.role !== "SUPER_ADMIN" && user.company) {
          if (user.company.subscriptionStatus === "INACTIVE" || user.company.subscriptionStatus === "EXPIRED") {
            throw new Error("Your company account is inactive. Please contact your administrator.");
          }
          // Check demo expiration
          if (user.company.isDemo && user.company.demoExpiresAt) {
            if (new Date() > user.company.demoExpiresAt) {
              throw new Error("Your demo account has expired. Please contact sales to upgrade.");
            }
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          employeeId: user.employee?.id || null,
          companyId: user.companyId || null,
          companyName: user.company?.name || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.employeeId = (user as any).employeeId;
        token.companyId = (user as any).companyId;
        token.companyName = (user as any).companyName;
        token.impersonatedCompanyId = null;
        token.impersonatedCompanyName = null;
      }

      // Handle session updates (for impersonation)
      if (trigger === "update" && session) {
        if (session.impersonatedCompanyId !== undefined) {
          token.impersonatedCompanyId = session.impersonatedCompanyId;
          token.impersonatedCompanyName = session.impersonatedCompanyName || null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).employeeId = token.employeeId;
        (session.user as any).companyId = token.companyId;
        (session.user as any).companyName = token.companyName;
        (session.user as any).impersonatedCompanyId = token.impersonatedCompanyId || null;
        (session.user as any).impersonatedCompanyName = token.impersonatedCompanyName || null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
