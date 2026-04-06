'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  Activity,
  BookOpen,
  Brain,
  Check,
  CircleDot,
  Mail,
  Pencil,
  Timer,
  Trash2,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  deleteTask,
  getRequestErrorMessage,
  listTodayTasks,
  openTasksStream,
  submitTaskDebrief,
  Task,
} from '@/lib/focus-api';
import {
  DEFAULT_TASK_CATEGORY,
  isTaskCategory,
  type TaskCategoryValue,
} from '@/lib/task-categories';
import { formatMinutesToClock, formatSecondsAsHMS } from '@/lib/timer';
import { cn } from '@/lib/utils';

const CATEGORY_ICONS: Record<TaskCategoryValue, LucideIcon> = {
  deep_work: Brain,
  meeting: Users,
  meal_break: UtensilsCrossed,
  admin_email: Mail,
  learning: BookOpen,
  exercise: Activity,
  other: CircleDot,
};

function ExecutionPathNode({
  status,
  category,
}: {
  status: Task['status'];
  category: string | undefined;
}) {
  const cat = category && isTaskCategory(category) ? category : DEFAULT_TASK_CATEGORY;
  const CategoryIcon = CATEGORY_ICONS[cat];

  if (status === 'completed') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-emerald-600 bg-emerald-600 shadow-sm">
        <Check className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden />
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-primary bg-primary shadow-sm">
        <Timer className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} aria-hidden />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-border bg-muted/80 shadow-sm">
      <CategoryIcon className="h-5 w-5 text-muted-foreground" strokeWidth={2} aria-hidden />
    </div>
  );
}

