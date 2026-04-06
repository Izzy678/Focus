import { ReactNode } from 'react';

type AuthMarketingPanelProps = {
  heading: string;
  body: string;
  footer: ReactNode;
};

export function AuthMarketingPanel({
  heading,
  body,
  footer,
}: AuthMarketingPanelProps) {
  return (
    <div className="relative z-10 grid h-full grid-rows-[auto_auto_1fr_auto] gap-10 md:gap-14">
      <h1 className="text-4xl font-extrabold tracking-tight text-primary-foreground">
        Focus<span className="text-primary-foreground/70">.</span>
      </h1>

      <div className="max-w-xl space-y-6">
        <h2 className="text-balance text-5xl font-extrabold leading-tight tracking-tighter text-primary-foreground">
          {heading}
        </h2>
        <p className="text-pretty text-lg font-medium leading-relaxed text-primary-foreground/80">
          {body}
        </p>
      </div>

      <div className="mt-auto">{footer}</div>
    </div>
  );
}
