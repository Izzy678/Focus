'use client';

import { SignUp } from '@clerk/nextjs';

export function ClerkSignUpPanel() {
  return (
    <SignUp
      path="/sign-up"
      routing="path"
      signInUrl="/sign-in"
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
