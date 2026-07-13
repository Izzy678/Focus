'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, useReducedMotion } from 'framer-motion';
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
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600/90">
        <Check className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
      </div>
    );
  }
  if (status === 'in_progress') {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary">
        <Timer className="h-4 w-4 text-primary-foreground" strokeWidth={2} aria-hidden />
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card">
      <CategoryIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
    </div>
  );
}

function NowChip({ timeLabel }: { timeLabel: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-primary"
      initial={reduceMotion ? false : { opacity: 0.55 }}
      animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
      transition={
        reduceMotion
          ? undefined
          : { duration: 2.4, ease: 'easeInOut', repeat: Infinity }
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      Now · {timeLabel}
    </motion.span>
  );
}

function formatTodayHeader(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TimelinePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

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

  // Wait for Clerk before fetching — otherwise getToken() is null and
  // request() throws before any network call hits /tasks/today.
  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    void loadTasks(true);
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let stream: EventSource | null = null;
    let cancelled = false;

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
        if (cancelled) {
          stream.close();
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(getRequestErrorMessage(err, 'Live updates unavailable'));
        }
      }
    }

    void connectStream();

    return () => {
      cancelled = true;
      stream?.close();
    };
  }, [isLoaded, isSignedIn, getToken]);

  const currentTask = useMemo(
    () => tasks.find((task) => task.status === 'in_progress'),
    [tasks],
  );
  const nextTask = useMemo(() => {
    if (!now) {
      return undefined;
    }
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
    if (!liveTask || !now) {
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
    <div className="mx-auto max-w-6xl space-y-10 sm:space-y-12">
      <header className="space-y-2 border-b border-border pb-5 sm:pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {now ? formatTodayHeader(now) : 'Today'}
        </p>
        <h1 className="text-[clamp(1.75rem,3vw,2.35rem)] font-medium leading-[1.05] tracking-[-0.045em]">
          A day with a shape
        </h1>
        <p className="max-w-xl text-[15px] leading-6 tracking-[-0.01em] text-muted-foreground">
          Live execution and today’s path — only what’s scheduled for this calendar day.
        </p>
      </header>

      <section className="overflow-hidden border border-border bg-card">
        <div
          className={cn(
            'border-l-[3px] p-5 sm:p-7 md:p-8',
            liveTask && currentTask
              ? 'border-l-primary bg-primary/[0.04]'
              : 'border-l-border',
          )}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Live execution
          </p>
          {liveTask ? (
            <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_240px] lg:items-start">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {currentTask ? 'Now' : 'Up next'}
                </p>
                <h2 className="mt-2 text-[clamp(1.5rem,3.2vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.045em]">
                  {liveTask.title}
                </h2>
                <p className="mt-2 text-[15px] leading-6 tracking-[-0.01em] text-muted-foreground">
                  {liveTask.goals.length
                    ? liveTask.goals.join(' · ')
                    : 'No goals set for this task.'}
                </p>

                <div className="mt-7 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span>Session progress</span>
                    <span className="tabular-nums text-primary">
                      {liveExecutionMetrics.progressPercent}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden bg-primary/15">
                    <div
                      className="h-full bg-primary transition-[width] duration-500 ease-out"
                      style={{ width: `${liveExecutionMetrics.progressPercent}%` }}
                    />
                  </div>
                </div>

                {currentTask ? (
                  <Link
                    href={`/focus?taskId=${liveTask.id}`}
                    className="mt-7 inline-flex h-10 items-center rounded-md bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Resume focus
                  </Link>
                ) : (
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <p className="text-[13px] font-medium tabular-nums text-muted-foreground">
                      {new Date(liveTask.scheduledStart).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' – '}
                      {new Date(liveTask.scheduledEnd).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {liveTask.status === 'not_started' ? (
                      <Link
                        href={`/plan?edit=${liveTask.id}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        Edit
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="border border-border bg-background px-5 py-5 text-center sm:px-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {liveExecutionMetrics.timerLabel}
                </p>
                <p className="mt-3 font-mono text-[clamp(1.75rem,4vw,2.75rem)] font-medium tracking-[-0.04em] text-foreground tabular-nums">
                  {remainingHMS}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 border border-dashed border-border bg-background/60 p-6 text-[15px] text-muted-foreground">
              Nothing scheduled for the rest of today.{' '}
              <Link href="/plan" className="font-medium text-primary hover:underline">
                Add tasks in Plan
              </Link>
              .
            </div>
          )}
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading timeline…</p> : null}

      {debriefPendingTasks.length ? (
        <section className="border border-amber-500/25 bg-amber-500/[0.06] p-5 dark:bg-amber-500/[0.08]">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-amber-900/80 dark:text-amber-200/90">
            Pending debrief
          </p>
          <div className="mt-4 space-y-3">
            {debriefPendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-4"
              >
                <p className="text-[15px] font-medium tracking-[-0.02em] text-foreground">
                  {task.title}
                </p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    className="min-h-10 rounded-md border border-border px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-muted sm:py-1.5"
                    onClick={() => onDebrief(task.id, 'completed')}
                  >
                    Mark completed
                  </button>
                  <button
                    type="button"
                    className="min-h-10 rounded-md border border-border px-3.5 py-2 text-[13px] font-medium transition-colors hover:bg-muted sm:py-1.5"
                    onClick={() => onDebrief(task.id, 'incomplete')}
                  >
                    Mark incomplete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Execution path
            </p>
            <h2 className="mt-1.5 text-[clamp(1.5rem,2.8vw,2rem)] font-medium tracking-[-0.04em]">
              Today’s blocks
            </h2>
          </div>
          <p className="text-[12px] text-muted-foreground">Chronological</p>
        </div>

        <div className="relative overflow-hidden border border-border bg-card">
          {tasks.length > 0 ? (
            <div
              className="pointer-events-none absolute left-[22px] top-8 bottom-8 z-0 w-px bg-border sm:left-6"
              aria-hidden
            />
          ) : null}
          <ul className="relative z-[1] list-none divide-y divide-border p-0">
            {tasks.map((task) => {
              const start = new Date(task.scheduledStart);
              const end = new Date(task.scheduledEnd);
              const isCurrent = task.status === 'in_progress';
              const statusLabel =
                task.status === 'completed'
                  ? 'Completed'
                  : task.status === 'in_progress'
                    ? 'In progress'
                    : task.status === 'incomplete'
                      ? 'Incomplete'
                      : 'Upcoming';
              const shouldShowNow =
                !!now &&
                now.getTime() >= start.getTime() &&
                now.getTime() < end.getTime() &&
                !task.debriefPending;

              return (
                <li key={task.id} className="flex gap-3 sm:gap-4">
                  <div className="flex w-11 shrink-0 flex-col items-center pt-4 sm:w-12 sm:pt-5">
                    <ExecutionPathNode status={task.status} category={task.category} />
                  </div>
                  <article
                    className={cn(
                      'min-w-0 flex-1 px-1 py-4 pr-4 sm:py-5 sm:pr-6',
                      isCurrent && 'bg-primary/[0.045]',
                      task.status === 'completed' && 'opacity-75',
                    )}
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {shouldShowNow && now ? (
                        <NowChip
                          timeLabel={now.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        />
                      ) : (
                        <p
                          className={cn(
                            'text-[11px] font-medium uppercase tracking-[0.12em]',
                            isCurrent ? 'text-primary' : 'text-muted-foreground/80',
                          )}
                        >
                          {statusLabel}
                        </p>
                      )}
                    </div>
                    <h3
                      className={cn(
                        'text-[15px] font-medium tracking-[-0.02em] sm:text-base',
                        task.status === 'completed' && 'text-muted-foreground',
                      )}
                    >
                      {task.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                      {task.goals.length ? task.goals.join(' · ') : 'No goals set'}
                    </p>
                    {task.status === 'not_started' ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={`/plan?edit=${task.id}`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => onDeleteUpcoming(task.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/30 bg-background px-3 text-[13px] font-medium text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </article>
                </li>
              );
            })}
          </ul>

          {!loading && tasks.length === 0 ? (
            <div className="p-8 text-center text-[15px] text-muted-foreground">
              Your timeline for today is empty.{' '}
              <Link href="/plan" className="font-medium text-primary hover:underline">
                Add tasks in Plan
              </Link>
              .
            </div>
          ) : null}
        </div>
      </section>

      <section className="grid grid-cols-1 border border-border bg-card sm:grid-cols-3">
        <MetricCard
          label="Focus efficiency"
          value={`${tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0}`}
          suffix="%"
        />
        <MetricCard
          label="Deep work today"
          value={formatMinutesToClock(completedMinutes)}
        />
        <MetricCard
          label="Tasks done"
          value={`${completedTasks.length}`}
          suffix={` / ${tasks.length || 0}`}
        />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="border-b border-border px-5 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:px-6 sm:last:border-r-0">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <p className="mt-3 text-[clamp(1.75rem,3vw,2.35rem)] font-medium leading-none tracking-[-0.055em] tabular-nums">
        {value}
        {suffix ? (
          <span className="text-[0.48em] tracking-[-0.03em] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </p>
    </div>
  );
}
