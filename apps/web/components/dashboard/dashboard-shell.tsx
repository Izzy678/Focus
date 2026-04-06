'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';

import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/timeline', label: 'Timeline' },
  { href: '/plan', label: 'Plan' },
  { href: '/summary', label: 'Analytics' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border/70 bg-card p-6 md:flex">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Focus</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Disciplined Execution
          </p>
        </div>

        <nav className="mt-10 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-md px-4 py-3 text-sm font-semibold transition',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/plan"
          className="mt-auto inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-90"
        >
          New Task
        </Link>
      </aside>

      <main className="md:ml-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Daily Execution System
          </p>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/summary"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground"
            >
              End Day
            </Link>
            <UserButton />
          </div>
        </header>

        <div className="px-4 py-8 md:px-8">{children}</div>
      </main>
    </div>
  );
}

