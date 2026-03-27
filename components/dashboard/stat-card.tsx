"use client";

import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { useInView } from "react-intersection-observer";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  bgColor?: string;
  iconColor?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  bgColor = "bg-blue-50",
  iconColor = "text-blue-600",
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (inView && !hasAnimated.current) {
      hasAnimated.current = true;
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [inView, value]);

  return (
    <Card ref={ref} className="card-hover">
      <CardContent className="p-3 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">
              {displayValue}
            </p>
            {trend && (
              <p
                className={cn(
                  "text-xs mt-1 font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% from last month
              </p>
            )}
          </div>
          <div className={cn("p-2 sm:p-3 rounded-xl flex-shrink-0", bgColor)}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}