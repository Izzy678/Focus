import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskCategory } from '../enum/task-category.enum';
import { TaskStatus } from '../enum/task-status.enum';

@Entity('tasks')
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  goals: string[];

  @Column({
    type: 'enum',
    enum: TaskCategory,
    default: TaskCategory.DEEP_WORK,
  })
  category: TaskCategory;

  @Column({ type: 'int' })
  duration: number;

  @Column({ type: 'int', default: 0 })
  actualTime: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.NOT_STARTED,
  })
  status: TaskStatus;

  @Column({ type: 'date' })
  scheduledDate: string;

  @Column({ type: 'timestamptz' })
  scheduledStart: Date;

  @Column({ type: 'timestamptz' })
  scheduledEnd: Date;

  @Column({ type: 'int', default: 0 })
  extendedMinutes: number;

  @Column({ type: 'boolean', default: false })
  debriefPending: boolean;

  @Column({ nullable: true, type: 'timestamptz' })
  scheduleEndedAt?: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  startedAt?: Date | null;

  @Column({ nullable: true, type: 'timestamptz' })
  endedAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

