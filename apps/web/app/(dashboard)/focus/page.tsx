'use client';

import { useEffect, useMemo, useState } from 'react';
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

export default function FocusPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTaskId = searchParams.get('taskId');

  const [task, setTask] = useState<Task | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    async function loadTask() {
      setLoading(true);
      try {
        const tasks = await listTodayTasks(getToken);
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
        toast.error(getRequestErrorMessage(err, 'Failed to load focus session'));
      } finally {
        setLoading(false);
      }
    }

    void loadTask();
  }, [requestedTaskId]);

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
      } catch {
        // Stream is optional for focus.
      }
    }

    void connectStream();
    return () => {
      stream?.close();
    };
  }, [requestedTaskId]);

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
    if (!task) {
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
    <div className="mx-auto max-w-4xl space-y-8">
      {task.status !== 'in_progress' ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Scheduled Session
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{task.title}</h2>
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
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center">
          <div className="mx-auto mb-8 h-72 w-72 rounded-full border-4 border-primary/30 p-8">
            <div className="flex h-full items-center justify-center font-mono text-5xl font-black tracking-tight text-foreground tabular-nums md:text-6xl">
              {formatSecondsAsHMS(remainingSeconds)}
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">{task.title}</h1>
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
        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Session Concluded
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Time&apos;s up.</h2>
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

