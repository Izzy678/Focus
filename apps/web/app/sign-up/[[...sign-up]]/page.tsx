import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { AuthMarketingPanel } from '@/components/auth/auth-marketing-panel';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { ClerkSignUpPanel } from '@/components/auth/clerk-sign-up-panel';

export default async function SignUpPage() {
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
          heading="Master your time, master your life."
          body="Join disciplined professionals using a calm task system built for consistent daily execution."
          footer={
            <div className="flex gap-8">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary-foreground">12k+</span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
                  Active users
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary-foreground">4.9/5</span>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/70">
                  User rating
                </span>
              </div>
            </div>
          }
        />
      }
      rightPanel={<ClerkSignUpPanel />}
    />
  );
}
