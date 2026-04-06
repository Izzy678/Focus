import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEventsService } from './service/task-events.service';
import { TaskEntity } from './entity/task.entity';
import { TasksController } from './controller/tasks.controller';
import { TasksSchedulerService } from './service/tasks-scheduler.service';
import { TasksSseController } from './controller/tasks-sse.controller';
import { TasksService } from './service/tasks.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
  controllers: [TasksController, TasksSseController],
  providers: [TasksService, TasksSchedulerService, TaskEventsService],
  exports: [TasksService],
})
export class TasksModule {}

