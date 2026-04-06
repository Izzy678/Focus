export type TaskCategoryValue =
  | 'deep_work'
  | 'meeting'
  | 'meal_break'
  | 'admin_email'
  | 'learning'
  | 'exercise'
  | 'other';

export const DEFAULT_TASK_CATEGORY: TaskCategoryValue = 'deep_work';

export const TASK_CATEGORY_OPTIONS: Array<{
  value: TaskCategoryValue;
  label: string;
  /** Shown on plan chips (rendered uppercase) */
  pillLabel: string;
}> = [
  { value: 'deep_work', label: 'Deep work', pillLabel: 'Deep work' },
  { value: 'meeting', label: 'Meeting / sync', pillLabel: 'Meetings' },
  { value: 'meal_break', label: 'Meal / break', pillLabel: 'Break' },
  { value: 'admin_email', label: 'Email / admin', pillLabel: 'Admin' },
  { value: 'learning', label: 'Learning / reading', pillLabel: 'Class' },
  { value: 'exercise', label: 'Exercise / movement', pillLabel: 'Move' },
  { value: 'other', label: 'Other', pillLabel: 'Other' },
];

export function isTaskCategory(value: string): value is TaskCategoryValue {
  return TASK_CATEGORY_OPTIONS.some((opt) => opt.value === value);
}
