'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

import {
  completeTask,
  getRequestErrorMessage,
  listTodayTasks,
  markIncomplete,
  openTasksStream,
  Task,
} from '@/lib/focus-api';
import { formatSecondsAsHMS } from '@/lib/timer';

function FocusPageContent() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTaskId = searchParams.get('taskId');

  const [task, setTask] = useState<Task | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded && !isSignedIn) {
        setLoading(false);
      }
      return;
    }

    let cancelled = false;

    async function loadTask() {
      setLoading(true);
      try {
        const tasks = await listTodayTasks(getToken);
        if (cancelled) {
          return;
        }
        const selected =
          tasks.find((item) => item.id === requestedTaskId) ??
          tasks.find((item) => item.status === 'in_progress') ??
          tasks.find((item) => item.status === 'not_started');

        if (!selected) {
          router.replace('/plan');
          return;
        }

        setTask(selected);
        const sessionRemaining = Math.max(
          0,
          Math.round((new Date(selected.scheduledEnd).getTime() - Date.now()) / 1000),
        );
        setRemainingSeconds(sessionRemaining);
      } catch (err) {
        if (!cancelled) {
          toast.error(getRequestErrorMessage(err, 'Failed to load focus session'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTask();
    return () => {
      cancelled = true;
    };
  }, [requestedTaskId, getToken, isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    let stream: EventSource | null = null;
    let cancelled = false;

    async function connectStream() {
      try {
        stream = await openTasksStream(getToken, (event) => {
          if (event.type !== 'tasks_updated') {
            return;
          }
          void listTodayTasks(getToken)
            .then((tasks) => {
              const selected =
                tasks.find((item) => item.id === requestedTaskId) ??
                tasks.find((item) => item.status === 'in_progress');
              if (!selected) {
                router.push('/timeline');
                return;
              }
              setTask(selected);
            })
            .catch(() => {
              // Keep current state if refresh fails.
            });
        });
        if (cancelled) {
          stream.close();
        }
      } catch {
        // Stream is optional for focus.
      }
    }

    void connectStream();
    return () => {
      cancelled = true;
      stream?.close();
    };
  }, [requestedTaskId, getToken, isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!task || showCompletion || task.status !== 'in_progress') {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          setShowCompletion(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [task, showCompletion]);

  const progress = useMemo(() => {
    if (!task || !now) {
      return 0;
    }
    const start = new Date(task.scheduledStart).getTime();
    const end = new Date(task.scheduledEnd).getTime();
    const totalSeconds = Math.max(1, Math.round((end - start) / 1000));
    if (totalSeconds <= 0) {
      return 0;
    }
    const elapsedSeconds = Math.max(
      0,
      Math.min(totalSeconds, Math.round((now.getTime() - start) / 1000)),
    );
    return Math.max(0, Math.min(100, (elapsedSeconds / totalSeconds) * 100));
  }, [task, now]);

  const windowLabel = useMemo(() => {
    if (!task) {
      return '';
    }
    const start = new Date(task.scheduledStart).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    const end = new Date(task.scheduledEnd).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${start} – ${end}`;
  }, [task]);

  async function onComplete() {
    if (!task) return;
    setSaving(true);
    try {
      await completeTask(getToken, task.id);
      toast.success('Task completed');
      router.push('/timeline');
    } catch (err) {
      toast.error(getRequestErrorMessage(err, 'Failed to complete task'));
    } finally {
      setSaving(false);
    }
  }

  async function onIncomplete() {
    if (!task) return;
    setSaving(true);
    try {
      await markIncomplete(getToken, task.id);
      toast.success('Task marked incomplete');
      router.push('/timeline');
    } catch (err) {
      toast.error(getRequestErrorMessage(err, 'Failed to mark incomplete'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading focus…</p>;
  }

  if (!task) {
    return (
      <div className="border border-border bg-card p-6">
        <p className="text-[15px] text-muted-foreground">No active task found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 sm:space-y-10">
      {task.status !== 'in_progress' ? (
        <section className="border border-border bg-card px-5 py-6 sm:px-7 sm:py-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Waiting
          </p>
          <h2 className="mt-3 text-[clamp(1.5rem,3vw,2rem)] font-medium leading-[1.05] tracking-[-0.04em]">
            {task.title}
          </h2>
          <p className="mt-3 text-[15px] leading-6 tracking-[-0.01em] text-muted-foreground">
            This block starts at{' '}
            <span className="font-medium tabular-nums text-foreground">
              {new Date(task.scheduledStart).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            . The scheduler will open it automatically.
          </p>
          <p className="mt-4 text-[13px] tabular-nums text-muted-foreground">{windowLabel}</p>
        </section>
      ) : null}

      {task.status === 'in_progress' || showCompletion ? (
        <section className="border border-border bg-card px-5 py-10 text-center sm:px-8 sm:py-14">
          <div className="mx-auto flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {!showCompletion ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                Now
              </>
            ) : (
              'Session ended'
            )}
          </div>

          <p className="mt-8 font-mono text-[clamp(2.75rem,10vw,4.5rem)] font-medium leading-none tracking-[-0.05em] text-foreground tabular-nums">
            {formatSecondsAsHMS(remainingSeconds)}
          </p>

          <h1 className="mx-auto mt-8 max-w-xl text-[clamp(1.5rem,3.2vw,2.25rem)] font-medium leading-[1.05] tracking-[-0.04em]">
            {task.title}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] leading-6 tracking-[-0.01em] text-muted-foreground">
            {task.goals.length ? task.goals.join(' · ') : 'No goals set'}
          </p>

          <div className="mx-auto mt-8 h-1 w-full max-w-md overflow-hidden bg-primary/15">
            <div
              className="h-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${showCompletion ? 100 : progress}%` }}
            />
          </div>

          <p className="mt-3 text-[12px] tabular-nums text-muted-foreground">{windowLabel}</p>

          {task.status === 'in_progress' && !showCompletion ? (
            <p className="mx-auto mt-8 max-w-md text-[13px] leading-5 text-muted-foreground">
              This session follows your scheduled window. No pause — stay with it until the
              block ends.
            </p>
          ) : null}
        </section>
      ) : null}

      {showCompletion ? (
        <section className="border border-border bg-card px-5 py-6 sm:px-7 sm:py-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Debrief
          </p>
          <h2 className="mt-3 text-[clamp(1.75rem,3vw,2.35rem)] font-medium leading-[1.05] tracking-[-0.045em]">
            Time&apos;s up.
          </h2>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Did you finish what this window asked for?
          </p>

          <div className="mt-7 flex flex-col gap-2.5">
            <button
              onClick={onComplete}
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center rounded-md bg-secondary text-[13px] font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
              type="button"
            >
              Yes, completed
            </button>
            <button
              onClick={onIncomplete}
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border text-[13px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:opacity-60"
              type="button"
            >
              Not completed
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading focus…</p>}
    >
      <FocusPageContent />
    </Suspense>
  );
}
