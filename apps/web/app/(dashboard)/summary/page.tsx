'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

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
    return 'Execution review for today';
  }
  const date = new Date(`${dateKey}T12:00:00`);
  return `Execution review for ${date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export default function SummaryPage() {
  const { getToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [days, setDays] = useState<SummaryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysLoading, setDaysLoading] = useState(true);
  const [chartRange, setChartRange] = useState<ChartRange>(14);

  const isToday = selectedDate === todayKey();

  useEffect(() => {
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
  }, [getToken]);

  useEffect(() => {
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
  }, [getToken, selectedDate]);

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
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
          Daily Performance Debrief
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl lg:text-5xl">
          {formatDayHeading(selectedDate, isToday)}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Planned vs actual time and completion outcomes
          {isToday ? ' for today' : ' for this day'}. Browse past execution days below.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={goOlder}
            disabled={!canGoOlder}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            aria-label="Older day"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Older
          </button>
          <button
            type="button"
            onClick={goNewer}
            disabled={!canGoNewer}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            aria-label="Newer day"
          >
            Newer
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
          {!isToday ? (
            <button
              type="button"
              onClick={() => setSelectedDate(todayKey())}
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-xs font-bold uppercase tracking-wider text-primary-foreground"
            >
              Jump to today
            </button>
          ) : null}
        </div>
      </section>

      {!daysLoading && days.length > 0 ? (
        <HoursTrendChart
          days={days}
          selectedDate={selectedDate}
          range={chartRange}
          onRangeChange={setChartRange}
          onSelectDate={setSelectedDate}
        />
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">History</h2>
          {recentTotals.days > 0 ? (
            <p className="text-xs text-muted-foreground sm:text-sm">
              Last {recentTotals.days} active day{recentTotals.days === 1 ? '' : 's'}:{' '}
              <span className="font-semibold text-foreground">
                {formatMinutesToClock(recentTotals.actualMinutes)}
              </span>{' '}
              logged · {recentTotals.completedCount}/{recentTotals.totalTasks} completed
            </p>
          ) : null}
        </div>

        {daysLoading ? (
          <p className="text-sm text-muted-foreground">Loading history...</p>
        ) : days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
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
                    'min-w-[7.5rem] shrink-0 rounded-xl border px-3 py-3 text-left transition',
                    active
                      ? 'border-primary/50 bg-primary/10 shadow-sm'
                      : 'border-border bg-card hover:bg-muted/60',
                  )}
                >
                  <p
                    className={cn(
                      'text-[10px] font-bold uppercase tracking-[0.16em]',
                      active ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {day.date === todayKey() ? 'Today' : formatDayLabel(day.date)}
                  </p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums tracking-tight">
                    {formatMinutesToClock(day.actualMinutes)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {day.completedCount}/{day.totalTasks} done · {day.efficiency}%
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading summary...</p> : null}

      {!loading && summary && summary.totalTasks === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          No tasks were scheduled on this day.
        </div>
      ) : null}

      {summary && summary.totalTasks > 0 ? (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <SummaryMetric label="Planned" value={formatMinutesToClock(summary.plannedMinutes)} />
            <SummaryMetric label="Actual" value={formatMinutesToClock(summary.actualMinutes)} />
            <SummaryMetric
              label="Completed"
              value={`${summary.completedCount}/${summary.totalTasks}`}
            />
            <SummaryMetric label="Efficiency" value={`${efficiency}%`} />
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">Task breakdown</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Total time beyond planned windows:{' '}
              {formatMinutesToClock(summary.totalOverrunMinutes)}
            </p>

            <div className="mt-6 space-y-3 md:hidden">
              {summary.breakdown.map((row) => (
                <article
                  key={row.taskId}
                  className="rounded-xl border border-border/80 bg-background/50 p-4 dark:bg-card/50"
                >
                  <p className="font-semibold leading-snug text-foreground">{row.title}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Planned
                      </dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {formatMinutesToClock(row.plannedMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Actual
                      </dt>
                      <dd className="mt-0.5 font-medium tabular-nums">
                        {formatMinutesToClock(row.actualMinutes)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Status
                      </dt>
                      <dd className="mt-0.5 uppercase">{row.status.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Debrief
                      </dt>
                      <dd className="mt-0.5 uppercase">
                        {row.debriefPending ? 'Pending' : 'Done'}
                      </dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <div className="mt-6 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[520px] text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    <th className="pb-3">Task</th>
                    <th className="pb-3">Planned</th>
                    <th className="pb-3">Actual</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Debrief</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.breakdown.map((row) => (
                    <tr key={row.taskId} className="border-b border-border/70 text-sm">
                      <td className="py-4 font-semibold">{row.title}</td>
                      <td className="py-4">{formatMinutesToClock(row.plannedMinutes)}</td>
                      <td className="py-4">{formatMinutesToClock(row.actualMinutes)}</td>
                      <td className="py-4 uppercase">{row.status.replace('_', ' ')}</td>
                      <td className="py-4 uppercase">
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-3 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-xs">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight tabular-nums sm:mt-2 sm:text-3xl">
        {value}
      </p>
    </article>
  );
}
