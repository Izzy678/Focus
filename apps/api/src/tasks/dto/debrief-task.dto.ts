import { TaskStatus } from '../enum/task-status.enum';

export class DebriefTaskDto {
  status: TaskStatus.COMPLETED | TaskStatus.INCOMPLETE;
  actualTimeMinutes?: number;
}
