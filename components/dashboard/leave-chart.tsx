"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { getLeaveTypeLabel } from "@/lib/utils";

interface LeaveChartProps {
  data: {
    type: string;
    count: number;
  }[];
}

export function LeaveChart({ data }: LeaveChartProps) {
  const safeData = (data ?? []).map((item) => ({
    ...item,
    name: getLeaveTypeLabel(item?.type ?? ""),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Leave Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={safeData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
            >
              <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                width={75}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="count" fill="#60B5FF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}