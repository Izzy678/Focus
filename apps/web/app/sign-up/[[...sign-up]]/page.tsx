import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AuthMarketingPanel } from '@/components/auth/auth-marketing-panel';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { ClerkSignUpPanel } from '@/components/auth/clerk-sign-up-panel';
import { FocusWordmark } from '@/components/brand/focus-wordmark';

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/timeline');
  }

  return (
    <AuthSplitLayout
      mobileBrand={<FocusWordmark href="/" />}
      leftPanel={
        <AuthMarketingPanel
          eyebrow="Focus, for tomorrow"
          heading="Tomorrow deserves a plan."
          body="Start free. Give every important thing a home in time — then keep the block in front of you."
          footer={
            <div className="auth-marketing-footer max-w-xs text-[14px] leading-6 tracking-[-0.01em]">
              No contracts. A quieter day starts with the next window.
            </div>
          }
        />
      }
      rightPanel={<ClerkSignUpPanel />}
    />
  );
}
