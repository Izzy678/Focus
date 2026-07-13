import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AuthMarketingPanel } from '@/components/auth/auth-marketing-panel';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { ClerkSignInPanel } from '@/components/auth/clerk-sign-in-panel';
import { FocusWordmark } from '@/components/brand/focus-wordmark';

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/timeline');
  }

  return (
    <AuthSplitLayout
      mobileBrand={<FocusWordmark href="/" />}
      leftPanel={
        <AuthMarketingPanel
          heading="Keep the promises you make to your calendar."
          body="Focus turns a plan into a day you can honor. Make time visible, work one block at a time, and learn what your days are really made of."
          footer={
            <div className="auth-marketing-footer flex items-center gap-4 text-[11px] font-medium uppercase tracking-[0.16em]">
              <span className="auth-marketing-footer-rule h-px w-10" />
              <span>A day with a shape</span>
            </div>
          }
        />
      }
      rightPanel={<ClerkSignInPanel />}
    />
  );
}
