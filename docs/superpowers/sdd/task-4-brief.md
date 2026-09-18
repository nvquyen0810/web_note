### Task 4: Auth — Keycloak JWT + user sync + `GET /me`

**Files:**
- Create: `docker/keycloak/realm-webnote.json` (realm `webnote`, client `webnote-web` public + confidential API nếu cần, user demo)
- Create: `apps/api/src/auth/jwt.strategy.ts`, `auth.module.ts`, `auth.guard.ts`
- Create: `apps/api/src/users/users.service.ts`, `users.controller.ts` (`GET /me`)
- Create: `apps/web/src/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- Test: `apps/api/test/auth-me.e2e-spec.ts` (mock JWT hoặc test token)

**Interfaces:**
- Consumes: `users` table
- Produces:
  - `AuthUser = { id: string; keycloakSub: string; email: string; name: string }`
  - `@CurrentUser()` decorator
  - `UsersService.upsertFromClaims(claims): Promise<AuthUser>`
  - Web: session với `accessToken` để gọi API

- [ ] **Step 1: Failing e2e — `GET /me` without token → 401**

```typescript
it('rejects unauthenticated /me', async () => {
  const res = await request(app.getHttpServer()).get('/me');
  expect(res.status).toBe(401);
});
```

- [ ] **Step 2: Implement JWT validation (JWKS từ Keycloak)**

```typescript
// jwt.strategy.ts — passport-jwt
// secretOrKeyProvider: jwks-rsa từ `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`
// validate(payload) => usersService.upsertFromClaims({ sub, email, name, picture })
```

`GET /me` trả user đã sync.

- [ ] **Step 3: NextAuth Keycloak provider**

```typescript
// apps/web/src/auth.ts
import NextAuth from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.accessToken = account.access_token;
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
});
```

Trang `/` có nút Sign in; sau login gọi `GET ${API}/me` với Bearer.

- [ ] **Step 4: Verify thủ công + test 401/200**

```bash
docker compose up -d keycloak
# login UI → copy access token → curl -H "Authorization: Bearer …" localhost:3001/me
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: Keycloak OIDC auth, user sync, GET /me"
```

---

