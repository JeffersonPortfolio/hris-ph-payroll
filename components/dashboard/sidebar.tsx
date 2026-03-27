"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Building2,
  Briefcase,
  FileText,
  Settings,
  Bell,
  LogOut,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Calendar,
  DollarSign,
  Wallet,
  CreditCard,
  MapPin,
  Receipt,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MenuItem = {
  icon: any;
  label: string;
  href: string;
  roles: string[];
};

type MenuSection = {
  label: string;
  icon: any;
  roles: string[];
  items: MenuItem[];
};

type MenuEntry = MenuItem | MenuSection;

function isSection(entry: MenuEntry): entry is MenuSection {
  return "items" in entry;
}

const menuStructure: MenuEntry[] = [
  // 1. Dashboard
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", roles: ["ADMIN", "HR", "EMPLOYEE"] },

  // 2. Timekeeping
  {
    label: "Timekeeping",
    icon: Clock,
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    items: [
      { icon: Clock, label: "Attendance", href: "/attendance", roles: ["ADMIN", "HR", "EMPLOYEE"] },
      { icon: Calendar, label: "Holidays", href: "/holidays", roles: ["ADMIN", "HR", "EMPLOYEE"] },
      { icon: CalendarDays, label: "Leaves", href: "/leaves", roles: ["ADMIN", "HR", "EMPLOYEE"] },
    ],
  },

  // 3. Payroll
  {
    label: "Payroll",
    icon: DollarSign,
    roles: ["ADMIN", "HR", "EMPLOYEE"],
    items: [
      { icon: DollarSign, label: "Payroll", href: "/payroll", roles: ["ADMIN", "HR"] },
      { icon: Receipt, label: "My Payslip", href: "/payslip", roles: ["EMPLOYEE"] },
      { icon: Wallet, label: "Allowances", href: "/allowances", roles: ["ADMIN", "HR"] },
      { icon: SlidersHorizontal, label: "Adjustments", href: "/adjustments", roles: ["ADMIN", "HR"] },
      { icon: CreditCard, label: "Loans", href: "/loans", roles: ["ADMIN", "HR"] },
      { icon: FileText, label: "Reports", href: "/reports", roles: ["ADMIN", "HR"] },
    ],
  },

  // 4. Settings
  {
    label: "Settings",
    icon: Settings,
    roles: ["ADMIN", "HR"],
    items: [
      { icon: Users, label: "Employees", href: "/employees", roles: ["ADMIN", "HR"] },
      { icon: MapPin, label: "Office Locations", href: "/office-locations", roles: ["ADMIN", "HR"] },
      { icon: Building2, label: "Departments", href: "/departments", roles: ["ADMIN", "HR"] },
      { icon: Briefcase, label: "Roles", href: "/roles", roles: ["ADMIN", "HR"] },
      { icon: Shield, label: "User Management", href: "/users", roles: ["ADMIN"] },
      { icon: Settings, label: "System Settings", href: "/settings", roles: ["ADMIN"] },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { data: session } = useSession() || {};
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const userRole = (session?.user as any)?.role || "EMPLOYEE";

  // Auto-open sections based on current path
  useEffect(() => {
    const newOpen: Record<string, boolean> = {};
    for (const entry of menuStructure) {
      if (isSection(entry)) {
        const hasActive = entry.items.some(
          (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
        );
        if (hasActive) {
          newOpen[entry.label] = true;
        }
      }
    }
    setOpenSections((prev) => ({ ...prev, ...newOpen }));
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMenuItem = (item: MenuItem, indent = false) => {
    if (!item.roles.includes(userRole)) return null;
    const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onMobileClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            indent && "pl-10",
            isActive
              ? "bg-blue-50 text-blue-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
          title={collapsed ? item.label : undefined}
        >
          <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-blue-600")} />
          {!collapsed && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

  const renderSection = (section: MenuSection) => {
    // Filter items by role
    const visibleItems = section.items.filter((item) => item.roles.includes(userRole));
    // Section visible if user role matches AND has visible items
    if (!section.roles.includes(userRole) || visibleItems.length === 0) return null;

    const isOpen = openSections[section.label] ?? false;
    const hasActive = visibleItems.some(
      (item) => pathname === item.href || pathname?.startsWith(`${item.href}/`)
    );

    if (collapsed) {
      // In collapsed mode, show first visible item's icon
      return visibleItems.map((item) => renderMenuItem(item, false));
    }

    return (
      <li key={section.label}>
        <button
          onClick={() => toggleSection(section.label)}
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            hasActive
              ? "text-blue-700"
              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
          )}
        >
          <div className="flex items-center gap-3">
            <section.icon className={cn("h-4 w-4 flex-shrink-0", hasActive && "text-blue-600")} />
            <span>{section.label}</span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <ul className="mt-1 space-y-0.5">
            {visibleItems.map((item) => renderMenuItem(item, true))}
          </ul>
        )}
      </li>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">HRIS</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (onMobileClose) {
              onMobileClose();
            } else {
              setCollapsed(!collapsed);
            }
          }}
          className="h-8 w-8 lg:flex"
        >
          {onMobileClose ? (
            <X className="h-4 w-4" />
          ) : collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuStructure.map((entry) => {
            if (isSection(entry)) {
              return renderSection(entry);
            }
            return renderMenuItem(entry);
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-200 p-3 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 p-2 h-auto",
                collapsed && "justify-center px-0"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col items-start text-left overflow-hidden">
                  <span className="text-sm font-medium text-gray-900 truncate w-full">
                    {session?.user?.name || "User"}
                  </span>
                  <span className="text-xs text-gray-500 truncate w-full">
                    {userRole}
                  </span>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/notifications" className="flex items-center cursor-pointer">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <div
        className={cn(
          "hidden lg:flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onMobileClose}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col lg:hidden shadow-xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
