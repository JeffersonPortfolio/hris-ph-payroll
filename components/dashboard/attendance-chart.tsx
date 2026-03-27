"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

interface AttendanceChartProps {
  data: {
    date: string;
    present: number;
    late: number;
    absent: number;
  }[];
}

export function AttendanceChart({ data }: AttendanceChartProps) {
  const safeData = data ?? [];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Attendance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={safeData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Legend
                verticalAlign="top"
                wrapperStyle={{ fontSize: "11px" }}
              />
              <Line
                type="monotone"
                dataKey="present"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="Present"
              />
              <Line
                type="monotone"
                dataKey="late"
                stroke="#eab308"
                strokeWidth={2}
                dot={false}
                name="Late"
              />
              <Line
                type="monotone"
                dataKey="absent"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Absent"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}