import {
  Controller,
  MessageEvent,
  Query,
  Sse,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { Observable, interval, map, merge } from 'rxjs';
import { TaskEventsService } from '../service/task-events.service';

@Controller('tasks')
export class TasksSseController {
  constructor(
    private readonly configService: ConfigService,
    private readonly taskEventsService: TaskEventsService,
  ) {}

  @Sse('stream')
  async stream(@Query('token') token?: string): Promise<Observable<MessageEvent>> {
    if (!token) {
      throw new UnauthorizedException('Missing stream token');
    }

    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      throw new UnauthorizedException('CLERK_SECRET_KEY is not configured');
    }

    let userId: string | undefined;
    try {
      const payload = await verifyToken(token, { secretKey });
      userId = payload?.sub;
    } catch {
      throw new UnauthorizedException('Invalid stream token');
    }

    if (!userId) {
      throw new UnauthorizedException('Token subject is missing');
    }

    const taskEvents$ = this.taskEventsService.stream(userId).pipe(
      map((payload) => ({ data: payload })),
    );
    const keepAlive$ = interval(25000).pipe(
      map(() => ({
        data: {
          type: 'ping',
          at: new Date().toISOString(),
        },
      })),
    );

    return merge(taskEvents$, keepAlive$);
  }
}
