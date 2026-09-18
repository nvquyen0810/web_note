import { Global, Module } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export type Database = PostgresJsDatabase<typeof schema>;

@Global()
@Module({
  providers: [
    {
      provide: DATABASE,
      useFactory: (): Database => {
        const databaseUrl = process.env.DATABASE_URL;

        if (!databaseUrl) {
          throw new Error('DATABASE_URL is required');
        }

        return drizzle(postgres(databaseUrl), { schema });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
