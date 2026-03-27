"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

export default function NotificationsPage() {
  const { data: session } = useSession() || {};
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = (session?.user as any)?.id;

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data?.notifications ?? []);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "POST",
      });
      fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const unreadCount = (notifications ?? []).filter((n) => !n?.isRead).length;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (notifications ?? []).length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(notifications ?? []).map((notification) => (
                <div
                  key={notification?.id ?? Math.random()}
                  className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                    notification?.isRead
                      ? "bg-gray-50"
                      : "bg-blue-50 border-l-4 border-blue-500"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {notification?.title ?? ""}
                    </p>
                    <p className="text-sm text-gray-600">
                      {notification?.message ?? ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(notification?.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {notification?.link && (
                      <Link href={notification.link}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    )}
                    {!notification?.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => markAsRead(notification?.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}