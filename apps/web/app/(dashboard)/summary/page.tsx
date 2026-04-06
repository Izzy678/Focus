'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

import { fetchTodaySummary, getRequestErrorMessage, Summary } from '@/lib/focus-api';
import { formatMinutesToClock } from '@/lib/timer';

export default function SummaryPage() {
  const { getToken } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const data = await fetchTodaySummary(getToken);
        setSummary(data);
      } catch (err) {
        toast.error(getRequestErrorMessage(err, 'Failed to load summary'));
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, []);

  const efficiency = useMemo(() => {
    if (!summary || summary.plannedMinutes === 0) {
      return 0;
    }
    return Math.max(
      0,
      Math.min(100, Math.round((summary.actualMinutes / summary.plannedMinutes) * 100)),
    );
  }, [summary]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
          Daily Performance Debrief
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          Execution review for today
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Planned vs actual time and completion outcomes for today.
        </p>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading summary...</p> : null}

      {summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <SummaryMetric label="Planned" value={formatMinutesToClock(summary.plannedMinutes)} />
            <SummaryMetric label="Actual" value={formatMinutesToClock(summary.actualMinutes)} />
            <SummaryMetric
              label="Completed"
              value={`${summary.completedCount}/${summary.totalTasks}`}
            />
            <SummaryMetric label="Efficiency" value={`${efficiency}%`} />
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-xl font-extrabold tracking-tight">Task breakdown</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Total time beyond planned windows:{' '}
              {formatMinutesToClock(summary.totalOverrunMinutes)}
            </p>

            <div className="mt-6 overflow-x-auto">
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
    <article className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight">{value}</p>
    </article>
  );
}

