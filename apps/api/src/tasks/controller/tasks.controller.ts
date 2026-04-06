import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../../common/auth/clerk-auth.guard';
import { UserId } from '../../common/auth/user-id.decorator';
import { CreateTaskDto } from '../dto/create-task.dto';
import { DebriefTaskDto } from '../dto/debrief-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TasksService } from '../service/tasks.service';

@UseGuards(ClerkAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  createTask(@UserId() userId: string, @Body() body: CreateTaskDto) {
    return this.tasksService.create(userId, body);
  }

  @Get('today')
  getTodayTasks(@UserId() userId: string) {
    return this.tasksService.findToday(userId);
  }

  @Patch(':id')
  updateTask(
    @UserId() userId: string,
    @Param('id') taskId: string,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasksService.update(userId, taskId, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTask(@UserId() userId: string, @Param('id') taskId: string) {
    return this.tasksService.remove(userId, taskId);
  }

  @Post(':id/start')
  startTask(@UserId() userId: string, @Param('id') taskId: string) {
    return this.tasksService.start(userId, taskId);
  }

  @Post(':id/complete')
  completeTask(@UserId() userId: string, @Param('id') taskId: string) {
    return this.tasksService.complete(userId, taskId);
  }

  @Post(':id/incomplete')
  markIncomplete(@UserId() userId: string, @Param('id') taskId: string) {
    return this.tasksService.markIncomplete(userId, taskId);
  }

  @Post(':id/debrief')
  submitDebrief(
    @UserId() userId: string,
    @Param('id') taskId: string,
    @Body() body: DebriefTaskDto,
  ) {
    return this.tasksService.submitDebrief(userId, taskId, body);
  }
}

