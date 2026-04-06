import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { SummaryController } from './summary.controller';

@Module({
  imports: [TasksModule],
  controllers: [SummaryController],
})
export class SummaryModule {}

