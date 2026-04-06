import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { Request } from 'express';

type RequestWithAuth = Request & {
  auth?: {
    userId: string;
  };
};

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    if (!secretKey) {
      throw new UnauthorizedException('CLERK_SECRET_KEY is not configured');
    }

    try {
      const payload = await verifyToken(token, { secretKey });
      if (!payload?.sub) {
        throw new UnauthorizedException('Token subject is missing');
      }

      request.auth = { userId: payload.sub };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid Clerk token');
    }
  }
}

