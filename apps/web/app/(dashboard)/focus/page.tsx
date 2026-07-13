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
    return <p className="text-sm text-muted-foreground">Loading focus mode...</p>;
  }

  if (!task) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">No active task found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 sm:space-y-8">
      {task.status !== 'in_progress' ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Scheduled Session
          </p>
          <h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">{task.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This task starts at{' '}
            {new Date(task.scheduledStart).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            . The scheduler will move it to active automatically.
          </p>
        </section>
      ) : null}

      {task.status === 'in_progress' || showCompletion ? (
        <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-4 py-8 text-center sm:rounded-3xl sm:p-10">
          <div className="mx-auto mb-6 aspect-square w-full max-w-[min(17rem,85vw)] rounded-full border-4 border-primary/30 p-3 sm:mb-8 sm:max-w-[18rem] sm:p-8 md:max-w-[20rem]">
            <div className="flex h-full w-full items-center justify-center font-mono text-3xl font-black tracking-tight text-foreground tabular-nums sm:text-4xl md:text-5xl lg:text-6xl">
              {formatSecondsAsHMS(remainingSeconds)}
            </div>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">{task.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {task.goals.length ? task.goals.join(' • ') : 'No goals set'}
          </p>

          <div className="mx-auto mt-6 h-2 w-full max-w-xl overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${showCompletion ? 100 : progress}%` }}
            />
          </div>

          {task.status === 'in_progress' && !showCompletion ? (
            <p className="mx-auto mt-8 max-w-md text-xs leading-relaxed text-muted-foreground">
              This session follows your scheduled window. There is no pause or stop — stay in the
              zone until time runs out.
            </p>
          ) : null}
        </section>
      ) : null}

      {showCompletion ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Session Concluded
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Time&apos;s up.</h2>
          <p className="mt-1 text-muted-foreground">Did you complete this task?</p>

          <button
            onClick={onComplete}
            disabled={saving}
            className="mt-6 w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-60"
            type="button"
          >
            Yes, completed
          </button>
          <button
            onClick={onIncomplete}
            disabled={saving}
            className="mt-3 w-full rounded-md border border-destructive/40 px-4 py-3 text-sm font-bold uppercase tracking-wider text-destructive disabled:opacity-60"
            type="button"
          >
            Not completed
          </button>
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
