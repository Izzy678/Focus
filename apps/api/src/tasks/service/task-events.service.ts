import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';

export type TaskEventPayload = {
  type: 'tasks_updated';
  at: string;
};

@Injectable()
export class TaskEventsService {
  private readonly streams = new Map<string, Subject<TaskEventPayload>>();

  stream(userId: string): Observable<TaskEventPayload> {
    if (!this.streams.has(userId)) {
      this.streams.set(userId, new Subject<TaskEventPayload>());
    }
    return this.streams.get(userId)!.asObservable();
  }

  emit(userId: string) {
    if (!this.streams.has(userId)) {
      this.streams.set(userId, new Subject<TaskEventPayload>());
    }
    this.streams.get(userId)!.next({
      type: 'tasks_updated',
      at: new Date().toISOString(),
    });
  }
}
