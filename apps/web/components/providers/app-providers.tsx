'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { AppToaster } from '@/components/providers/app-toaster';
import { ThemeProvider } from '@/components/providers/theme-provider';

function ClerkWithTheme({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const baseTheme = mounted && resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <ClerkProvider appearance={{ baseTheme }}>
      {children}
      <AppToaster />
    </ClerkProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ClerkWithTheme>{children}</ClerkWithTheme>
    </ThemeProvider>
  );
}
