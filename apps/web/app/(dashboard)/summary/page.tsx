'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';

import {
  ChartRange,
  HoursTrendChart,
} from '@/components/analytics/hours-trend-chart';
import {
  fetchSummaryDays,
  fetchSummaryForDate,
  getRequestErrorMessage,
  Summary,
  SummaryDay,
} from '@/lib/focus-api';
import { formatMinutesToClock } from '@/lib/timer';
import { cn } from '@/lib/utils';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDayLabel(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDayHeading(dateKey: string, isToday: boolean) {
  if (isToday) {
    return 'A day worth noticing';
  }
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function SummaryPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [days, setDays] = useState<SummaryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysLoading, setDaysLoading] = useState(true);
  const [chartRange, setChartRange] = useState<ChartRange>(14);

  const isToday = selectedDate === todayKey();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded && !isSignedIn) {
        setDaysLoading(false);
      }
      return;
    }

    async function loadDays() {
      setDaysLoading(true);
      try {
        const data = await fetchSummaryDays(getToken, 30);
        setDays(data);
      } catch (err) {
        toast.error(getRequestErrorMessage(err, 'Failed to load history'));
      } finally {
        setDaysLoading(false);
      }
    }

    void loadDays();
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded && !isSignedIn) {
        setLoading(false);
      }
      return;
    }

    async function loadSummary() {
      setLoading(true);
      try {
        const data = await fetchSummaryForDate(getToken, selectedDate);
        setSummary(data);
      } catch (err) {
        toast.error(getRequestErrorMessage(err, 'Failed to load summary'));
        setSummary(null);
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, [getToken, selectedDate, isLoaded, isSignedIn]);

  const efficiency = useMemo(() => {
    if (!summary || summary.plannedMinutes === 0) {
      return 0;
    }
    return Math.max(
      0,
      Math.min(100, Math.round((summary.actualMinutes / summary.plannedMinutes) * 100)),
    );
  }, [summary]);

  const selectedIndex = useMemo(
    () => days.findIndex((day) => day.date === selectedDate),
    [days, selectedDate],
  );

  const canGoNewer = selectedIndex > 0;
  const canGoOlder =
    selectedIndex >= 0 ? selectedIndex < days.length - 1 : days.length > 0;

  function goNewer() {
    if (!canGoNewer) {
      return;
    }
    setSelectedDate(days[selectedIndex - 1].date);
  }

  function goOlder() {
    if (selectedIndex >= 0 && selectedIndex < days.length - 1) {
      setSelectedDate(days[selectedIndex + 1].date);
      return;
    }
    if (selectedIndex < 0 && days.length > 0) {
      setSelectedDate(days[0].date);
    }
  }

  const recentTotals = useMemo(() => {
    const slice = days.slice(0, 7);
    return {
      days: slice.length,
      actualMinutes: slice.reduce((sum, day) => sum + day.actualMinutes, 0),
      plannedMinutes: slice.reduce((sum, day) => sum + day.plannedMinutes, 0),
      completedCount: slice.reduce((sum, day) => sum + day.completedCount, 0),
      totalTasks: slice.reduce((sum, day) => sum + day.totalTasks, 0),
    };
  }, [days]);

  return (
    <div className="mx-auto max-w-6xl space-y-10 sm:space-y-12">
      <header className="space-y-4 border-b border-border pb-5 sm:pb-6">
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Proof, not pressure
          </p>
          <h1 className="text-[clamp(1.75rem,3vw,2.35rem)] font-medium leading-[1.05] tracking-[-0.045em]">
            {formatDayHeading(selectedDate, isToday)}
          </h1>
          <p className="max-w-xl text-[15px] leading-6 tracking-[-0.01em] text-muted-foreground">
            Planned vs actual time and what you finished
            {isToday ? ' today' : ' that day'}. Browse history below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goOlder}
            disabled={!canGoOlder}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            aria-label="Older day"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Older
          </button>
          <button
            type="button"
            onClick={goNewer}
            disabled={!canGoNewer}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            aria-label="Newer day"
          >
            Newer
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
          {!isToday ? (
            <button
              type="button"
              onClick={() => setSelectedDate(todayKey())}
              className="inline-flex h-9 items-center rounded-md bg-secondary px-3.5 text-[13px] font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Jump to today
            </button>
          ) : null}
        </div>
      </header>

      {!daysLoading && days.length > 0 ? (
        <HoursTrendChart
          days={days}
          selectedDate={selectedDate}
          range={chartRange}
          onRangeChange={setChartRange}
          onSelectDate={setSelectedDate}
        />
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              History
            </p>
            <h2 className="mt-1.5 text-[clamp(1.35rem,2.4vw,1.75rem)] font-medium tracking-[-0.035em]">
              Active days
            </h2>
          </div>
          {recentTotals.days > 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Last {recentTotals.days} day{recentTotals.days === 1 ? '' : 's'}:{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatMinutesToClock(recentTotals.actualMinutes)}
              </span>{' '}
              · {recentTotals.completedCount}/{recentTotals.totalTasks} done
            </p>
          ) : null}
        </div>

        {daysLoading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : days.length === 0 ? (
          <div className="border border-dashed border-border p-6 text-[15px] text-muted-foreground">
            No past execution days yet. Plan and complete tasks to build your history.
          </div>
        ) : (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {days.map((day) => {
              const active = day.date === selectedDate;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={cn(
                    'min-w-[7.25rem] shrink-0 border px-3.5 py-3.5 text-left transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card hover:border-foreground/25',
                  )}
                >
                  <p
                    className={cn(
                      'text-[10px] font-medium uppercase tracking-[0.14em]',
                      active ? 'text-background/55' : 'text-muted-foreground',
                    )}
                  >
                    {day.date === todayKey() ? 'Today' : formatDayLabel(day.date)}
                  </p>
                  <p className="mt-1.5 text-[1.15rem] font-medium tabular-nums tracking-[-0.03em]">
                    {formatMinutesToClock(day.actualMinutes)}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-[11px]',
                      active ? 'text-background/50' : 'text-muted-foreground',
                    )}
                  >
                    {day.completedCount}/{day.totalTasks} · {day.efficiency}%
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading summary…</p> : null}

      {!loading && summary && summary.totalTasks === 0 ? (
        <div className="border border-dashed border-border p-6 text-[15px] text-muted-foreground">
          No tasks were scheduled on this day.
        </div>
      ) : null}

      {summary && summary.totalTasks > 0 ? (
        <>
          <section className="grid grid-cols-2 border border-border bg-card md:grid-cols-4">
            <SummaryMetric
              label="Planned"
              value={formatMinutesToClock(summary.plannedMinutes)}
            />
            <SummaryMetric
              label="Actual"
              value={formatMinutesToClock(summary.actualMinutes)}
            />
            <SummaryMetric
              label="Completed"
              value={`${summary.completedCount}`}
              suffix={` / ${summary.totalTasks}`}
            />
            <SummaryMetric label="Efficiency" value={`${efficiency}`} suffix="%" />
          </section>

          <section className="border border-border bg-card">
            <div className="border-b border-border px-5 py-5 sm:px-6 sm:py-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Breakdown
              </p>
              <h2 className="mt-1.5 text-[clamp(1.35rem,2.4vw,1.75rem)] font-medium tracking-[-0.035em]">
                Tasks that day
              </h2>
              <p className="mt-1.5 text-[13px] text-muted-foreground">
                Time beyond planned windows:{' '}
                <span className="font-medium tabular-nums text-foreground">
                  {formatMinutesToClock(summary.totalOverrunMinutes)}
                </span>
              </p>
            </div>

            <div className="divide-y divide-border md:hidden">
              {summary.breakdown.map((row) => (
                <article key={row.taskId} className="px-5 py-4">
                  <p className="text-[15px] font-medium tracking-[-0.02em] text-foreground">
                    {row.title}
                  </p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Planned</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {formatMinutesToClock(row.plannedMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Actual</dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {formatMinutesToClock(row.actualMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Status</dt>
                      <dd className="mt-0.5 capitalize">
                        {row.status.replace('_', ' ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">Debrief</dt>
                      <dd className="mt-0.5">
                        {row.debriefPending ? 'Pending' : 'Done'}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-border text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="px-6 py-3.5 font-medium">Task</th>
                    <th className="px-4 py-3.5 font-medium">Planned</th>
                    <th className="px-4 py-3.5 font-medium">Actual</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 font-medium">Debrief</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.breakdown.map((row) => (
                    <tr key={row.taskId} className="border-b border-border last:border-0">
                      <td className="px-6 py-4 text-[15px] font-medium tracking-[-0.02em]">
                        {row.title}
                      </td>
                      <td className="px-4 py-4 text-[13px] tabular-nums text-muted-foreground">
                        {formatMinutesToClock(row.plannedMinutes)}
                      </td>
                      <td className="px-4 py-4 text-[13px] tabular-nums text-muted-foreground">
                        {formatMinutesToClock(row.actualMinutes)}
                      </td>
                      <td className="px-4 py-4 text-[13px] capitalize text-muted-foreground">
                        {row.status.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-4 text-[13px] text-muted-foreground">
                        {row.debriefPending ? 'Pending' : 'Done'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="border-b border-border px-5 py-5 last:border-b-0 odd:border-r md:border-b-0 md:border-r md:px-6 md:last:border-r-0 md:odd:border-r">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className="mt-2.5 text-[clamp(1.5rem,2.8vw,2rem)] font-medium leading-none tracking-[-0.05em] tabular-nums">
        {value}
        {suffix ? (
          <span className="text-[0.5em] tracking-[-0.03em] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}
