"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

/**
 * Calora UI primitives — tiny, opinionated set.
 * All components use CSS variables defined in globals.css so the brand
 * can be tweaked in one place.
 */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  full?: boolean;
}

/** Primary CTA — colored shadow glow (Linear/Stripe pattern). */
export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-[12px]",
    md: "px-4 py-2.5 text-sm rounded-[14px]",
    lg: "px-6 py-4 text-base rounded-[20px] font-semibold",
  };

  const variants = {
    primary:
      "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] " +
      "shadow-[0_8px_24px_-8px_rgba(255,111,77,0.45)] " +
      "active:scale-[0.98] transition",
    secondary:
      "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--surface-strong)] " +
      "active:scale-[0.98] transition",
    ghost:
      "text-[var(--ink-soft)] hover:text-[var(--ink)] " +
      "hover:bg-[var(--surface-soft)] active:scale-[0.98] transition",
    danger:
      "bg-[var(--danger-soft)] text-[var(--danger)] hover:bg-[var(--danger)] " +
      "hover:text-white active:scale-[0.98] transition",
  };

  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center gap-2 font-medium",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus-visible:outline-2 focus-visible:outline-[var(--lavender)]",
        sizes[size],
        variants[variant],
        full ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}
export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={[
        "rounded-[20px] bg-[var(--surface-card)] border border-[var(--hairline)]",
        "shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Page header with optional back button + title + right slot. */
export function PageHeader({
  back,
  right,
  title,
  subtitle,
}: {
  back?: ReactNode;
  right?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <header className="px-5 pt-5 pb-3">
      <div className="flex items-start gap-2">
        <div className="w-10 shrink-0 flex items-center">{back}</div>
        <div className="flex-1 min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[22px] leading-tight font-semibold tracking-tight text-[var(--ink)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-[var(--ink-muted)] mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right && (
        <div className="mt-3 overflow-x-auto">{right}</div>
      )}
    </header>
  );
}

/** Top wordmark for home — calm lowercase. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "font-[family-name:var(--font-display)] text-[22px] font-semibold tracking-tight",
        "text-[var(--ink)]",
        className,
      ].join(" ")}
    >
      calora
    </span>
  );
}

/** Pill toggle (segmented control). */
export function PillToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex bg-[var(--surface-soft)] rounded-[12px] p-1 gap-1"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={[
            "px-3.5 py-1.5 text-[13px] font-medium rounded-[10px] transition capitalize",
            value === o.value
              ? "bg-[var(--surface-card)] text-[var(--ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink-soft)]",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Macro bar — horizontal progress bar showing g + % of target. */
export function MacroBar({
  name,
  value,
  target,
  color,
}: {
  name: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, target)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          {name}
        </span>
        <div className="flex items-baseline gap-1.5 tabular text-[14px]">
          <span className="font-semibold text-[var(--ink)]">{value}g</span>
          <span className="text-[11px] text-[var(--ink-muted)]">/ {target}g</span>
        </div>
      </div>
      <div className="progress-bar h-2" style={{ background: "var(--surface-strong)" }}>
        <span
          style={{
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

/** IconButton — icon-only, square, ghost-styled. */
export function IconButton({
  label,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      aria-label={label}
      {...rest}
      className={[
        "w-11 h-11 rounded-full inline-flex items-center justify-center",
        "text-[var(--ink-soft)] hover:text-[var(--ink)]",
        "hover:bg-[var(--surface-soft)] active:scale-[0.94] transition",
        "focus-visible:outline-2 focus-visible:outline-[var(--lavender)]",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** Confidence badge — pill + label, colored by confidence level. */
export function ConfidenceBadge({
  level,
}: {
  level: "high" | "medium" | "low";
}) {
  const map = {
    high: {
      bg: "var(--success-soft)",
      fg: "var(--success)",
      label: "High confidence",
    },
    medium: {
      bg: "var(--warning-soft)",
      fg: "var(--warning)",
      label: "Medium — review items",
    },
    low: {
      bg: "var(--danger-soft)",
      fg: "var(--danger)",
      label: "Low — likely needs editing",
    },
  } as const;
  const m = map[level];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: m.bg, color: m.fg }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: m.fg }}
      />
      {m.label}
    </span>
  );
}

/** Empty state — heading + sub + action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-3">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--surface-soft)] flex items-center justify-center text-[var(--ink-muted)]">
          {icon}
        </div>
      )}
      <p className="text-[15px] font-semibold text-[var(--ink)]">{title}</p>
      {description && (
        <p className="text-[13px] text-[var(--ink-muted)] max-w-[280px]">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
