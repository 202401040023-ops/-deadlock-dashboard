// Shared dashboard building blocks: page header, panel, status badge, matrix table, alert.
import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TestStatus } from "@/lib/store";

export function PageHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: ReactNode }) {
  return (
    <header className="mb-8 flex items-start gap-4">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">{icon}</div>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </header>
  );
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("panel", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-base font-semibold text-card-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const statusStyle: Record<TestStatus, string> = {
  safe: "bg-success-soft text-success",
  granted: "bg-success-soft text-success",
  pass: "bg-success-soft text-success",
  waiting: "bg-warning-soft text-warning",
  unsafe: "bg-warning-soft text-warning",
  deadlock: "bg-danger-soft text-danger",
  fail: "bg-danger-soft text-danger",
  invalid: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: TestStatus }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", statusStyle[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "success" | "warning" | "danger" | "info"; children: ReactNode }) {
  const Icon = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info }[kind];
  const cls = {
    success: "border-success/30 bg-success-soft text-success",
    warning: "border-warning/30 bg-warning-soft text-warning",
    danger: "border-danger/30 bg-danger-soft text-danger",
    info: "border-primary/20 bg-accent text-accent-foreground",
  }[kind];
  return (
    <div role="alert" className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-1", cls)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

export function MatrixTable({ title, data, rowPrefix = "P", highlight }: { title: string; data: number[][]; rowPrefix?: string; highlight?: (i: number) => string | undefined }) {
  const cols = data[0]?.length ?? 0;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="bg-secondary px-3 py-2 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium" />
              {Array.from({ length: cols }, (_, j) => (
                <th key={j} className="px-3 py-2 text-center font-medium">R{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={cn("border-b border-border/60 last:border-0 transition-colors hover:bg-muted/60", highlight?.(i))}>
                <td className="px-3 py-1.5 font-semibold text-primary">{rowPrefix}{i}</td>
                {row.map((v, j) => (
                  <td key={j} className="px-3 py-1.5 text-center">{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const textareaCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40";
export const inputCls =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40";
