import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './auth.types';

type AuthenticatedRequest = { user: AuthUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
