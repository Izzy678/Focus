'use client';

import { SignIn } from '@clerk/nextjs';

export function ClerkSignInPanel() {
  return (
    <SignIn
      path="/sign-in"
      routing="path"
      signUpUrl="/sign-up"
      forceRedirectUrl="/timeline"
      fallbackRedirectUrl="/timeline"
      appearance={{
        elements: {
          rootBox: 'w-full',
          card: 'border-0 bg-transparent shadow-none',
          headerTitle: 'text-2xl font-extrabold tracking-tight text-foreground',
          headerSubtitle: 'text-sm font-medium text-muted-foreground',
        },
      }}
    />
  );
}
