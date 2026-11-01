import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, GitBranch, Home, Menu, SendHorizonal, ShieldCheck, ShieldAlert, FlaskConical, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home / Overview", icon: Home },
  { to: "/bankers", label: "Banker's Safety Algorithm", icon: ShieldCheck },
  { to: "/request", label: "Resource Request", icon: SendHorizonal },
  { to: "/detection", label: "Deadlock Detection", icon: GitBranch },
  { to: "/prevention", label: "Prevention and Recovery", icon: ShieldAlert },
  { to: "/boundary", label: "Boundary Tests", icon: FlaskConical },
] as const;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
        <Brand />
        <button aria-label="Toggle menu" onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 hover:bg-sidebar-accent">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden px-6 py-6 lg:block"><Brand /></div>
        <nav className="flex-1 space-y-1 px-3 pt-4 lg:pt-0">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/50">Modules</p>
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: true }}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/75 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
              activeProps={{ className: "!bg-gradient-brand !text-primary-foreground shadow-glow" }}
            >
              <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="m-4 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-4">
          <Link
            to="/about"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground transition-colors hover:text-sidebar-primary"
            activeProps={{ className: "!text-sidebar-primary" }}
          >
            <Users className="h-4 w-4" />
            About / Project Team
          </Link>
          <p className="mt-2 text-xs text-sidebar-foreground/65">Operating Systems · DeadlockLab</p>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-sidebar/60 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-brand shadow-glow"><Activity className="h-5 w-5 text-primary-foreground" /></div>
      <div className="leading-tight">
        <div className="font-display text-sm font-bold">Deadlock Lab</div>
        <div className="text-[11px] text-sidebar-foreground/60">OS Analysis Dashboard</div>
      </div>
    </div>
  );
}
