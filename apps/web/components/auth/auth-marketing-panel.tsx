import { ReactNode } from 'react';

import { FocusWordmark } from '@/components/brand/focus-wordmark';

type AuthMarketingPanelProps = {
  eyebrow?: string;
  heading: string;
  body: string;
  footer: ReactNode;
};

export function AuthMarketingPanel({
  eyebrow = 'Time, kept',
  heading,
  body,
  footer,
}: AuthMarketingPanelProps) {
  return (
    <div className="relative z-10 flex h-full flex-col justify-between gap-14">
      <FocusWordmark inverted href="/" />

      <div className="max-w-[440px]">
        <p className="auth-marketing-eyebrow mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#60a5fa]" />
          {eyebrow}
        </p>
        <h2 className="text-balance text-[clamp(2.4rem,4.2vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.065em] text-white">
          {heading}
        </h2>
        <p className="mt-6 text-pretty text-[17px] leading-[1.55] tracking-[-0.015em] text-white/60">
          {body}
        </p>
      </div>

      <div>{footer}</div>
    </div>
  );
}
