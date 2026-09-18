import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { AuthGuard } from './auth.guard';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [PassportModule],
  controllers: [UsersController],
  providers: [AuthGuard, JwtStrategy, UsersService],
  exports: [AuthGuard],
})
export class AuthModule {}
