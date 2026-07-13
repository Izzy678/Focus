'use client';

import { SignUp } from '@clerk/nextjs';

export function ClerkSignUpPanel() {
  return (
    <div className="space-y-8">
      <div className="hidden md:block">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45 dark:text-muted-foreground">
          Focus, for tomorrow
        </p>
        <h1 className="mt-3 text-[clamp(2rem,3vw,2.6rem)] font-medium leading-[1.02] tracking-[-0.055em] text-[#101010] dark:text-foreground">
          Start planning.
        </h1>
        <p className="mt-3 text-[15px] leading-6 tracking-[-0.01em] text-black/55 dark:text-muted-foreground">
          A quieter day begins with a clear first block.
        </p>
      </div>
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        forceRedirectUrl="/timeline"
        fallbackRedirectUrl="/timeline"
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'border-0 bg-transparent shadow-none',
            headerTitle: 'hidden',
            headerSubtitle: 'hidden',
            socialButtonsBlockButton:
              'border border-black/10 bg-white text-[13px] font-medium tracking-[-0.01em] text-[#101010] shadow-none hover:bg-[#f8f8f7] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted',
            formFieldLabel:
              'text-[12px] font-medium text-black/55 dark:text-muted-foreground',
            formFieldInput:
              'h-11 rounded-md border border-black/10 bg-white text-[14px] tracking-[-0.01em] text-[#101010] shadow-none focus:border-[#2563EB] focus:ring-[#2563EB]/20 dark:border-border dark:bg-background dark:text-foreground',
            formButtonPrimary:
              'h-11 rounded-md bg-[#2563EB] text-[13px] font-medium text-white shadow-none hover:bg-[#1d4ed8]',
            footerActionLink: 'font-medium text-[#2563EB] hover:text-[#1d4ed8]',
            identityPreviewEditButton: 'text-[#2563EB]',
            formFieldInputShowPasswordButton: 'text-black/45 dark:text-muted-foreground',
          },
        }}
      />
    </div>
  );
}
