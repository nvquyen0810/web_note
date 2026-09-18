import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  completeFileSchema,
  presignFileSchema,
  type CompleteFileInput,
  type PresignFileInput,
} from '@web-note/shared';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FilesService } from './files.service';

@Controller('files')
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('presign')
  presign(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(presignFileSchema)) body: PresignFileInput,
  ) {
    return this.files.presign(user.id, body);
  }

  @Post('complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(completeFileSchema)) body: CompleteFileInput,
  ) {
    return this.files.complete(user.id, body);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.files.getDownloadUrl(user.id, id);
  }
}
