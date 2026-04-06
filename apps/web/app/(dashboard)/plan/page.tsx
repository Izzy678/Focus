'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

import {
  createTask,
  getRequestErrorMessage,
  listTodayTasks,
  Task,
  updateTask,
} from '@/lib/focus-api';
import {
  DEFAULT_TASK_CATEGORY,
  isTaskCategory,
  TASK_CATEGORY_OPTIONS,
  type TaskCategoryValue,
} from '@/lib/task-categories';
import { formatMinutesToClock } from '@/lib/timer';
import { cn } from '@/lib/utils';

type TaskDraft = {
  title: string;
  category: TaskCategoryValue;
  goals: string[];
  scheduledStart: string;
  scheduledEnd: string;
};

function toLocalInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function buildDefaultDraft(): TaskDraft {
  const now = new Date();
  const roundedStart = new Date(now);
  const minuteBucket = Math.ceil(now.getMinutes() / 15) * 15;
  roundedStart.setMinutes(minuteBucket, 0, 0);

  const roundedEnd = new Date(roundedStart);
  roundedEnd.setMinutes(roundedEnd.getMinutes() + 45);

  return {
    title: '',
    category: DEFAULT_TASK_CATEGORY,
    goals: [''],
    scheduledStart: toLocalInputValue(roundedStart),
    scheduledEnd: toLocalInputValue(roundedEnd),
  };
}

function taskToDraft(task: Task): TaskDraft {
  const category = isTaskCategory(task.category) ? task.category : DEFAULT_TASK_CATEGORY;
  return {
    title: task.title,
    category,
    goals: task.goals.length ? [...task.goals] : [''],
    scheduledStart: toLocalInputValue(new Date(task.scheduledStart)),
    scheduledEnd: toLocalInputValue(new Date(task.scheduledEnd)),
  };
}

function PlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEditId = searchParams.get('edit');
  const { getToken } = useAuth();
  const [totalPlannedMinutes, setTotalPlannedMinutes] = useState(0);
  const [draft, setDraft] = useState<TaskDraft>(buildDefaultDraft());
  const [saving, setSaving] = useState(false);
  const [loadingTotals, setLoadingTotals] = useState(true);
  const [resolvedEditId, setResolvedEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function refreshPlannedTotals() {
    setLoadingTotals(true);
    try {
      const tasks = await listTodayTasks(getToken);
      setTotalPlannedMinutes(tasks.reduce((sum, task) => sum + task.duration, 0));
    } catch (err) {
      toast.error(getRequestErrorMessage(err, 'Failed to load plan totals'));
    } finally {
      setLoadingTotals(false);
    }
  }

  useEffect(() => {
    void refreshPlannedTotals();
  }, []);

  useEffect(() => {
    if (!urlEditId) {
      setResolvedEditId(null);
      setEditLoading(false);
      return;
    }

    setEditLoading(true);
    setResolvedEditId(null);
    let cancelled = false;

    (async () => {
      try {
        const tasks = await listTodayTasks(getToken);
        if (cancelled) {
          return;
        }
        const task = tasks.find((t) => t.id === urlEditId);
        if (!task || task.status !== 'not_started') {
          toast.error(
            !task ? 'Task not found on today’s plan' : 'This task can no longer be edited',
          );
          router.replace('/plan');
          setDraft(buildDefaultDraft());
          setResolvedEditId(null);
          setEditLoading(false);
          return;
        }
        setDraft(taskToDraft(task));
        setResolvedEditId(urlEditId);
      } catch (err) {
        if (!cancelled) {
          toast.error(getRequestErrorMessage(err, 'Failed to load task'));
          router.replace('/plan');
          setDraft(buildDefaultDraft());
          setResolvedEditId(null);
        }
      } finally {
        if (!cancelled) {
          setEditLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlEditId, getToken, router]);

  const isEditing = Boolean(urlEditId && resolvedEditId === urlEditId);

  function exitEditMode() {
    router.replace('/plan');
    setResolvedEditId(null);
    setDraft(buildDefaultDraft());
  }

  async function onCreateTask(event: FormEvent) {
    event.preventDefault();
    if (urlEditId && !isEditing) {
      return;
    }
    const goals = draft.goals.map((goal) => goal.trim()).filter(Boolean);
    const scheduledStartDate = new Date(draft.scheduledStart);
    const scheduledEndDate = new Date(draft.scheduledEnd);
    if (
      Number.isNaN(scheduledStartDate.getTime()) ||
      Number.isNaN(scheduledEndDate.getTime()) ||
      scheduledEndDate <= scheduledStartDate
    ) {
      toast.error('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && urlEditId) {
        await updateTask(getToken, urlEditId, {
          title: draft.title,
          goals,
          category: draft.category,
          scheduledStart: scheduledStartDate.toISOString(),
          scheduledEnd: scheduledEndDate.toISOString(),
        });
        toast.success('Plan updated');
        exitEditMode();
      } else {
        await createTask(getToken, {
          title: draft.title,
          goals,
          category: draft.category,
          scheduledStart: scheduledStartDate.toISOString(),
          scheduledEnd: scheduledEndDate.toISOString(),
        });
        setDraft(buildDefaultDraft());
        toast.success('Plan added to timeline');
      }
      await refreshPlannedTotals();
    } catch (err) {
      toast.error(
        getRequestErrorMessage(err, isEditing ? 'Failed to update plan' : 'Failed to add plan'),
      );
    } finally {
      setSaving(false);
    }
  }

  const hoursDisplay = useMemo(
    () => formatMinutesToClock(totalPlannedMinutes).split(':')[0],
    [totalPlannedMinutes],
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 sm:gap-8 lg:grid-cols-[1fr_320px]">
      <section className="space-y-5 sm:space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
            Architecture Phase
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Daily Execution Plan
          </h1>
        </div>

        <form
          onSubmit={onCreateTask}
          className="rounded-2xl border border-border bg-card p-4 sm:p-6 md:p-8"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                Focus.
              </h2>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {isEditing
                  ? 'Editing upcoming task'
                  : 'System Ready / High Performance Mode'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (isEditing ? exitEditMode() : setDraft(buildDefaultDraft()))}
              className="text-2xl leading-none text-muted-foreground transition hover:text-foreground"
              aria-label={isEditing ? 'Close editor' : 'Reset form'}
            >
              &times;
            </button>
          </div>

          {editLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading task…</p>
          ) : null}

          <div className="mt-8 space-y-5">
            <label className="block text-xs font-black uppercase tracking-[0.2em] text-foreground">
              Task Title
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                required
                disabled={editLoading}
                placeholder="Specify technical objective..."
                className="mt-2 h-12 w-full rounded-md border border-border bg-background px-4 text-base font-semibold placeholder:text-muted-foreground/70 disabled:opacity-60"
              />
            </label>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                Category selection
              </p>
              <div
                className="mt-3 flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Task category"
              >
                {TASK_CATEGORY_OPTIONS.map((opt) => {
                  const selected = draft.category === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        setDraft((current) => ({ ...current, category: opt.value }))
                      }
                      disabled={editLoading}
                      className={cn(
                        'rounded-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition disabled:pointer-events-none disabled:opacity-50',
                        selected
                          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                          : 'bg-muted text-foreground hover:bg-muted/80',
                      )}
                    >
                      {opt.pillLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                Clear Goals
              </p>
              {draft.goals.map((goal, index) => (
                <div key={`goal-${index}`} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={goal}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        goals: current.goals.map((item, goalIndex) =>
                          goalIndex === index ? event.target.value : item,
                        ),
                      }))
                    }
                    placeholder={`Goal ${index + 1}`}
                    disabled={editLoading}
                    className="h-12 w-full rounded-md border border-border bg-background px-4 text-sm placeholder:text-muted-foreground/70 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={editLoading}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        goals:
                          current.goals.length === 1
                            ? ['']
                            : current.goals.filter((_, goalIndex) => goalIndex !== index),
                      }))
                    }
                    className="h-12 shrink-0 rounded-md border border-border px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground disabled:opacity-50 sm:w-auto"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={editLoading}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    goals: [...current.goals, ''],
                  }))
                }
                className="h-10 rounded-md border border-border px-3 text-xs font-bold uppercase tracking-wider text-primary disabled:opacity-50"
              >
                Add Goal
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-5 border-y border-border py-6 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                Scheduled Window
              </p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Pick exact start and end times. Tasks auto-start and auto-end from this
                timeline.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 rounded-xl bg-muted p-3 md:grid-cols-2">
              <label className="rounded-md bg-background p-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Start
                </p>
                <input
                  type="datetime-local"
                  required
                  disabled={editLoading}
                  min={isEditing ? undefined : toLocalInputValue(new Date())}
                  value={draft.scheduledStart}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, scheduledStart: event.target.value }))
                  }
                  className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm outline-none disabled:opacity-60"
                />
              </label>
              <label className="rounded-md bg-background p-3">
                <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  End
                </p>
                <input
                  type="datetime-local"
                  required
                  disabled={editLoading}
                  min={draft.scheduledStart || (!isEditing ? toLocalInputValue(new Date()) : undefined)}
                  value={draft.scheduledEnd}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, scheduledEnd: event.target.value }))
                  }
                  className="h-12 w-full rounded-md border border-border bg-background px-3 text-sm outline-none disabled:opacity-60"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
            This task will automatically sequence into your Daily Execution Plan based on
            the allocated time and current constraints.
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => (isEditing ? exitEditMode() : setDraft(buildDefaultDraft()))}
              className="h-11 rounded-md bg-muted text-sm font-bold text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || editLoading || (Boolean(urlEditId) && !isEditing)}
              className="h-11 rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 disabled:opacity-60"
            >
              {saving
                ? isEditing
                  ? 'Saving...'
                  : 'Adding...'
                : isEditing
                  ? 'Save changes'
                  : 'Add to Timeline'}
            </button>
          </div>
        </form>
      </section>

      <aside className="h-fit rounded-2xl border border-slate-700/80 bg-slate-900 p-4 text-slate-100 dark:border-border dark:bg-card dark:text-card-foreground sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200 dark:text-primary">
          Focus Engine
        </p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:mt-4 sm:text-3xl">
          Daily Load Factor
        </h2>
        <p className="mt-4 text-sm leading-6 text-slate-300 dark:text-muted-foreground">
          Keep the plan realistic and weighted toward deep work outcomes. View your sequence
          on Timeline.
        </p>
        <div className="mt-6 sm:mt-8">
          <p className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            {loadingTotals ? '—' : hoursDisplay}
            <span className="ml-1.5 text-xl font-semibold text-slate-400 dark:text-muted-foreground sm:ml-2 sm:text-2xl">
              HRS
            </span>
          </p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-muted-foreground">
            Planned hours today
          </p>
        </div>
      </aside>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">Loading plan…</div>
      }
    >
      <PlanPageContent />
    </Suspense>
  );
}
