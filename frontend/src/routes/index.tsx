import type React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bot, CheckCircle2, Clock, Cpu, Home, Layers, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Notice, PageHeader, Panel, StatusBadge, inputCls } from "@/components/dash/ui";
import { ProcessDiagram } from "@/components/dash/ProcessDiagram";
import { checkSafety, toSafetyResult } from "@/lib/api";
import { actions, useDashboard, type TestStatus } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — Deadlock Lab OS Dashboard" },
      { name: "description", content: "Live overview of system safety, allocation, test results and AI usage record." },
      { property: "og:title", content: "Overview — Deadlock Lab OS Dashboard" },
      { property: "og:description", content: "Live overview of system safety, allocation, test results and AI usage record." },
    ],
  }),
  component: Overview,
});

const STATUS_COLOR: Record<string, string> = {
  Safe: "var(--success)", Granted: "var(--success)", Pass: "var(--success)",
  Unsafe: "var(--warning)", Waiting: "var(--warning)",
  Deadlock: "var(--danger)", Fail: "var(--danger)", Invalid: "var(--muted-foreground)",
};
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 };

function Overview() {
  const { system, safetyResult, tests, ai } = useDashboard();
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!system || safetyResult) return;
    let active = true;
    checkSafety(system)
      .then((response) => {
        if (active) {
          actions.setSystem(system, toSafetyResult(response));
          setApiError("");
        }
      })
      .catch((error: unknown) => {
        if (active) setApiError(error instanceof Error ? error.message : "The saved system could not be checked.");
      });
    return () => {
      active = false;
    };
  }, [system, safetyResult]);
  const res = safetyResult;

  const counts = useMemo(() => {
    const c: Partial<Record<TestStatus, number>> = {};
    tests.forEach((t) => (c[t.status] = (c[t.status] ?? 0) + 1));
    return c;
  }, [tests]);
  const okCount = (counts.safe ?? 0) + (counts.granted ?? 0) + (counts.pass ?? 0);
  const deadCount = (counts.deadlock ?? 0) + (counts.fail ?? 0);
  const warnCount = (counts.unsafe ?? 0) + (counts.waiting ?? 0);

  const pie = Object.entries(counts).map(([k, v]) => ({ name: k[0].toUpperCase() + k.slice(1), value: v as number }));
  const resourceBars = system
    ? Array.from({ length: system.resources }, (_, j) => {
        const allocated = system.allocation.reduce((s, r) => s + (r[j] ?? 0), 0);
        return { name: `R${j}`, Allocated: allocated, Available: system.available[j] ?? 0, Total: allocated + (system.available[j] ?? 0) };
      })
    : [];
  const processBars = system && res
    ? system.allocation.map((r, i) => ({ name: `P${i}`, Allocated: r.reduce((a, b) => a + b, 0), Need: (res.need[i] ?? []).reduce((a, b) => a + b, 0) }))
    : [];
  const moduleBars = useMemo(() => {
    const m: Record<string, number> = {};
    tests.forEach((t) => (m[t.module] = (m[t.module] ?? 0) + 1));
    return Object.entries(m).map(([name, Runs]) => ({ name, Runs }));
  }, [tests]);

  return (
    <>
      <PageHeader icon={<Home className="h-6 w-6" />} title="Overview" subtitle="Live summary of the current system and every test you have run. All figures are computed from your own inputs." />
      {apiError && <div className="mb-6"><Notice kind="danger">{apiError}</Notice></div>}

      <section className="mb-6 overflow-hidden rounded-2xl bg-gradient-hero p-6 text-primary-foreground shadow-card md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">Current system state</p>
            {system && res ? (
              <>
                <h2 className="mt-2 font-display text-3xl font-bold">{res.safe ? "Safe" : "Unsafe"}</h2>
                <p className="mt-1 text-sm opacity-80">
                  {res.safe ? <>Safe sequence <span className="font-mono">{res.sequence.map((i) => "P" + i).join(" → ")}</span></> : `${res.finish.filter((f) => !f).length} process(es) cannot complete`}
                </p>
              </>
            ) : system ? (
              <>
                <h2 className="mt-2 font-display text-3xl font-bold">Checking saved system</h2>
                <p className="mt-1 text-sm opacity-80">Waiting for the backend safety result.</p>
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-3xl font-bold">No system loaded</h2>
                <p className="mt-1 text-sm opacity-80">Run the Banker's safety check to populate this dashboard.</p>
              </>
            )}
          </div>
          <Button asChild variant="outline" className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-primary hover:text-primary-foreground">
            <Link to="/bankers">{system ? "Edit system" : "Define a system"}</Link>
          </Button>
        </div>
      </section>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={<Cpu />} label="Processes" value={system?.processes ?? "—"} sub={system ? `${system.resources} resource types` : "no system"} tone="primary" />
        <Stat icon={<CheckCircle2 />} label="Safe / granted / passed" value={okCount} sub={`of ${tests.length} test runs`} tone="success" />
        <Stat icon={<Clock />} label="Unsafe / waiting" value={warnCount} sub="requests that must wait" tone="warning" />
        <Stat icon={<XCircle />} label="Deadlock / failed" value={deadCount} sub={`${counts.invalid ?? 0} invalid inputs`} tone="danger" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Resource utilisation" className="xl:col-span-2">
          {resourceBars.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={resourceBars} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Allocated" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Available" stackId="a" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Load a system to see resource usage." />}
        </Panel>
        <Panel title="Test outcomes">
          {pie.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} stroke="var(--card)">
                  {pie.map((p) => <Cell key={p.name} fill={STATUS_COLOR[p.name]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty text="Run any test to see outcomes." />}
        </Panel>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Per-process allocation vs need">
          {processBars.length && res ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={processBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Allocated" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Need" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Load a system to compare processes." />}
        </Panel>
        <Panel title="Process–resource diagram">
          {system && res ? (
            <ProcessDiagram allocation={system.allocation} request={res.need} statusOf={(i) => (res.finish[i] ? "safe" : "waiting")} />
          ) : <Empty text="Load a system to draw the diagram." />}
        </Panel>
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Recent test results" className="xl:col-span-2" action={tests.length > 0 && <Button size="sm" variant="ghost" onClick={actions.clearTests}><Trash2 />Clear</Button>}>
          {tests.length ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Time</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Input</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.slice(0, 25).map((t) => (
                    <tr key={t.id} className="border-b border-border/60 transition-colors hover:bg-muted/60">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">{new Date(t.time).toLocaleTimeString()}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium">{t.module}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{t.input}</td>
                      <td className="px-3 py-2 text-xs">{t.result}</td>
                      <td className="px-3 py-2"><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty text="No tests run yet. Use any module in the sidebar." />}
        </Panel>
        <Panel title="Runs per module">
          {moduleBars.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={moduleBars} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="name" width={110} stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="Runs" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty text="Module statistics appear after tests." />}
        </Panel>
      </div>

      <AiUsage records={ai} />
    </>
  );
}

function AiUsage({ records }: { records: ReturnType<typeof useDashboard>["ai"] }) {
  const [tool, setTool] = useState("");
  const [purpose, setPurpose] = useState("");
  const [verification, setVerification] = useState("");
  const [err, setErr] = useState("");
  const add = () => {
    if (!tool.trim() || !purpose.trim()) return setErr("Tool name and purpose are required.");
    actions.addAi({ tool: tool.trim(), purpose: purpose.trim(), verification: verification.trim() || "—" });
    setTool(""); setPurpose(""); setVerification(""); setErr("");
  };
  return (
    <Panel title="AI usage record" action={<Bot className="h-5 w-5 text-primary" />}>
      <p className="mb-4 text-sm text-muted-foreground">Declare where AI tools helped with this assignment and how you verified the output.</p>
      <div className="grid gap-3 md:grid-cols-[1fr_2fr_2fr_auto] md:items-end">
        <Field label="Tool"><input className={inputCls} value={tool} onChange={(e) => setTool(e.target.value)} placeholder="e.g. ChatGPT" /></Field>
        <Field label="Purpose"><input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What it was used for" /></Field>
        <Field label="How verified"><input className={inputCls} value={verification} onChange={(e) => setVerification(e.target.value)} placeholder="e.g. checked against textbook" /></Field>
        <Button onClick={add}><Plus />Add</Button>
      </div>
      {err && <div className="mt-3"><Notice kind="danger">{err}</Notice></div>}
      {records.length > 0 ? (
        <ul className="mt-4 divide-y divide-border">
          {records.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div>
                <span className="font-semibold text-primary">{r.tool}</span> — {r.purpose}
                <div className="text-xs text-muted-foreground">Verified: {r.verification} · {new Date(r.time).toLocaleString()}</div>
              </div>
              <Button size="icon" variant="ghost" aria-label="Remove record" onClick={() => actions.removeAi(r.id)}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 text-sm text-muted-foreground">No AI usage recorded yet.</p>}
    </Panel>
  );
}

function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; tone: "primary" | "success" | "warning" | "danger" }) {
  const toneCls = { primary: "bg-accent text-primary", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning", danger: "bg-danger-soft text-danger" }[tone];
  return (
    <div className="panel group hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid h-9 w-9 place-items-center rounded-lg transition-transform group-hover:scale-110 [&_svg]:h-4 [&_svg]:w-4", toneCls)}>{icon}</span>
      </div>
      <div className="mt-3 font-display text-3xl font-bold text-card-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
      <div><Layers className="mx-auto mb-2 h-6 w-6 opacity-50" />{text}</div>
    </div>
  );
}
