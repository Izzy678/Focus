import { Controller, Get, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard';
import { UserId } from '../common/auth/user-id.decorator';
import { TasksService } from '../tasks/service/tasks.service';

@UseGuards(ClerkAuthGuard)
@Controller('summary')
export class SummaryController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('today')
  getTodaySummary(@UserId() userId: string) {
    return this.tasksService.getTodaySummary(userId);
  }
}

