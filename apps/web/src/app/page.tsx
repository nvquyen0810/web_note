import { APP_NAME } from '@web-note/shared';
import { auth, signIn, signOut } from '../auth';

interface Me {
  id: string;
  keycloakSub: string;
  email: string;
  name: string;
}

async function getMe(accessToken: string): Promise<Me | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL is required');
  }

  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  return response.ok ? (response.json() as Promise<Me>) : null;
}

export default async function Home() {
  const session = await auth();
  const me = session?.accessToken ? await getMe(session.accessToken) : null;

  return (
    <main>
      <h1>{APP_NAME}</h1>
      {session ? (
        <>
          <p>{me ? `Signed in as ${me.name} (${me.email})` : 'Signed in'}</p>
          <form
            action={async () => {
              'use server';
              await signOut();
            }}
          >
            <button type="submit">Sign out</button>
          </form>
        </>
      ) : (
        <form
          action={async () => {
            'use server';
            await signIn('keycloak');
          }}
        >
          <button type="submit">Sign in with Keycloak</button>
        </form>
      )}
    </main>
  );
}
