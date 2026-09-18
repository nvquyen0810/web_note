import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/auth.guard';
import type { AuthUser } from '../src/auth/auth.types';
import { DATABASE } from '../src/database/database.module';

const mockUser: AuthUser = {
  id: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
  keycloakSub: 'keycloak-user-id',
  email: 'demo@example.com',
  name: 'Demo User',
};

describe('GET /me', () => {
  describe('unauthenticated', () => {
    let app: INestApplication;

    beforeAll(async () => {
      process.env.KEYCLOAK_URL = 'http://keycloak.test';
      process.env.KEYCLOAK_REALM = 'webnote';

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(DATABASE)
        .useValue({})
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('rejects unauthenticated requests', async () => {
      await request(app.getHttpServer()).get('/me').expect(401).expect({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      });
    });
  });

  describe('authenticated', () => {
    let app: INestApplication;

    beforeAll(async () => {
      process.env.KEYCLOAK_URL = 'http://keycloak.test';
      process.env.KEYCLOAK_REALM = 'webnote';

      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(DATABASE)
        .useValue({})
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate: (context: ExecutionContext) => {
            const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
            request.user = mockUser;
            return true;
          },
        })
        .compile();

      app = moduleRef.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns the authenticated user', async () => {
      await request(app.getHttpServer()).get('/me').expect(200).expect(mockUser);
    });
  });
});
