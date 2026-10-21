import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cx("rounded-card border border-line bg-surface", className)} {...rest}>
      {children}
    </div>
  );
}

export function Heading({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={cx("text-[21px] font-semibold leading-tight tracking-tight", className)}>
      {children}
    </h2>
  );
}

export type Tone = "brand" | "success" | "danger" | "trap" | "lilac" | "honey" | "mint" | "neutral" | "brand-strong";
const TONES: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700",
  "brand-strong": "bg-brand-700 text-white",
  success: "bg-success-bg text-success-700",
  danger: "bg-danger-bg text-danger",
  trap: "bg-trap-bg text-trap",
  lilac: "bg-lilac-bg text-lilac",
  honey: "bg-honey-bg text-honey",
  mint: "bg-mint-bg text-mint",
  neutral: "bg-subtle text-ink-2",
};

export function Tag({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center rounded-tag px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", TONES[tone], className)}>{children}</span>;
}

export function Pill({ tone = "neutral", children, wrap }: { tone?: Tone; children: ReactNode; wrap?: boolean }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", wrap ? "max-w-full" : "whitespace-nowrap", TONES[tone])}>{children}</span>;
}

export function ProgressBar({ value, color = "bg-brand-700", cutoff, label }: { value: number; color?: string; cutoff?: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative h-1.5 rounded-full bg-line" role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <div className={cx("h-1.5 rounded-full transition-[width]", color)} style={{ width: `${v * 100}%` }} />
      {cutoff !== undefined && <div className="absolute -top-[3px] h-3 w-0.5 bg-ink" style={{ left: `${cutoff * 100}%` }} />}
    </div>
  );
}

type Variant = "primary" | "secondary" | "soft" | "text" | "danger";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 disabled:bg-line disabled:text-disabled",
  secondary: "bg-line text-ink hover:bg-line-strong/80 active:bg-line-strong disabled:text-disabled",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100",
  text: "text-brand-700 hover:text-brand-800 hover:underline px-1",
  danger: "bg-danger-bg text-danger hover:bg-danger-line/60 disabled:text-disabled",
};
const SIZES = { s: "min-h-8 px-3.5 text-xs", m: "min-h-9 px-[18px] text-[14px]", l: "min-h-11 px-[22px] text-[15px]" };

export function buttonClasses(v: Variant = "primary", s: keyof typeof SIZES = "m", extra?: string) {
  return cx("inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-colors disabled:cursor-not-allowed", VARIANTS[v], SIZES[s], extra);
}

export function Button({ variant = "primary", size = "m", className, ...rest }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <button type="button" className={buttonClasses(variant, size, className)} {...rest} />;
}

export function ButtonLink({ variant = "primary", size = "m", className, ...rest }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof SIZES }) {
  return <Link className={buttonClasses(variant, size, className)} {...rest} />;
}

export function Notice({ tone = "trap", children }: { tone?: "trap" | "danger" | "brand" | "success"; children: ReactNode }) {
  const t = {
    trap: "bg-trap-bg border-trap-line text-trap-ink",
    danger: "bg-danger-bg border-danger-line text-danger-ink",
    brand: "bg-brand-50 border-brand-100 text-brand-900",
    success: "bg-success-bg border-success-line text-success-ink",
  }[tone];
  return (
    <div role="note" className={cx("rounded-[12px] border px-4 py-3 text-[13px] leading-relaxed", t)}>
      {children}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-card bg-subtle p-6 text-center">
      <span className="text-sm font-semibold">{title}</span>
      {children && <span className="text-xs text-ink-3">{children}</span>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-ink-3" role="status">
      Carregando…
    </div>
  );
}

/** Inline link with a trailing chevron, the Apple "Learn more ›" pattern. */
export function ChevronLink({ href, children, className, ...rest }: ComponentProps<typeof Link>) {
  return (
    <Link href={href} className={cx("group inline-flex items-center gap-1 font-medium text-brand-700 hover:underline", className)} {...rest}>
      {children}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-3.5 w-3.5 transition-transform motion-safe:group-hover:translate-x-0.5">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

export function pct(v: number | null | undefined) {
  return v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`;
}

export const inputClasses = "h-10 w-full rounded-button border border-line-strong bg-surface px-3 text-[14px] outline-none transition-shadow focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 focus-visible:outline-none";
export const textareaClasses = "min-h-24 w-full rounded-button border border-line-strong bg-surface px-3 py-2 text-[14px] leading-relaxed outline-none transition-shadow focus:border-brand-600 focus:ring-4 focus:ring-brand-600/15 focus-visible:outline-none";

/** Renders the simple markdown (tables, bold, lists) used in the guide. */
export function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const lines = text.trim().split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, k) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={k}>{part.slice(2, -2)}</strong> : <span key={k}>{part}</span>
    );
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim().startsWith("|")) {
      const table: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) table.push(cells);
        i++;
      }
      const [head, ...body] = table;
      blocks.push(
        <div key={i} className="relative overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[13px]">
            <thead>
              <tr>{head?.map((c, k) => <th key={k} scope="col" className="border-b border-line px-2 py-2 text-left font-semibold">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, k) => (
                <tr key={k}>{r.map((c, j) => <td key={j} className="border-b border-subtle px-2 py-2 align-top">{inline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*] /, ""));
      blocks.push(
        <ul key={i} className="list-disc space-y-1 pl-5">
          {items.map((t, k) => <li key={k}>{inline(t)}</li>)}
        </ul>
      );
      continue;
    }
    if (l.trim()) blocks.push(<p key={i}>{inline(l)}</p>);
    i++;
  }
  return <div className="space-y-2 text-[13px] leading-relaxed">{blocks}</div>;
}
