import { ReactNode } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

type AuthSplitLayoutProps = {
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  mobileBrand?: ReactNode;
  className?: string;
};

export function AuthSplitLayout({
  leftPanel,
  rightPanel,
  mobileBrand,
  className,
}: AuthSplitLayoutProps) {
  return (
    <main className={cn('auth-layout min-h-screen md:flex', className)}>
      <section className="auth-left-panel hidden min-h-screen md:flex md:w-1/2 md:flex-col md:justify-between md:overflow-hidden md:p-12 lg:w-3/5 lg:p-16">
        {leftPanel}
      </section>

      <section className="auth-right-panel relative flex min-h-screen w-full flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12 md:px-12 lg:px-20">
        <div className="absolute right-4 top-6 z-10 sm:right-6 sm:top-8 md:right-12 lg:right-20">
          <ThemeToggle />
        </div>
        {mobileBrand ? (
          <div className="absolute left-4 top-6 md:hidden sm:left-6 sm:top-8">{mobileBrand}</div>
        ) : null}
        <div className="w-full max-w-md pt-10 md:pt-0">{rightPanel}</div>
      </section>
    </main>
  );
}
