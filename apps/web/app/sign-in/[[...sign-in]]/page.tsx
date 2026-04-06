import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AuthMarketingPanel } from '@/components/auth/auth-marketing-panel';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { ClerkSignInPanel } from '@/components/auth/clerk-sign-in-panel';

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) {
    redirect('/');
  }

  return (
    <AuthSplitLayout
      mobileBrand={
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Focus<span className="text-primary">.</span>
        </h1>
      }
      leftPanel={
        <AuthMarketingPanel
          heading="Reclaim your time through discipline."
          body="A high-performance environment engineered for deep work. No distractions. No clutter. Just pure execution."
          footer={
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.24em] text-primary-foreground/70">
              <span className="h-px w-12 bg-primary-foreground/50" />
              <span>System status: optimal</span>
            </div>
          }
        />
      }
      rightPanel={<ClerkSignInPanel />}
    />
  );
}
