'use client';

import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';

export function AppToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      theme={mounted && resolvedTheme === 'dark' ? 'dark' : 'light'}
    />
  );
}
