"use client";

import { useSession } from "next-auth/react";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession() || {};
  const [notificationCount, setNotificationCount] = useState(0);
  const userId = (session?.user as any)?.id;

  useEffect(() => {
    if (userId) {
      fetch("/api/notifications/unread-count")
        .then((res) => res.json())
        .then((data) => setNotificationCount(data?.count ?? 0))
        .catch(() => setNotificationCount(0));
    }
  }, [userId]);

  return (
    <header className="h-14 sm:h-16 border-b border-gray-200 bg-white flex items-center justify-between px-3 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Hamburger menu - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 flex-shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Mobile logo */}
        <div className="flex items-center gap-1.5 lg:hidden flex-shrink-0">
          <div className="h-7 w-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">H</span>
          </div>
          <span className="font-bold text-sm text-gray-900">HRIS</span>
        </div>

        {/* Search - hidden on small mobile */}
        <div className="relative hidden sm:block w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            className="pl-10 bg-gray-50 border-gray-200 h-9"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-5 w-5 text-gray-600" />
            {notificationCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notificationCount > 9 ? "9+" : notificationCount}
              </Badge>
            )}
          </Button>
        </Link>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
            {session?.user?.name || "User"}
          </p>
          <p className="text-xs text-gray-500">
            {(session?.user as any)?.role || "Employee"}
          </p>
        </div>
      </div>
    </header>
  );
}
