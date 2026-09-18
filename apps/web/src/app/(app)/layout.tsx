import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { auth } from '@/auth';

export default async function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  if (!session?.accessToken) {
    redirect('/');
  }

  return children;
}
