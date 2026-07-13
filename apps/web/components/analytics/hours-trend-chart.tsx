'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SummaryDay } from '@/lib/focus-api';
import { formatMinutesToClock } from '@/lib/timer';
import { cn } from '@/lib/utils';

export type ChartRange = 7 | 14 | 30;

type HoursTrendChartProps = {
  days: SummaryDay[];
  selectedDate: string;
  range: ChartRange;
  onRangeChange: (range: ChartRange) => void;
  onSelectDate: (date: string) => void;
};

type ChartRow = {
  date: string;
  label: string;
  plannedHours: number;
  actualHours: number;
  plannedMinutes: number;
  actualMinutes: number;
};

function formatAxisLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function hoursTick(value: number) {
  if (value === 0) {
    return '0h';
  }
  if (Number.isInteger(value)) {
    return `${value}h`;
  }
  return `${value.toFixed(1)}h`;
}

export function HoursTrendChart({
  days,
  selectedDate,
  range,
  onRangeChange,
  onSelectDate,
}: HoursTrendChartProps) {
  const chartData = useMemo<ChartRow[]>(() => {
    return [...days]
      .slice(0, range)
      .reverse()
      .map((day) => ({
        date: day.date,
        label: formatAxisLabel(day.date),
        plannedHours: Number((day.plannedMinutes / 60).toFixed(2)),
        actualHours: Number((day.actualMinutes / 60).toFixed(2)),
        plannedMinutes: day.plannedMinutes,
        actualMinutes: day.actualMinutes,
      }));
  }, [days, range]);

  if (days.length === 0) {
    return null;
  }

  return (
    <section className="border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-5 sm:px-6 sm:py-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Trend
          </p>
          <h2 className="mt-1.5 text-[clamp(1.35rem,2.4vw,1.75rem)] font-medium tracking-[-0.035em]">
            Planned vs actual
          </h2>
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            Hours across your last {Math.min(range, days.length)} active days. Click a bar
            to open that day.
          </p>
        </div>
        <div className="flex items-center gap-px overflow-hidden border border-border">
          {([7, 14, 30] as ChartRange[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRangeChange(value)}
              className={cn(
                'px-3 py-2 text-[12px] font-medium tabular-nums transition-colors',
                range === value
                  ? 'bg-foreground text-background'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {value}d
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-5 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 bg-muted-foreground/40" aria-hidden />
            Planned
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 bg-primary" aria-hidden />
            Actual
          </span>
        </div>
      </div>

      <div className="h-64 w-full px-2 pb-4 sm:h-72 sm:px-3 sm:pb-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 12, right: 12, left: 0, bottom: 4 }}
            barGap={2}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="0"
              vertical={false}
              stroke="hsl(var(--border))"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={hoursTick}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.45)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const row = payload[0]?.payload as ChartRow | undefined;
                if (!row) {
                  return null;
                }
                return (
                  <div className="border border-border bg-card px-3.5 py-2.5 text-[12px] shadow-[0_12px_32px_rgba(12,12,12,0.08)]">
                    <p className="font-medium tracking-[-0.02em] text-foreground">
                      {formatAxisLabel(row.date)}
                    </p>
                    <p className="mt-1.5 text-muted-foreground">
                      Planned:{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {formatMinutesToClock(row.plannedMinutes)}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Actual:{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {formatMinutesToClock(row.actualMinutes)}
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="plannedHours"
              name="Planned"
              fill="hsl(var(--muted-foreground) / 0.35)"
              radius={[2, 2, 0, 0]}
              maxBarSize={26}
              cursor="pointer"
              onClick={(data) => {
                const point = data as { date?: string; payload?: { date?: string } };
                const date = point.payload?.date ?? point.date;
                if (date) {
                  onSelectDate(date);
                }
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`planned-${entry.date}`}
                  fill={
                    entry.date === selectedDate
                      ? 'hsl(var(--muted-foreground) / 0.5)'
                      : 'hsl(var(--muted-foreground) / 0.28)'
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="actualHours"
              name="Actual"
              fill="hsl(var(--primary))"
              radius={[2, 2, 0, 0]}
              maxBarSize={26}
              cursor="pointer"
              onClick={(data) => {
                const point = data as { date?: string; payload?: { date?: string } };
                const date = point.payload?.date ?? point.date;
                if (date) {
                  onSelectDate(date);
                }
              }}
            >
              {chartData.map((entry) => (
                <Cell
                  key={`actual-${entry.date}`}
                  fill={
                    entry.date === selectedDate
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--primary) / 0.62)'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
