import { redirect } from 'next/navigation';
import { auth, signOut } from '@/auth';

export async function requireAccessToken(): Promise<string> {
  const session = await auth();

  if (!session?.accessToken || session.error === 'RefreshAccessTokenError') {
    await signOut({ redirect: false });
    redirect('/');
  }

  return session.accessToken;
}

export async function redirectIfUnauthorized(error: unknown): Promise<never | void> {
  const { ApiError } = await import('@/lib/api');
  if (error instanceof ApiError && error.status === 401) {
    await signOut({ redirect: false });
    redirect('/');
  }
}
