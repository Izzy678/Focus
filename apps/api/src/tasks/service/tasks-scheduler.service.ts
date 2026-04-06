import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from './tasks.service';

@Injectable()
export class TasksSchedulerService {
  private readonly logger = new Logger(TasksSchedulerService.name);
  private isRunning = false;

  constructor(private readonly tasksService: TasksService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runTaskWindowScheduler() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      await this.tasksService.runSchedulingTick();
    } catch (error) {
      this.logger.error('Task scheduler tick failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.isRunning = false;
    }
  }
}
