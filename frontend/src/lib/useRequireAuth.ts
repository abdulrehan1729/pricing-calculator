'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from './auth';


export function useRequireAuth(): boolean {
  const router = useRouter();
  const isAuthenticated = typeof window !== 'undefined' && Boolean(getToken());

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  return isAuthenticated;
}
