'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Menu, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/timeline', label: 'Timeline' },
  { href: '/plan', label: 'Plan' },
  { href: '/summary', label: 'Analytics' },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/timeline') {
    return pathname === '/timeline' || pathname.startsWith('/focus');
  }
  return pathname === href;
}

type SidebarNavProps = {
  pathname: string;
  onNavigate?: () => void;
  showClose?: boolean;
};

function SidebarNav({ pathname, onNavigate, showClose }: SidebarNavProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-primary">Focus</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Disciplined Execution
          </p>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        ) : null}
      </div>

      <nav className="mt-10 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
        onClick={onNavigate}
        className="mt-auto inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:opacity-90"
      >
        New Task
      </Link>
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMobileNav();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border/70 bg-card p-6 md:flex md:flex-col">
        <SidebarNav pathname={pathname} />
      </aside>

      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 animate-in fade-in duration-200 bg-background/80 backdrop-blur-sm md:hidden"
            aria-label="Close menu"
            onClick={closeMobileNav}
          />
          <aside
            className="fixed left-0 top-0 z-50 flex h-screen w-[min(18rem,88vw)] flex-col border-r border-border/70 bg-card p-6 shadow-xl animate-in slide-in-from-left fade-in duration-200 md:hidden"
            id="mobile-dashboard-nav"
          >
            <SidebarNav
              pathname={pathname}
              onNavigate={closeMobileNav}
              showClose
            />
          </aside>
        </>
      ) : null}

      <main className="min-w-0 md:ml-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-background/95 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-4 sm:py-3 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted md:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-dashboard-nav"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" strokeWidth={2} />
              ) : (
                <Menu className="h-5 w-5" strokeWidth={2} />
              )}
            </button>
            <p className="min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.18em]">
              <span className="sm:hidden">Focus</span>
              <span className="hidden sm:inline">Daily Execution System</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/summary"
              className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-[10px] font-bold uppercase tracking-wider text-primary-foreground sm:px-4 sm:text-xs"
            >
              <span className="sm:hidden">End</span>
              <span className="hidden sm:inline">End Day</span>
            </Link>
            <UserButton />
          </div>
        </header>

        <div className="px-3 py-6 sm:px-4 sm:py-8 md:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
