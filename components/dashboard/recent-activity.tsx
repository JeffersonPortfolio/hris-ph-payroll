"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CalendarDays, UserPlus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Activity {
  id: string;
  type: "attendance" | "leave" | "employee";
  title: string;
  description: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const safeActivities = activities ?? [];

  const getIcon = (type: string) => {
    switch (type) {
      case "attendance":
        return <Clock className="h-4 w-4 text-green-600" />;
      case "leave":
        return <CalendarDays className="h-4 w-4 text-blue-600" />;
      case "employee":
        return <UserPlus className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case "attendance":
        return "success";
      case "leave":
        return "default";
      case "employee":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {safeActivities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent activity
            </p>
          ) : (
            safeActivities.map((activity) => (
              <div
                key={activity?.id ?? Math.random()}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  {getIcon(activity?.type ?? "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity?.title ?? "Activity"}
                    </p>
                    <Badge variant={getBadgeVariant(activity?.type ?? "") as any}>
                      {activity?.type ?? ""}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activity?.description ?? ""}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDateTime(activity?.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}