import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './documents/documents.module';
import { FilesModule } from './files/files.module';
import { FoldersModule } from './folders/folders.module';
import { HealthController } from './health/health.controller';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    FoldersModule,
    DocumentsModule,
    FilesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
