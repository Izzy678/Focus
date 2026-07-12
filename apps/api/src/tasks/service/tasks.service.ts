import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaskDto } from '../dto/create-task.dto';
import { DebriefTaskDto } from '../dto/debrief-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskEntity } from '../entity/task.entity';
import { TaskCategory } from '../enum/task-category.enum';
import { TaskStatus } from '../enum/task-status.enum';
import { TaskEventsService } from './task-events.service';

type SummaryRow = {
  taskId: string;
  title: string;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  status: TaskStatus;
  debriefPending: boolean;
};

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly tasksRepository: Repository<TaskEntity>,
    private readonly taskEventsService: TaskEventsService,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskEntity> {
    if (!dto.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    const goals = this.normalizeGoals(dto.goals);
    const { start, end, scheduledDate, duration } = this.resolveScheduleWindow(
      dto.scheduledStart,
      dto.scheduledEnd,
    );
    await this.assertNoOverlap(userId, start, end);

    const category = this.parseCategory(dto.category);

    const task = this.tasksRepository.create({
      userId,
      title: dto.title.trim(),
      goals,
      category,
      duration,
      actualTime: 0,
      status: TaskStatus.NOT_STARTED,
      scheduledDate,
      scheduledStart: start,
      scheduledEnd: end,
      extendedMinutes: 0,
      debriefPending: false,
      scheduleEndedAt: null,
    });

    const created = await this.tasksRepository.save(task);
    this.taskEventsService.emit(userId);
    return created;
  }

  async findToday(userId: string): Promise<TaskEntity[]> {
    return this.findByDate(userId, this.todayKey());
  }

  async findByDate(userId: string, date: string): Promise<TaskEntity[]> {
    const scheduledDate = this.assertDateKey(date);

    // Only heal live windows when reading today — past days are historical.
    if (scheduledDate === this.todayKey()) {
      await this.runSchedulingTick();
    }

    // Compare as calendar text to avoid TypeORM/pg timezone shifts on `date` columns.
    const tasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId })
      .andWhere("to_char(task.scheduledDate, 'YYYY-MM-DD') = :scheduledDate", {
        scheduledDate,
      })
      .orderBy('task.scheduledStart', 'ASC')
      .getMany();

    return tasks.map((task) => this.hydrateTask(task));
  }

  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskEntity> {
    const task = await this.findOwnedTask(userId, taskId);

    if (task.status !== TaskStatus.NOT_STARTED) {
      throw new BadRequestException('Only upcoming tasks can be edited');
    }

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException('title cannot be empty');
      }
      task.title = title;
    }
    if (dto.goals !== undefined) {
      task.goals = this.normalizeGoals(dto.goals);
    }
    if (dto.category !== undefined) {
      task.category = this.parseCategory(dto.category);
    }
    if (dto.scheduledStart !== undefined || dto.scheduledEnd !== undefined) {
      const { start, end, scheduledDate, duration } = this.resolveScheduleWindow(
        dto.scheduledStart ?? task.scheduledStart.toISOString(),
        dto.scheduledEnd ?? task.scheduledEnd.toISOString(),
      );
      await this.assertNoOverlap(userId, start, end, task.id);
      task.scheduledStart = start;
      task.scheduledEnd = end;
      task.scheduledDate = scheduledDate;
      task.duration = duration;
    }

    const updated = await this.tasksRepository.save(task);
    this.taskEventsService.emit(userId);
    return updated;
  }

  async remove(userId: string, taskId: string): Promise<void> {
    const task = await this.findOwnedTask(userId, taskId);
    if (task.status !== TaskStatus.NOT_STARTED) {
      throw new BadRequestException('Only upcoming tasks can be deleted');
    }
    await this.tasksRepository.remove(task);
    this.taskEventsService.emit(userId);
  }

  async start(userId: string, taskId: string): Promise<TaskEntity> {
    const task = await this.findOwnedTask(userId, taskId);
    const now = new Date();

    if (now < task.scheduledStart) {
      throw new BadRequestException('Task cannot start before its scheduled window');
    }
    if (now >= task.scheduledEnd) {
      throw new BadRequestException('Task window has already ended');
    }

    const activeTask = await this.tasksRepository.findOne({
      where: {
        userId,
        status: TaskStatus.IN_PROGRESS,
      },
    });
    if (activeTask && activeTask.id !== task.id) {
      throw new BadRequestException('Another task is already in progress');
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      task.status = TaskStatus.IN_PROGRESS;
      task.startedAt = now > task.scheduledStart ? now : task.scheduledStart;
      task.endedAt = null;
      task.debriefPending = false;
      task.scheduleEndedAt = null;
      const started = await this.tasksRepository.save(task);
      this.taskEventsService.emit(userId);
      return started;
    }

    return task;
  }

  async complete(userId: string, taskId: string): Promise<TaskEntity> {
    const task = await this.findOwnedTask(userId, taskId);
    this.finalizeActiveTime(task, new Date());
    task.status = TaskStatus.COMPLETED;
    task.endedAt = new Date();
    task.debriefPending = false;
    task.scheduleEndedAt = null;
    const completed = await this.tasksRepository.save(task);
    this.taskEventsService.emit(userId);
    return completed;
  }

  async markIncomplete(userId: string, taskId: string): Promise<TaskEntity> {
    const task = await this.findOwnedTask(userId, taskId);
    this.finalizeActiveTime(task, new Date());
    task.status = TaskStatus.INCOMPLETE;
    task.endedAt = new Date();
    task.debriefPending = false;
    task.scheduleEndedAt = null;
    const marked = await this.tasksRepository.save(task);
    this.taskEventsService.emit(userId);
    return marked;
  }

  async submitDebrief(
    userId: string,
    taskId: string,
    dto: DebriefTaskDto,
  ): Promise<TaskEntity> {
    const task = await this.findOwnedTask(userId, taskId);
    if (dto.status !== TaskStatus.COMPLETED && dto.status !== TaskStatus.INCOMPLETE) {
      throw new BadRequestException('status must be completed or incomplete');
    }

    if (dto.actualTimeMinutes !== undefined) {
      const actualTime = Number(dto.actualTimeMinutes);
      if (!Number.isFinite(actualTime) || actualTime < 0) {
        throw new BadRequestException('actualTimeMinutes must be zero or positive');
      }
      task.actualTime = Math.round(actualTime);
    }

    task.status = dto.status;
    task.debriefPending = false;
    if (!task.endedAt) {
      task.endedAt = new Date();
    }
    const debriefed = await this.tasksRepository.save(task);
    this.taskEventsService.emit(userId);
    return debriefed;
  }

  async runSchedulingTick(now: Date = new Date()) {
    const changedUsers = new Set<string>();
    const nowIso = now.toISOString();

    // 1. End overdue in-progress tasks first so the next window can start in this same tick.
    const endingTasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.IN_PROGRESS })
      .andWhere('task.scheduledEnd <= :now', { now: nowIso })
      .getMany();

    for (const task of endingTasks) {
      this.finalizeActiveTime(task, task.scheduledEnd);
      task.status = TaskStatus.INCOMPLETE;
      task.endedAt = task.scheduledEnd;
      task.debriefPending = true;
      task.scheduleEndedAt = task.scheduledEnd;
      await this.tasksRepository.save(task);
      changedUsers.add(task.userId);
    }

    // 2. Mark missed not-started tasks whose windows already ended.
    const missedTasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.NOT_STARTED })
      .andWhere('task.scheduledEnd <= :now', { now: nowIso })
      .getMany();

    for (const task of missedTasks) {
      task.status = TaskStatus.INCOMPLETE;
      task.startedAt = null;
      task.endedAt = task.scheduledEnd;
      task.debriefPending = true;
      task.scheduleEndedAt = task.scheduledEnd;
      await this.tasksRepository.save(task);
      changedUsers.add(task.userId);
    }

    // 3. Auto-start tasks that are currently inside their scheduled window.
    const startableTasks = await this.tasksRepository
      .createQueryBuilder('task')
      .where('task.status = :status', { status: TaskStatus.NOT_STARTED })
      .andWhere('task.scheduledStart <= :now', { now: nowIso })
      .andWhere('task.scheduledEnd > :now', { now: nowIso })
      .orderBy('task.scheduledStart', 'ASC')
      .getMany();

    for (const task of startableTasks) {
      const activeTask = await this.tasksRepository.findOne({
        where: {
          userId: task.userId,
          status: TaskStatus.IN_PROGRESS,
        },
      });
      if (activeTask) {
        continue;
      }
      task.status = TaskStatus.IN_PROGRESS;
      task.startedAt = now > task.scheduledStart ? now : task.scheduledStart;
      task.endedAt = null;
      task.debriefPending = false;
      task.scheduleEndedAt = null;
      await this.tasksRepository.save(task);
      changedUsers.add(task.userId);
    }

    for (const userId of changedUsers) {
      this.taskEventsService.emit(userId);
    }
  }

  async getTodaySummary(userId: string) {
    return this.getSummaryForDate(userId, this.todayKey());
  }

  async getSummaryForDate(userId: string, date: string) {
    const scheduledDate = this.assertDateKey(date);
    const tasks = await this.findByDate(userId, scheduledDate);
    const breakdown: SummaryRow[] = tasks.map((task) => {
      const variance = task.actualTime - task.duration;
      return {
        taskId: task.id,
        title: task.title,
        plannedMinutes: task.duration,
        actualMinutes: task.actualTime,
        varianceMinutes: variance,
        status: task.status,
        debriefPending: task.debriefPending,
      };
    });

    const plannedMinutes = tasks.reduce((sum, task) => sum + task.duration, 0);
    const actualMinutes = tasks.reduce((sum, task) => sum + task.actualTime, 0);
    const completedCount = tasks.filter(
      (task) => task.status === TaskStatus.COMPLETED,
    ).length;
    const incompleteCount = tasks.filter(
      (task) => task.status === TaskStatus.INCOMPLETE,
    ).length;
    const totalOverrunMinutes = breakdown.reduce(
      (sum, row) => sum + Math.max(0, row.varianceMinutes),
      0,
    );

    return {
      date: scheduledDate,
      plannedMinutes,
      actualMinutes,
      completedCount,
      incompleteCount,
      totalTasks: tasks.length,
      totalOverrunMinutes,
      breakdown,
    };
  }

  async listActiveSummaryDays(userId: string, limit = 30) {
    const safeLimit = Math.min(90, Math.max(1, Math.round(Number(limit) || 30)));

    const rows = await this.tasksRepository
      .createQueryBuilder('task')
      .select("to_char(task.scheduledDate, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(task.duration), 0)', 'plannedMinutes')
      .addSelect('COALESCE(SUM(task.actualTime), 0)', 'actualMinutes')
      .addSelect('COUNT(*)', 'totalTasks')
      .addSelect(
        `SUM(CASE WHEN task.status = :completed THEN 1 ELSE 0 END)`,
        'completedCount',
      )
      .where('task.userId = :userId', { userId })
      .setParameter('completed', TaskStatus.COMPLETED)
      .groupBy("to_char(task.scheduledDate, 'YYYY-MM-DD')")
      .orderBy("to_char(task.scheduledDate, 'YYYY-MM-DD')", 'DESC')
      .limit(safeLimit)
      .getRawMany<{
        date: string;
        plannedMinutes: string | number;
        actualMinutes: string | number;
        totalTasks: string | number;
        completedCount: string | number;
      }>();

    return rows.map((row) => {
      const plannedMinutes = Number(row.plannedMinutes) || 0;
      const actualMinutes = Number(row.actualMinutes) || 0;
      const totalTasks = Number(row.totalTasks) || 0;
      const completedCount = Number(row.completedCount) || 0;
      const efficiency =
        plannedMinutes === 0
          ? 0
          : Math.max(0, Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100)));

      return {
        date: this.toDateKey(row.date),
        plannedMinutes,
        actualMinutes,
        totalTasks,
        completedCount,
        efficiency,
      };
    });
  }

  private toDateKey(value: string | Date) {
    if (value instanceof Date) {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, '0');
      const day = String(value.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(value).trim().slice(0, 10);
  }

  private assertDateKey(date: string) {
    const value = date?.trim();
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw new BadRequestException('date must be a valid calendar day');
    }
    return value;
  }

  private async findOwnedTask(userId: string, taskId: string) {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, userId },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return this.hydrateTask(task);
  }

  private normalizeGoals(goals?: string[]) {
    if (!goals) {
      return [];
    }
    return goals.map((goal) => goal.trim()).filter(Boolean);
  }

  private resolveScheduleWindow(scheduledStart: string, scheduledEnd: string) {
    const start = new Date(scheduledStart);
    const end = new Date(scheduledEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('scheduledStart and scheduledEnd must be valid dates');
    }
    if (end <= start) {
      throw new BadRequestException('scheduledEnd must be after scheduledStart');
    }
    const duration = Math.round((end.getTime() - start.getTime()) / 60000);
    if (duration <= 0) {
      throw new BadRequestException('Task window must be at least one minute');
    }

    return {
      start,
      end,
      duration,
      scheduledDate: start.toISOString().slice(0, 10),
    };
  }

  private async assertNoOverlap(
    userId: string,
    start: Date,
    end: Date,
    excludeTaskId?: string,
  ) {
    const query = this.tasksRepository
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId })
      .andWhere('task.scheduledDate = :scheduledDate', {
        scheduledDate: start.toISOString().slice(0, 10),
      })
      .andWhere('NOT (task.scheduledEnd <= :start OR task.scheduledStart >= :end)', {
        start: start.toISOString(),
        end: end.toISOString(),
      });

    if (excludeTaskId) {
      query.andWhere('task.id != :excludeTaskId', { excludeTaskId });
    }

    const conflict = await query.getOne();
    if (conflict) {
      throw new BadRequestException('Selected time range overlaps an existing task');
    }
  }

  private finalizeActiveTime(task: TaskEntity, endedAt: Date) {
    if (!task.startedAt) {
      return;
    }
    const endMs = endedAt.getTime();
    const startedAt = new Date(task.startedAt).getTime();
    const elapsedMinutes = Math.max(0, Math.round((endMs - startedAt) / 60000));
    task.actualTime += elapsedMinutes;
    task.startedAt = null;
  }

  private todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  private hydrateTask(task: TaskEntity) {
    task.goals = Array.isArray(task.goals)
      ? task.goals.map((goal) => goal.trim()).filter(Boolean)
      : [];
    if (!task.category) {
      task.category = TaskCategory.DEEP_WORK;
    }
    return task;
  }

  private parseCategory(raw?: string): TaskCategory {
    const value = raw?.trim();
    if (!value) {
      return TaskCategory.DEEP_WORK;
    }
    const allowed = Object.values(TaskCategory) as string[];
    if (!allowed.includes(value)) {
      throw new BadRequestException(
        `Invalid category. Use one of: ${allowed.join(', ')}`,
      );
    }
    return value as TaskCategory;
  }
}

