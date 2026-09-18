import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, it } from '@jest/globals';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/auth.guard';
import { DATABASE } from '../src/database/database.module';

describe('GET /me', () => {
  let app: INestApplication;
  let authenticatedApp: INestApplication;

  const authUser = {
    id: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
    keycloakSub: 'keycloak-user-id',
    email: 'demo@example.com',
    name: 'Demo User',
  };

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

    const authenticatedModuleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE)
      .useValue({})
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          context.switchToHttp().getRequest<{ user: typeof authUser }>().user =
            authUser;
          return true;
        },
      })
      .compile();

    authenticatedApp = authenticatedModuleRef.createNestApplication();
    await authenticatedApp.init();
  });

  afterAll(async () => {
    await Promise.all([app.close(), authenticatedApp.close()]);
  });

  it('rejects unauthenticated requests', async () => {
    await request(app.getHttpServer()).get('/me').expect(401).expect({
      code: 'UNAUTHORIZED',
      message: 'Authentication is required',
    });
  });

  it('returns the authenticated user', async () => {
    await request(authenticatedApp.getHttpServer())
      .get('/me')
      .expect(200)
      .expect(authUser);
  });
});
