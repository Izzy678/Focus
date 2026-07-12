'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  CalendarDays,
  ClipboardList,
  LineChart,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const SIDEBAR_COLLAPSED_KEY = 'focus-sidebar-collapsed';

const NAV_ITEMS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: '/timeline', label: 'Timeline', icon: CalendarDays },
  { href: '/plan', label: 'Plan', icon: ClipboardList },
  { href: '/summary', label: 'Analytics', icon: LineChart },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/timeline') {
    return pathname === '/timeline' || pathname.startsWith('/focus');
  }
  return pathname === href;
}

type SidebarNavProps = {
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
  showClose?: boolean;
};

function SidebarNav({
  pathname,
  collapsed = false,
  onNavigate,
  onToggleCollapse,
  showClose,
}: SidebarNavProps) {
  return (
    <>
      <div
        className={cn(
          'flex items-start gap-2',
          collapsed ? 'flex-col items-center' : 'justify-between',
        )}
      >
        <div className={cn(collapsed && 'text-center')}>
          {collapsed ? (
            <p className="text-xl font-extrabold tracking-tight text-primary" title="Focus">
              F
            </p>
          ) : (
            <>
              <h1 className="text-3xl font-extrabold tracking-tight text-primary">Focus</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Disciplined Execution
              </p>
            </>
          )}
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
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={2} />
            ) : (
              <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
            )}
          </button>
        ) : null}
      </div>

      <nav className="mt-10 min-h-0 flex-1 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center rounded-md text-sm font-semibold transition',
                collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
              {!collapsed ? <span>{item.label}</span> : (
                <span className="sr-only">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === 'true') {
        setCollapsed(true);
      }
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage access errors.
      }
      return next;
    });
  }, []);

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
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 hidden h-screen flex-col border-r border-border/70 bg-card transition-[width] duration-200 ease-out md:flex md:flex-col',
          collapsed ? 'w-[4.5rem] p-3' : 'w-64 p-6',
        )}
      >
        <SidebarNav
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
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

      <main
        className={cn(
          'min-w-0 transition-[margin] duration-200 ease-out',
          collapsed ? 'md:ml-[4.5rem]' : 'md:ml-64',
        )}
      >
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
