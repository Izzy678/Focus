export class CreateTaskDto {
  title: string;
  goals?: string[];
  scheduledStart: string;
  scheduledEnd: string;
  category?: string;
}

