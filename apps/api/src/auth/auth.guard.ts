import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';

@Injectable()
export class AuthGuard extends PassportAuthGuard('jwt') {
  handleRequest<TUser>(
    error: unknown,
    user: TUser | false | null | undefined,
  ): TUser {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error) {
      throw error;
    }

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      });
    }

    return user;
  }
}
