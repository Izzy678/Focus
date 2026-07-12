import type { TaskCategoryValue } from './task-categories';

export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'incomplete';

export type Task = {
  id: string;
  title: string;
  goals: string[];
  category: TaskCategoryValue;
  duration: number;
  actualTime: number;
  status: TaskStatus;
  scheduledDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  extendedMinutes: number;
  debriefPending: boolean;
  scheduleEndedAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Summary = {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  completedCount: number;
  incompleteCount: number;
  totalTasks: number;
  totalOverrunMinutes: number;
  breakdown: Array<{
    taskId: string;
    title: string;
    plannedMinutes: number;
    actualMinutes: number;
    varianceMinutes: number;
    status: TaskStatus;
    debriefPending: boolean;
  }>;
};

export type SummaryDay = {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  totalTasks: number;
  completedCount: number;
  efficiency: number;
};

type GetToken = () => Promise<string | null>;
type TaskStreamEvent = {
  type: 'tasks_updated' | 'ping';
  at: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

/**
 * Turns NestJS / JSON error bodies into a single user-facing string.
 * Falls back to plain text or a generic status message.
 */
export function parseApiErrorMessage(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return `Something went wrong (${status})`;
  }
  if (trimmed.startsWith('<')) {
    return `Something went wrong (${status})`;
  }
  try {
    const data = JSON.parse(trimmed) as unknown;
    if (data && typeof data === 'object' && data !== null && 'message' in data) {
      const msg = (data as { message: unknown }).message;
      if (typeof msg === 'string' && msg.trim()) {
        return msg.trim();
      }
      if (Array.isArray(msg)) {
        const parts = msg
          .filter((m): m is string => typeof m === 'string')
          .map((m) => m.trim())
          .filter(Boolean);
        if (parts.length) {
          return parts.join('. ');
        }
      }
    }
  } catch {
    // Not JSON — use raw body if short enough, else generic.
  }
  if (trimmed.length > 280) {
    return `Something went wrong (${status})`;
  }
  return trimmed;
}

/** Use in catch blocks for consistent toast copy (API + client errors). */
export function getRequestErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message.trim();
  }
  return fallback;
}

async function request<T>(
  path: string,
  getToken: GetToken,
  init?: RequestInit,
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new Error('Missing Clerk session token');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(parseApiErrorMessage(text, response.status));
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return undefined as T;
  }
  return JSON.parse(trimmed) as T;
}

export function listTodayTasks(getToken: GetToken) {
  return request<Task[]>('/tasks/today', getToken);
}

export function createTask(
  getToken: GetToken,
  body: {
    title: string;
    goals: string[];
    scheduledStart: string;
    scheduledEnd: string;
    category?: TaskCategoryValue;
  },
) {
  return request<Task>('/tasks', getToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTask(
  getToken: GetToken,
  taskId: string,
  body: Partial<Pick<Task, 'title' | 'goals' | 'scheduledStart' | 'scheduledEnd' | 'category'>>,
) {
  return request<Task>(`/tasks/${taskId}`, getToken, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteTask(getToken: GetToken, taskId: string) {
  return request<void>(`/tasks/${taskId}`, getToken, {
    method: 'DELETE',
  });
}

export function startTask(getToken: GetToken, taskId: string) {
  return request<Task>(`/tasks/${taskId}/start`, getToken, {
    method: 'POST',
  });
}

export function completeTask(getToken: GetToken, taskId: string) {
  return request<Task>(`/tasks/${taskId}/complete`, getToken, {
    method: 'POST',
  });
}

export function markIncomplete(getToken: GetToken, taskId: string) {
  return request<Task>(`/tasks/${taskId}/incomplete`, getToken, {
    method: 'POST',
  });
}

export function submitTaskDebrief(
  getToken: GetToken,
  taskId: string,
  body: { status: 'completed' | 'incomplete'; actualTimeMinutes?: number },
) {
  return request<Task>(`/tasks/${taskId}/debrief`, getToken, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchTodaySummary(getToken: GetToken) {
  return request<Summary>('/summary/today', getToken);
}

export function fetchSummaryForDate(getToken: GetToken, date: string) {
  return request<Summary>(
    `/summary/date?date=${encodeURIComponent(date)}`,
    getToken,
  );
}

export function fetchSummaryDays(getToken: GetToken, limit = 30) {
  return request<SummaryDay[]>(
    `/summary/days?limit=${encodeURIComponent(String(limit))}`,
    getToken,
  );
}

export async function openTasksStream(
  getToken: GetToken,
  onEvent: (event: TaskStreamEvent) => void,
  onError?: () => void,
) {
  const token = await getToken();
  if (!token) {
    throw new Error('Missing Clerk session token');
  }

  const url = `${API_BASE}/tasks/stream?token=${encodeURIComponent(token)}`;
  const source = new EventSource(url);
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as TaskStreamEvent;
      onEvent(payload);
    } catch {
      // Ignore malformed events to keep stream resilient.
    }
  };
  if (onError) {
    source.onerror = () => onError();
  }
  return source;
}

