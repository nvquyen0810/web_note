import { APP_NAME } from '@web-note/shared';
import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const session = await auth();
  if (session?.accessToken && !session.error) {
    redirect('/workspaces');
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl" />
      </div>

      <div className="mx-auto max-w-lg text-center">
        <p className="font-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
          {APP_NAME}
        </p>
        <h1 className="mt-4 text-xl text-muted-foreground sm:text-2xl">
          Your team&apos;s internal wiki
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Draft, publish, and share knowledge across workspaces.
        </p>
        {session?.error ? (
          <p className="mt-4 text-sm text-destructive">
            Session expired. Please sign in again.
          </p>
        ) : null}
        <form
          className="mt-8"
          action={async () => {
            'use server';
            await signIn('keycloak', { redirectTo: '/workspaces' });
          }}
        >
          <Button type="submit" size="lg">
            Sign in with Keycloak
          </Button>
        </form>
      </div>
    </main>
  );
}
