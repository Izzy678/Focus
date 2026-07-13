'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'react-toastify';

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

const fieldClassName =
  'mt-2 h-11 w-full border border-border bg-background px-3.5 text-[15px] font-medium tracking-[-0.01em] text-foreground outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/70 focus:border-primary/40 disabled:opacity-60';

function PlanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEditId = searchParams.get('edit');
  const { getToken, isLoaded, isSignedIn } = useAuth();
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
    if (!isLoaded || !isSignedIn) {
      if (isLoaded && !isSignedIn) {
        setLoadingTotals(false);
      }
      return;
    }
    void refreshPlannedTotals();
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!urlEditId) {
      setResolvedEditId(null);
      setEditLoading(false);
      return;
    }

    if (!isLoaded || !isSignedIn) {
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
  }, [urlEditId, getToken, router, isLoaded, isSignedIn]);

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
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_280px] lg:gap-10">
      <section className="min-w-0 space-y-6 sm:space-y-8">
        <header className="space-y-2 border-b border-border pb-5 sm:pb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {isEditing ? 'Edit block' : 'Plan'}
          </p>
          <h1 className="text-[clamp(1.75rem,3vw,2.35rem)] font-medium leading-[1.05] tracking-[-0.045em]">
            {isEditing ? 'Adjust the window' : 'Shape the day'}
          </h1>
          <p className="max-w-xl text-[15px] leading-6 tracking-[-0.01em] text-muted-foreground">
            Title, goals, then a fixed window. Tasks start and end from this schedule.
          </p>
        </header>

        <form onSubmit={onCreateTask} className="border border-border bg-card">
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-5 sm:px-7 sm:py-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {isEditing ? 'Upcoming task' : 'New block'}
              </p>
              <h2 className="mt-1 text-[clamp(1.25rem,2.2vw,1.6rem)] font-medium tracking-[-0.035em]">
                {isEditing ? 'Edit details' : 'Add to timeline'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => (isEditing ? exitEditMode() : setDraft(buildDefaultDraft()))}
              className="grid h-9 w-9 place-items-center text-xl leading-none text-muted-foreground transition-colors hover:text-foreground"
              aria-label={isEditing ? 'Close editor' : 'Reset form'}
            >
              &times;
            </button>
          </div>

          {editLoading ? (
            <p className="border-b border-border px-5 py-4 text-sm text-muted-foreground sm:px-7">
              Loading task…
            </p>
          ) : null}

          <div className="space-y-7 px-5 py-6 sm:px-7 sm:py-8">
            <label className="block">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Title
              </span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                required
                disabled={editLoading}
                placeholder="What deserves this window?"
                className={fieldClassName}
              />
            </label>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Goals
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Optional outcomes for the block — keep them concrete.
              </p>
              <div className="mt-3 space-y-2.5">
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
                      className={cn(fieldClassName, 'mt-0')}
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
                      className="h-11 shrink-0 border border-border px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 sm:w-auto"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={editLoading}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    goals: [...current.goals, ''],
                  }))
                }
                className="mt-3 text-[13px] font-medium text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
              >
                + Add goal
              </button>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Category
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
                        'border px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors disabled:pointer-events-none disabled:opacity-50',
                        selected
                          ? 'border-foreground bg-foreground text-background dark:border-foreground dark:bg-foreground dark:text-background'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                      )}
                    >
                      {opt.pillLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-border px-5 py-6 sm:px-7 sm:py-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Window
            </p>
            <p className="mt-1 max-w-md text-[13px] leading-5 text-muted-foreground">
              Exact start and end. Focus auto-starts and auto-ends from these times.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2">
              <label className="bg-card p-4">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Start
                </span>
                <input
                  type="datetime-local"
                  required
                  disabled={editLoading}
                  min={isEditing ? undefined : toLocalInputValue(new Date())}
                  value={draft.scheduledStart}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, scheduledStart: event.target.value }))
                  }
                  className="mt-2 h-11 w-full border-0 bg-transparent text-[15px] font-medium tabular-nums outline-none disabled:opacity-60"
                />
              </label>
              <label className="bg-card p-4">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  End
                </span>
                <input
                  type="datetime-local"
                  required
                  disabled={editLoading}
                  min={
                    draft.scheduledStart ||
                    (!isEditing ? toLocalInputValue(new Date()) : undefined)
                  }
                  value={draft.scheduledEnd}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, scheduledEnd: event.target.value }))
                  }
                  className="mt-2 h-11 w-full border-0 bg-transparent text-[15px] font-medium tabular-nums outline-none disabled:opacity-60"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border px-5 py-5 sm:flex-row sm:justify-end sm:gap-3 sm:px-7">
            <button
              type="button"
              onClick={() => (isEditing ? exitEditMode() : setDraft(buildDefaultDraft()))}
              className="inline-flex h-10 items-center justify-center rounded-md px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || editLoading || (Boolean(urlEditId) && !isEditing)}
              className="inline-flex h-10 items-center justify-center rounded-md bg-secondary px-5 text-[13px] font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
            >
              {saving
                ? isEditing
                  ? 'Saving…'
                  : 'Adding…'
                : isEditing
                  ? 'Save changes'
                  : 'Add to timeline'}
            </button>
          </div>
        </form>
      </section>

      <aside className="h-fit border border-border bg-[#111] p-6 text-white dark:border-border dark:bg-card dark:text-card-foreground sm:p-7">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/45 dark:text-muted-foreground">
          Today
        </p>
        <h2 className="mt-3 text-[clamp(1.5rem,2.5vw,1.85rem)] font-medium leading-[1.05] tracking-[-0.04em]">
          Planned load
        </h2>
        <p className="mt-3 text-[13px] leading-5 text-white/55 dark:text-muted-foreground">
          Keep the day honest. Deep work first, then review the sequence on Timeline.
        </p>
        <div className="mt-8">
          <p className="text-[clamp(2.75rem,5vw,3.5rem)] font-medium leading-none tracking-[-0.06em] tabular-nums">
            {loadingTotals ? '—' : hoursDisplay}
            <span className="ml-1.5 text-[0.42em] tracking-[-0.03em] text-white/45 dark:text-muted-foreground">
              hrs
            </span>
          </p>
          <p className="mt-3 text-[12px] text-white/40 dark:text-muted-foreground">
            Scheduled for today
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
