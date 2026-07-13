import Link from 'next/link';

import { cn } from '@/lib/utils';

type FocusWordmarkProps = {
  href?: string;
  className?: string;
  /** Light text on dark backgrounds (e.g. auth marketing panel). */
  inverted?: boolean;
};

export function FocusWordmark({
  href = '/',
  className,
  inverted = false,
}: FocusWordmarkProps) {
  const content = (
    <>
      <span
        className={cn(
          'grid h-6 w-6 place-items-center rounded-[7px] text-[11px] font-bold',
          inverted
            ? 'bg-white text-[#111]'
            : 'bg-[#111] text-white dark:bg-foreground dark:text-background',
        )}
      >
        F
      </span>
      <span
        className={cn(
          'text-[15px] font-semibold tracking-[-0.03em]',
          inverted ? 'text-white' : 'text-foreground',
        )}
      >
        Focus
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cn('inline-flex items-center gap-2.5', className)}>
        {content}
      </Link>
    );
  }

  return <span className={cn('inline-flex items-center gap-2.5', className)}>{content}</span>;
}
