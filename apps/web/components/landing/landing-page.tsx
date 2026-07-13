"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Menu,
  Play,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const day = [
  { time: "08:00", end: "09:00", title: "Morning planning", state: "done" },
  { time: "09:00", end: "11:00", title: "Deep work", state: "now" },
  { time: "11:00", end: "11:30", title: "Break", state: "next" },
  { time: "11:30", end: "12:30", title: "Product meeting", state: "next" },
];

const audiences = [
  ["Student", "Turn a long reading list into a day you can actually see."],
  [
    "Developer",
    "Protect the quiet stretches where difficult work gets solved.",
  ],
  ["Founder", "Give the urgent a place without sacrificing the important."],
  [
    "Freelancer",
    "Move between clients with clear boundaries and no mental residue.",
  ],
  [
    "Designer",
    "Make room for exploration, critique, and the work between them.",
  ],
  [
    "Remote worker",
    "Create a finish line for a day that lives in the same room as home.",
  ],
];

function Wordmark() {
  return (
    <Link
      href="#top"
      className="inline-flex items-center gap-2.5 text-[15px] font-semibold tracking-[-0.03em]"
    >
      <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-[#111] text-[11px] font-bold text-white">
        F
      </span>
      Focus
    </Link>
  );
}

function DayList({ compact = false }: { compact?: boolean }) {
  const [progress, setProgress] = useState(43);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const timer = window.setInterval(
      () => setProgress((value) => (value >= 79 ? 43 : value + 1)),
      1600,
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);
  return (
    <div
      className={`overflow-hidden border border-black/10 bg-white ${compact ? "" : "shadow-[0_24px_60px_rgba(12,12,12,0.08)]"}`}
    >
      {!compact && (
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-black/45">
              Tuesday, October 22
            </p>
            <p className="mt-1 text-sm font-medium tracking-[-0.02em]">
              A day with a shape
            </p>
          </div>
          <span className="text-xs text-black/45">4 blocks</span>
        </div>
      )}
      <div className={compact ? "p-3" : "p-3 sm:p-4"}>
        {day.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className={`relative grid grid-cols-[72px_1fr] gap-3 border-b border-black/7 py-3.5 last:border-0 ${item.state === "now" ? "bg-[#2563EB]/[0.055] px-3 -mx-1" : ""}`}
          >
            <div className="pt-0.5 text-[11px] tabular-nums text-black/42">
              <p>{item.time}</p>
              <p className="mt-0.5 text-black/28">{item.end}</p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium tracking-[-0.02em]">
                  {item.title}
                </p>
                {item.state === "done" && (
                  <Check className="h-4 w-4 text-black/38" strokeWidth={1.8} />
                )}
                {item.state === "now" && (
                  <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#2563EB]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                    Now
                  </span>
                )}
              </div>
              {item.state === "now" && (
                <div className="mt-3 h-1 overflow-hidden bg-[#2563EB]/15">
                  <motion.div
                    className="h-full bg-[#2563EB]"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      {!compact && (
        <div className="flex items-center justify-between border-t border-black/10 px-5 py-3.5 text-xs text-black/45 sm:px-6">
          <span>09:52 local time</span>
          <span>On plan</span>
        </div>
      )}
    </div>
  );
}

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45">
      {children}
    </p>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  return (
    <main
      id="top"
      className="overflow-hidden bg-[#fff] text-[#101010] selection:bg-[#2563EB] selection:text-white"
    >
      <header className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Wordmark />
        <nav className="hidden items-center gap-7 text-[13px] text-black/58 md:flex">
          <a href="#method" className="transition-colors hover:text-black">
            Method
          </a>
          <a href="#review" className="transition-colors hover:text-black">
            Review
          </a>
          <a href="#pricing" className="transition-colors hover:text-black">
            Pricing
          </a>
        </nav>
        <div className="hidden items-center gap-4 md:flex">
          <Link
            href="/sign-in"
            className="text-[13px] font-medium text-black/65 transition-colors hover:text-black"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-[#111] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#2563EB]"
          >
            Start planning
          </Link>
        </div>
        <button
          className="grid h-9 w-9 place-items-center md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {menuOpen && (
        <div className="border-y border-black/10 px-5 py-5 md:hidden">
          <nav className="flex flex-col gap-4 text-sm">
            <a href="#method" onClick={() => setMenuOpen(false)}>
              Method
            </a>
            <a href="#review" onClick={() => setMenuOpen(false)}>
              Review
            </a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>
              Pricing
            </a>
            <Link href="/sign-up" className="mt-2 font-medium text-[#2563EB]">
              Start planning →
            </Link>
          </nav>
        </div>
      )}
      <section className="mx-auto grid max-w-[1440px] items-center gap-14 px-5 pb-24 pt-20 sm:px-8 sm:pb-32 sm:pt-28 lg:grid-cols-[1.08fr_0.92fr] lg:gap-20 lg:px-12 lg:pb-40">
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-black/48">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" /> Time,
            kept
          </p>
          <h1 className="max-w-[760px] text-balance text-[clamp(3.4rem,7.3vw,7.4rem)] font-medium leading-[0.94] tracking-[-0.075em]">
            Keep the promises you make to your calendar.
          </h1>
          <p className="mt-8 max-w-[470px] text-pretty text-[17px] leading-[1.55] tracking-[-0.015em] text-black/60">
            Focus turns a plan into a day you can honor. Make time visible, work
            one block at a time, and learn what your days are really made of.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-md bg-[#2563EB] px-5 py-3.5 text-[14px] font-medium text-white transition-colors hover:bg-[#1d4ed8]"
            >
              Start planning <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#method"
              className="inline-flex items-center gap-2 text-[14px] font-medium text-black/72 hover:text-black"
            >
              See how it works <ArrowDownRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-[510px] lg:justify-self-end"
        >
          <DayList />
          <p className="mt-4 text-center text-[11px] tracking-[-0.01em] text-black/38">
            The day, in motion. No noise required.
          </p>
        </motion.div>
      </section>
      <section className="border-y border-black/10 bg-[#f8f8f7]">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-2">
          <div className="border-b border-black/10 px-5 py-20 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-28">
            <SectionEyebrow>The old way</SectionEyebrow>
            <h2 className="max-w-[540px] text-[clamp(2.5rem,4.5vw,5rem)] font-medium leading-[0.98] tracking-[-0.065em]">
              To-do lists tell you{" "}
              <em className="font-serif font-normal">what.</em>
              <br />
              Schedules tell you{" "}
              <em className="font-serif font-normal">when.</em>
            </h2>
            <div className="mt-12 max-w-[420px] border-l border-black/10 pl-5 text-[15px] leading-7 text-black/45">
              <p className="line-through decoration-black/25">
                Reply to Ana about the brief
              </p>
              <p className="mt-2">Write the proposal</p>
              <p className="mt-2">Gym?</p>
              <p className="mt-2 line-through decoration-black/25">
                Prepare for Thursday
              </p>
              <p className="mt-2">Follow up on everything else</p>
            </div>
          </div>
          <div className="px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <SectionEyebrow>A quieter alternative</SectionEyebrow>
            <p className="max-w-[430px] text-[20px] leading-[1.35] tracking-[-0.035em] text-black/66">
              A schedule does not make your day rigid. It gives your attention
              somewhere clear to land.
            </p>
            <div className="mt-10 max-w-[480px]">
              <DayList compact />
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1100px] px-5 py-28 text-center sm:px-8 sm:py-40">
        <SectionEyebrow>Our philosophy</SectionEyebrow>
        <blockquote className="text-balance font-serif text-[clamp(2.6rem,5.5vw,5.8rem)] leading-[1.01] tracking-[-0.055em]">
          “The goal isn&apos;t finishing everything.
          <br className="hidden sm:block" /> It&apos;s honoring the time you
          planned.”
        </blockquote>
        <p className="mt-9 text-[12px] font-medium uppercase tracking-[0.16em] text-black/40">
          Focus, on schedule fidelity
        </p>
      </section>
      <section
        id="method"
        className="border-y border-black/10 bg-[#111] text-white"
      >
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="max-w-[720px]">
            <SectionEyebrow>One day, clearly held</SectionEyebrow>
            <h2 className="text-balance text-[clamp(2.8rem,5.2vw,5.8rem)] font-medium leading-[0.96] tracking-[-0.07em]">
              A live timeline for the work in front of you.
            </h2>
          </div>
          <div className="mt-16 grid gap-10 lg:grid-cols-[240px_1fr] lg:items-end">
            <div className="space-y-6 text-[15px] leading-6 text-white/56">
              <p>Completed blocks make room for what matters now.</p>
              <p>
                A single moving marker helps you stay with the present, while
                the rest of the day waits quietly.
              </p>
            </div>
            <LiveTimeline />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 sm:py-36 lg:px-12">
        <div className="grid items-end gap-8 border-b border-black/10 pb-12 lg:grid-cols-[1fr_auto]">
          <div>
            <SectionEyebrow>Proof, not pressure</SectionEyebrow>
            <h2 className="max-w-[700px] text-balance text-[clamp(2.6rem,5vw,5.5rem)] font-medium leading-[0.97] tracking-[-0.07em]">
              See the shape of a day well kept.
            </h2>
          </div>
          <p className="max-w-[250px] text-[14px] leading-6 text-black/52">
            Three signals. Enough to make tomorrow better than today.
          </p>
        </div>
        <div className="grid md:grid-cols-3">
          <Metric
            label="Schedule fidelity"
            value="87"
            suffix="%"
            note="of planned time held"
            delay={0}
          />
          <Metric
            label="Deep work"
            value="4h"
            suffix=" 35m"
            note="across three sessions"
            delay={0.12}
          />
          <Metric
            label="Planned vs. actual"
            value="+14"
            suffix=" min"
            note="a day with a little room"
            delay={0.24}
          />
        </div>
      </section>
      <section className="border-y border-black/10 bg-[#f8f8f7]">
        <div className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <SectionEyebrow>How Focus works</SectionEyebrow>
          <div className="divide-y divide-black/10">
            <Workflow
              number="01"
              title="Plan"
              description="Give every important thing a home in time. A good plan leaves room for the unexpected, too."
              visual={<PlanVisual />}
            />
            <Workflow
              number="02"
              title="Execute"
              description="When a block starts, the rest of the day falls away. Make one honest commitment at a time."
              visual={<ExecuteVisual />}
              reverse
            />
            <Workflow
              number="03"
              title="Reflect"
              description="A few quiet questions turn a finished day into a more realistic one tomorrow."
              visual={<ReflectVisual />}
            />
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 sm:py-36 lg:px-12">
        <div className="max-w-[620px]">
          <SectionEyebrow>Built for real work</SectionEyebrow>
          <h2 className="text-balance text-[clamp(2.6rem,5vw,5.4rem)] font-medium leading-[0.97] tracking-[-0.07em]">
            Everyone deserves a day with edges.
          </h2>
        </div>
        <div className="mt-16 border-t border-black/10">
          {audiences.map(([name, description], index) => (
            <div
              key={name}
              className="grid gap-4 border-b border-black/10 py-5 sm:grid-cols-[120px_1fr_auto] sm:items-center sm:py-6"
            >
              <span className="text-[11px] font-medium text-black/35">
                0{index + 1}
              </span>
              <h3 className="text-[22px] tracking-[-0.04em]">{name}</h3>
              <p className="max-w-[450px] text-[14px] leading-6 text-black/52">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section id="review" className="border-y border-black/10 bg-[#f8f8f7]">
        <div className="mx-auto grid max-w-[1440px] gap-16 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-12">
          <div>
            <SectionEyebrow>Daily review</SectionEyebrow>
            <h2 className="text-balance text-[clamp(2.6rem,4.7vw,5rem)] font-medium leading-[0.97] tracking-[-0.07em]">
              End with clarity. Start again with intent.
            </h2>
            <p className="mt-7 max-w-[410px] text-[16px] leading-7 text-black/55">
              Focus helps you notice the pattern, not prosecute the day.
            </p>
          </div>
          <ReviewVisual />
        </div>
      </section>
      <section className="mx-auto max-w-[1120px] px-5 py-28 sm:px-8 sm:py-40">
        <SectionEyebrow>From people with more room to think</SectionEyebrow>
        <div className="space-y-20 sm:space-y-28">
          <figure>
            <blockquote className="text-balance text-[clamp(2.1rem,4.2vw,4.7rem)] font-medium leading-[1.03] tracking-[-0.06em]">
              “For the first time, I end the day knowing where it went.”
            </blockquote>
            <figcaption className="mt-6 text-[13px] text-black/45">
              Mina Lee, independent designer
            </figcaption>
          </figure>
          <figure className="sm:ml-[14%]">
            <blockquote className="text-balance text-[clamp(2.1rem,4.2vw,4.7rem)] font-medium leading-[1.03] tracking-[-0.06em]">
              “The calendar stopped being a list of obligations and became an
              agreement with myself.”
            </blockquote>
            <figcaption className="mt-6 text-[13px] text-black/45">
              Jon Bell, product engineer
            </figcaption>
          </figure>
        </div>
      </section>
      <section id="pricing" className="border-y border-black/10 bg-[#f8f8f7]">
        <div className="mx-auto max-w-[1440px] px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
          <div className="max-w-[620px]">
            <SectionEyebrow>Simple by design</SectionEyebrow>
            <h2 className="text-balance text-[clamp(2.6rem,5vw,5.2rem)] font-medium leading-[0.97] tracking-[-0.07em]">
              One good plan is enough.
            </h2>
          </div>
          <div className="mt-14 grid max-w-[930px] gap-px overflow-hidden border border-black/10 bg-black/10 md:grid-cols-2">
            <Price
              name="Personal"
              price="Free"
              description="For finding a rhythm that fits."
              items={["Unlimited daily plans", "Live timeline", "Daily review"]}
            />
            <Price
              highlighted
              name="Focus Pro"
              price="$8"
              suffix="/month"
              description="For a practice worth returning to."
              items={[
                "Everything in Personal",
                "Schedule fidelity insights",
                "Full focus history",
              ]}
            />
          </div>
          <p className="mt-5 text-[12px] text-black/40">
            No contracts. A quieter day starts free.
          </p>
        </div>
      </section>
      <section className="bg-[#111] px-5 py-28 text-center text-white sm:px-8 sm:py-40">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">
          Focus, for tomorrow
        </p>
        <h2 className="mx-auto mt-7 max-w-[950px] text-balance text-[clamp(3.2rem,7vw,7.5rem)] font-medium leading-[0.93] tracking-[-0.075em]">
          Tomorrow deserves a plan.
        </h2>
        <Link
          href="/sign-up"
          className="mt-10 inline-flex items-center gap-2 rounded-md bg-white px-5 py-3.5 text-[14px] font-medium text-black transition-colors hover:bg-[#2563EB] hover:text-white"
        >
          Start planning <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
      <footer className="mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-9 text-[12px] text-black/45 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <Wordmark />
        <div className="flex gap-5">
          <a href="#" className="hover:text-black">
            Privacy
          </a>
          <a href="#" className="hover:text-black">
            Terms
          </a>
          <a href="mailto:hello@focus.app" className="hover:text-black">
            Contact
          </a>
        </div>
        <p>© 2026 Focus</p>
      </footer>
    </main>
  );
}

function LiveTimeline() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="relative overflow-x-auto pb-3">
      <div className="min-w-[640px] border-y border-white/18 py-8">
        <div className="relative grid grid-cols-[1.2fr_2.6fr_0.75fr_1.25fr] gap-0">
          <motion.div
            className="absolute bottom-0 top-0 z-10 w-px bg-[#60a5fa]"
            animate={{ left: reduceMotion ? "42%" : ["36%", "46%", "36%"] }}
            transition={{ duration: 12, ease: "easeInOut", repeat: Infinity }}
          />
          <TimelineBlock title="Plan" time="08:00" done />
          <TimelineBlock title="Deep work" time="09:00" current />
          <TimelineBlock title="Break" time="11:00" />
          <TimelineBlock title="Product meeting" time="11:30" />
        </div>
      </div>
      <div className="mt-3 grid min-w-[640px] grid-cols-4 text-[10px] uppercase tracking-[0.15em] text-white/35">
        <span>08:00</span>
        <span>10:00</span>
        <span>12:00</span>
        <span className="text-right">13:00</span>
      </div>
    </div>
  );
}
function TimelineBlock({
  title,
  time,
  done,
  current,
}: {
  title: string;
  time: string;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <div
      className={`min-h-[130px] border-l border-white/18 px-4 pt-3 sm:px-5 ${current ? "bg-white/[0.06]" : ""}`}
    >
      <p className="text-[10px] text-white/38">{time}</p>
      <p className="mt-7 text-sm tracking-[-0.02em] text-white/90">{title}</p>
      {done && <Check className="mt-3 h-3.5 w-3.5 text-white/40" />}
      {current && <div className="mt-4 h-px w-10 bg-[#60a5fa]" />}
    </div>
  );
}
function Metric({
  label,
  value,
  suffix,
  note,
  delay,
}: {
  label: string;
  value: string;
  suffix: string;
  note: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      className="border-b border-black/10 py-10 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
    >
      <p className="text-[12px] text-black/45">{label}</p>
      <p className="mt-5 text-[clamp(3.3rem,5vw,5.5rem)] font-medium leading-none tracking-[-0.075em]">
        {value}
        <span className="text-[0.43em] tracking-[-0.04em] text-black/48">
          {suffix}
        </span>
      </p>
      <p className="mt-4 text-[12px] text-black/42">{note}</p>
    </motion.div>
  );
}
function Workflow({
  number,
  title,
  description,
  visual,
  reverse = false,
}: {
  number: string;
  title: string;
  description: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <article className="grid gap-10 py-14 lg:grid-cols-2 lg:items-center lg:gap-20 lg:py-20">
      <div className={reverse ? "lg:order-2" : ""}>
        <p className="text-[12px] font-medium text-[#2563EB]">{number}</p>
        <h3 className="mt-4 text-[clamp(2.8rem,5.2vw,5.4rem)] font-medium leading-[0.94] tracking-[-0.07em]">
          {title}
        </h3>
        <p className="mt-6 max-w-[350px] text-[16px] leading-7 text-black/56">
          {description}
        </p>
      </div>
      <div className={reverse ? "lg:order-1" : ""}>{visual}</div>
    </article>
  );
}
function PlanVisual() {
  return (
    <div className="border border-black/10 bg-white p-5 sm:p-7">
      <div className="flex items-center justify-between border-b border-black/10 pb-4 text-[12px]">
        <span className="font-medium">Wednesday</span>
        <span className="text-black/42">October 23</span>
      </div>
      <div className="mt-5 grid grid-cols-[52px_1fr] gap-y-5 text-[12px]">
        <span className="text-black/38">09:00</span>
        <div className="border-l-2 border-[#2563EB] pl-3">
          <p className="font-medium">Write project brief</p>
          <p className="mt-1 text-black/42">90 minutes</p>
        </div>
        <span className="text-black/38">11:00</span>
        <div className="border-l-2 border-black/15 pl-3">
          <p className="font-medium">Team standup</p>
          <p className="mt-1 text-black/42">30 minutes</p>
        </div>
        <span className="text-black/38">13:30</span>
        <div className="border-l-2 border-black/15 pl-3">
          <p className="font-medium">Research and notes</p>
          <p className="mt-1 text-black/42">2 hours</p>
        </div>
      </div>
    </div>
  );
}
function ExecuteVisual() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="bg-[#111] p-6 text-white sm:p-9">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/42">
        In focus
      </p>
      <div className="mt-16 flex items-end justify-between">
        <div>
          <p className="text-[clamp(3.6rem,7vw,6rem)] font-medium leading-none tracking-[-0.07em]">
            42:18
          </p>
          <p className="mt-3 text-sm text-white/52">Write project brief</p>
        </div>
        <Play className="mb-1 h-5 w-5 fill-white text-white" />
      </div>
      <div className="mt-12 h-px bg-white/20">
        <motion.div
          className="h-px bg-[#60a5fa]"
          animate={{ width: reduceMotion ? "58%" : ["43%", "73%", "43%"] }}
          transition={{ repeat: Infinity, duration: 9, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
function ReflectVisual() {
  return (
    <div className="border border-black/10 bg-white p-6 sm:p-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-black/40">
        Tuesday’s debrief
      </p>
      <div className="mt-9 space-y-7">
        <ReviewQuestion
          number="01"
          text="What interrupted you?"
          answer="Two unplanned calls after lunch."
        />
        <ReviewQuestion
          number="02"
          text="Which blocks stayed on schedule?"
          answer="Writing and research, exactly as planned."
        />
        <ReviewQuestion
          number="03"
          text="What should tomorrow look like?"
          answer="A slower morning. More room between meetings."
        />
      </div>
    </div>
  );
}
function ReviewQuestion({
  number,
  text,
  answer,
}: {
  number: string;
  text: string;
  answer: string;
}) {
  return (
    <div className="border-b border-black/10 pb-5 last:border-0 last:pb-0">
      <p className="text-[11px] text-[#2563EB]">{number}</p>
      <p className="mt-2 text-[15px] tracking-[-0.02em]">{text}</p>
      <p className="mt-2 text-[13px] leading-5 text-black/44">{answer}</p>
    </div>
  );
}
function ReviewVisual() {
  return (
    <div className="border border-black/10 bg-white p-6 sm:p-9">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-black/40">
            Tuesday review
          </p>
          <p className="mt-2 text-sm font-medium">A day worth noticing</p>
        </div>
        <Clock3 className="h-5 w-5 text-black/30" />
      </div>
      <div className="mt-10 divide-y divide-black/10">
        <ReviewQuestion
          number="01"
          text="What interrupted you?"
          answer="Two calls that had no place in the plan."
        />
        <ReviewQuestion
          number="02"
          text="Which blocks stayed on schedule?"
          answer="Deep work and your design review."
        />
        <ReviewQuestion
          number="03"
          text="What should tomorrow look like?"
          answer="One fewer meeting, and a protected morning."
        />
      </div>
      <button className="mt-9 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB]">
        Continue to tomorrow <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
function Price({
  name,
  price,
  suffix,
  description,
  items,
  highlighted = false,
}: {
  name: string;
  price: string;
  suffix?: string;
  description: string;
  items: string[];
  highlighted?: boolean;
}) {
  return (
    <div
      className={`p-7 sm:p-9 ${highlighted ? "bg-[#111] text-white" : "bg-white"}`}
    >
      <p
        className={`text-[12px] ${highlighted ? "text-white/48" : "text-black/45"}`}
      >
        {name}
      </p>
      <p className="mt-7 text-[48px] font-medium leading-none tracking-[-0.065em]">
        {price}
        <span
          className={`ml-1 text-[15px] tracking-[-0.02em] ${highlighted ? "text-white/48" : "text-black/42"}`}
        >
          {suffix}
        </span>
      </p>
      <p
        className={`mt-4 text-[14px] ${highlighted ? "text-white/60" : "text-black/55"}`}
      >
        {description}
      </p>
      <ul
        className={`mt-9 space-y-3 border-t pt-6 text-[13px] ${highlighted ? "border-white/15 text-white/75" : "border-black/10 text-black/65"}`}
      >
        {items.map((item) => (
          <li className="flex gap-2" key={item}>
            <Check
              className={`h-4 w-4 shrink-0 ${highlighted ? "text-[#60a5fa]" : "text-[#2563EB]"}`}
            />
            {item}
          </li>
        ))}
      </ul>
      <Link
        href="/sign-up"
        className={`mt-10 inline-flex w-full items-center justify-center rounded-md px-4 py-3 text-[13px] font-medium transition-colors ${highlighted ? "bg-white text-black hover:bg-[#2563EB] hover:text-white" : "bg-[#111] text-white hover:bg-[#2563EB]"}`}
      >
        {highlighted ? "Start 14-day trial" : "Start free"}
      </Link>
    </div>
  );
}
