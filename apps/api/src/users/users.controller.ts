import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller()
export class UsersController {
  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
