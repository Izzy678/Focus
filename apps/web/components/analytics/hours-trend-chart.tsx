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
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">
            Planned vs actual
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hours across your last {Math.min(range, days.length)} active days. Click a bar
            to open that day.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
          {([7, 14, 30] as ChartRange[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onRangeChange(value)}
              className={cn(
                'rounded px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition',
                range === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {value}d
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/45" aria-hidden />
          Planned
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden />
          Actual
        </span>
      </div>

      <div className="mt-4 h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="18%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
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
              cursor={{ fill: 'hsl(var(--muted) / 0.55)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const row = payload[0]?.payload as ChartRow | undefined;
                if (!row) {
                  return null;
                }
                return (
                  <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
                    <p className="font-bold text-foreground">{formatAxisLabel(row.date)}</p>
                    <p className="mt-1 text-muted-foreground">
                      Planned:{' '}
                      <span className="font-semibold text-foreground">
                        {formatMinutesToClock(row.plannedMinutes)}
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      Actual:{' '}
                      <span className="font-semibold text-foreground">
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
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
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
                      ? 'hsl(var(--muted-foreground) / 0.55)'
                      : 'hsl(var(--muted-foreground) / 0.3)'
                  }
                />
              ))}
            </Bar>
            <Bar
              dataKey="actualHours"
              name="Actual"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
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
                      : 'hsl(var(--primary) / 0.65)'
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
