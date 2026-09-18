import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { S3Service } from './s3.service';

@Module({
  imports: [AuditModule, PermissionsModule],
  controllers: [FilesController],
  providers: [S3Service, FilesService],
  exports: [FilesService],
})
export class FilesModule {}
