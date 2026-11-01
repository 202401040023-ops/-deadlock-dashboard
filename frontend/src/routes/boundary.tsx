import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FlaskConical, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Notice, PageHeader, Panel, StatusBadge } from "@/components/dash/ui";
import { BOUNDARY_CASES } from "@/lib/boundary";
import { actions } from "@/lib/store";

export const Route = createFileRoute("/boundary")({
  head: () => ({
    meta: [
      { title: "Boundary Tests — Deadlock Lab" },
      { name: "description", content: "Edge-case tests that run the real deadlock algorithms." },
      { property: "og:title", content: "Boundary Tests — Deadlock Lab" },
      { property: "og:description", content: "Edge-case tests that run the real deadlock algorithms." },
    ],
  }),
  component: BoundaryPage,
});

type Row = { actual: string; pass: boolean };

function BoundaryPage() {
  const [results, setResults] = useState<Record<number, Row>>({});
  const [busy, setBusy] = useState(false);

  const runOne = async (i: number) => {
    const c = BOUNDARY_CASES[i];
    let actual: string;
    try { actual = await c.runApi(); } catch (e) { actual = "error: " + (e instanceof Error ? e.message : "API request failed"); }
    const row = { actual, pass: actual === c.expected };
    actions.logTest({ module: "Boundary Test", input: c.name, result: `expected ${c.expected}, got ${actual}`, status: row.pass ? "pass" : "fail" });
    setResults((previous) => ({ ...previous, [i]: row }));
    return row;
  };

  const runAll = async () => {
    setBusy(true);
    for (let i = 0; i < BOUNDARY_CASES.length; i++) await runOne(i);
    setBusy(false);
  };

  const runSingle = async (i: number) => {
    setBusy(true);
    await runOne(i);
    setBusy(false);
  };

  const done = Object.values(results);
  const passed = done.filter((r) => r.pass).length;

  return (
    <>
      <PageHeader icon={<FlaskConical className="h-6 w-6" />} title="Boundary Tests" subtitle="Each test calls the actual algorithm with an edge-case input and compares the outcome to the expected answer." />
      <Panel title={`Test cases (${BOUNDARY_CASES.length})`} action={<Button onClick={runAll} disabled={busy}><Play />{busy ? "Running..." : "Run all tests"}</Button>}>
        {done.length > 0 && (
          <div className="mb-4">
            <Notice kind={passed === done.length ? "success" : "danger"}>{passed} of {done.length} tests passed.</Notice>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">#</th><th className="px-3 py-2">Test</th><th className="px-3 py-2">Expected</th><th className="px-3 py-2">Actual</th><th className="px-3 py-2">Status</th><th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {BOUNDARY_CASES.map((c, i) => {
                const r = results[i];
                return (
                  <tr key={c.name} className="border-b border-border/60 transition-colors hover:bg-muted/60">
                    <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2.5"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.description}</div></td>
                    <td className="px-3 py-2.5 font-mono text-xs">{c.expected}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{r?.actual ?? "—"}</td>
                    <td className="px-3 py-2.5">{r ? <StatusBadge status={r.pass ? "pass" : "fail"} /> : <span className="text-xs text-muted-foreground">not run</span>}</td>
                    <td className="px-3 py-2.5 text-right"><Button size="sm" variant="outline" disabled={busy} onClick={() => runSingle(i)}>Run</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
