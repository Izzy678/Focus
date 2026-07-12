import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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

  @Get('days')
  listActiveDays(
    @UserId() userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.tasksService.listActiveSummaryDays(
      userId,
      limit === undefined ? 30 : Number(limit),
    );
  }

  @Get('date')
  getSummaryForDate(
    @UserId() userId: string,
    @Query('date') date: string,
  ) {
    return this.tasksService.getSummaryForDate(userId, date);
  }
}