function formatTodayHeader(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TimelinePage() {
  const { getToken } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date>(() => new Date());

  async function loadTasks(showLoading = false) {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const data = await listTodayTasks(getToken);
      setTasks(data);
    } catch (err) {
      toast.error(getRequestErrorMessage(err, 'Failed to load timeline'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadTasks(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let stream: EventSource | null = null;

    async function connectStream() {
      try {
        stream = await openTasksStream(
          getToken,
          (event) => {
            if (event.type === 'tasks_updated') {
              void loadTasks(false);
            }
          },
          () => {
            void loadTasks(false);
          },
        );
      } catch (err) {
        toast.error(getRequestErrorMessage(err, 'Live updates unavailable'));
      }
    }

    void connectStream();

    return () => {
      stream?.close();
    };
  }, []);

  const currentTask = useMemo(
    () => tasks.find((task) => task.status === 'in_progress'),
    [tasks],
  );
  const nextTask = useMemo(() => {
    const currentTime = now.getTime();
    return tasks
      .filter((task) => {
        if (task.status === 'completed') {
          return false;
        }
        const start = new Date(task.scheduledStart).getTime();
        return start >= currentTime;
      })
      .sort(
        (a, b) =>
          new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime(),
      )[0];
  }, [now, tasks]);
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.status === 'completed'),
    [tasks],
  );

  const completedMinutes = useMemo(
    () => completedTasks.reduce((sum, task) => sum + task.actualTime, 0),
    [completedTasks],
  );
  const debriefPendingTasks = useMemo(
    () => tasks.filter((task) => task.debriefPending),
    [tasks],
  );

  const liveTask = currentTask ?? nextTask ?? null;

  const liveExecutionMetrics = useMemo(() => {
    if (!liveTask) {
      return {
        remainingSeconds: 0,
        progressPercent: 0,
        timerLabel: 'Time remaining' as const,
      };
    }
    const startMs = new Date(liveTask.scheduledStart).getTime();
    const endMs = new Date(liveTask.scheduledEnd).getTime();
    const t = now.getTime();

    if (currentTask) {
      const totalMs = Math.max(1, endMs - startMs);
      const elapsedMs = Math.min(Math.max(0, t - startMs), totalMs);
      const progressPercent = Math.round((elapsedMs / totalMs) * 100);
      const remainingSeconds = Math.max(0, Math.floor((endMs - t) / 1000));
      return {
        remainingSeconds,
        progressPercent,
        timerLabel: 'Time remaining' as const,
      };
    }

    const untilStartSeconds = Math.max(0, Math.floor((startMs - t) / 1000));
    return {
      remainingSeconds: untilStartSeconds,
      progressPercent: 0,
      timerLabel: 'Starts in' as const,
    };
  }, [liveTask, currentTask, now]);

  const remainingHMS = useMemo(
    () => formatSecondsAsHMS(liveExecutionMetrics.remainingSeconds),
    [liveExecutionMetrics.remainingSeconds],
  );

  async function onDebrief(taskId: string, status: 'completed' | 'incomplete') {
    try {
      await submitTaskDebrief(getToken, taskId, { status });
      toast.success('Debrief saved');
      await loadTasks(false);
    } catch (err) {
      toast.error(getRequestErrorMessage(err, 'Failed to submit debrief'));
    }
  }

  async function onDeleteUpcoming(taskId: string) {
    if (!window.confirm('Remove this task from your timeline?')) {
      return;
    }
    try {
      await deleteTask(getToken, taskId);
      toast.success('Task removed');
      await loadTasks(false);
    } catch (err) {
      toast.error(getRequestErrorMessage(err, 'Failed to delete task'));
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="space-y-2 border-b border-border/60 pb-6">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-foreground">
          {formatTodayHeader(now)}
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Your timeline, live execution, and execution path below are all for{' '}
          <span className="font-semibold text-foreground">today</span> only — synced with
          your scheduled tasks for this calendar day.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-sm">
        <div className="border-l-[6px] border-l-primary bg-primary/[0.04] p-6 md:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            Live Execution
          </p>
          {liveTask ? (
            <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {currentTask ? 'You should be doing' : 'Up next'}
                </p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
                  {liveTask.title}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {liveTask.goals.length
                    ? liveTask.goals.join(' • ')
                    : 'No goals set for this task.'}
                </p>

                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <span>Session progress</span>
                    <span className="text-primary">{liveExecutionMetrics.progressPercent}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                      style={{ width: `${liveExecutionMetrics.progressPercent}%` }}
                    />
                  </div>
                </div>

                {currentTask ? (
                  <Link
                    href={`/focus?taskId=${liveTask.id}`}
                    className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md shadow-primary/15"
                  >
                    Resume Focus
                  </Link>
                ) : (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      Window{' '}
                      {new Date(liveTask.scheduledStart).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      –{' '}
                      {new Date(liveTask.scheduledEnd).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {liveTask.status === 'not_started' ? (
                      <Link
                        href={`/plan?edit=${liveTask.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-wider text-foreground transition hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Edit
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/80 bg-background/80 px-6 py-5 text-center shadow-inner">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  {liveExecutionMetrics.timerLabel}
                </p>
                <p className="mt-3 font-mono text-4xl font-black tracking-tight text-foreground tabular-nums md:text-5xl">
                  {remainingHMS}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-background/50 p-6 text-sm text-muted-foreground">
              Nothing scheduled for the rest of today in your timeline. Add tasks in Plan.
            </div>
          )}
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading timeline...</p> : null}

      {debriefPendingTasks.length ? (
        <section className="rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 dark:border-amber-500/35 dark:bg-amber-950/40">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-900 dark:text-amber-200">
            Pending Debrief
          </p>
          <div className="mt-3 space-y-3">
            {debriefPendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-background/80 p-3 dark:bg-card/90"
              >
                <p className="text-sm font-semibold text-foreground">{task.title}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                    onClick={() => onDebrief(task.id, 'completed')}
                  >
                    Mark Completed
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-1 text-xs font-bold uppercase tracking-wider"
                    onClick={() => onDebrief(task.id, 'incomplete')}
                  >
                    Mark Incomplete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">Execution Path</h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Sort: chronological
          </p>
        </div>

        <div className="relative">
          {tasks.length > 0 ? (
            <div
              className="pointer-events-none absolute left-5 top-10 bottom-10 z-0 w-px bg-border"
              aria-hidden
            />
          ) : null}
          <ul className="relative z-[1] list-none space-y-3 p-0">
            {tasks.map((task) => {
              const start = new Date(task.scheduledStart);
              const end = new Date(task.scheduledEnd);
              const isCurrent = task.status === 'in_progress';
              const statusLabel =
                task.status === 'completed'
                  ? 'Completed'
                  : task.status === 'in_progress'
                    ? 'In Progress'
                    : task.status === 'incomplete'
                      ? 'Incomplete'
                      : 'Upcoming';
              const shouldShowNow =
                now.getTime() >= start.getTime() &&
                now.getTime() < end.getTime() &&
                !task.debriefPending;

              return (
                <li key={task.id} className="flex gap-4">
                  <div className="flex shrink-0 flex-col items-center pt-1">
                    <ExecutionPathNode status={task.status} category={task.category} />
                  </div>
                  <article
                    className={cn(
                      'min-w-0 flex-1 rounded-xl border bg-card p-4',
                      isCurrent &&
                        'border-primary/50 border-l-4 border-l-primary bg-primary/[0.06] shadow-sm',
                      task.status === 'completed' && 'border-border opacity-90',
                      !isCurrent &&
                        task.status !== 'completed' &&
                        'border-border',
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-bold uppercase tracking-[0.2em]',
                          isCurrent ? 'text-primary' : 'text-muted-foreground',
                        )}
                      >
                        {statusLabel}
                      </p>
                    </div>
                    <h3
                      className={cn(
                        'text-xl font-extrabold',
                        task.status === 'completed' && 'text-muted-foreground',
                      )}
                    >
                      {task.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {task.goals.length ? task.goals.join(' • ') : 'No goals set'}
                    </p>
                    {task.status === 'not_started' ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/plan?edit=${task.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[10px] font-bold uppercase tracking-wider text-foreground transition hover:bg-muted"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Edit in Plan
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDeleteUpcoming(task.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/40 bg-background px-3 text-[10px] font-bold uppercase tracking-wider text-destructive transition hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Delete
                        </button>
                      </div>
                    ) : null}
                    {shouldShowNow ? (
                      <div className="relative mt-4 flex justify-end">
                        <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                          Now •{' '}
                          {now.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>
        </div>

        {!loading && tasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Your timeline for today is empty. Add tasks in Plan.
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Focus Efficiency" value={`${tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%`} />
        <MetricCard label="Deep Work Today" value={formatMinutesToClock(completedMinutes)} />
        <MetricCard label="Major Tasks Done" value={`${completedTasks.length} / ${tasks.length || 0}`} />
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
}
