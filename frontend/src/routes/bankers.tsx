import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Play, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, MatrixTable, Notice, PageHeader, Panel, textareaCls, inputCls } from "@/components/dash/ui";
import { ProcessDiagram } from "@/components/dash/ProcessDiagram";
import { parseMatrix, parseVector, validateState, matrixToText, type SafetyResult, type SystemState } from "@/lib/deadlock";
import { checkSafety, toSafetyResult } from "@/lib/api";
import { actions, useDashboard } from "@/lib/store";
import { BANKER_SAMPLE } from "@/lib/samples";

export const Route = createFileRoute("/bankers")({
  head: () => ({
    meta: [
      { title: "Banker's Safety Algorithm — Deadlock Lab" },
      { name: "description", content: "Check whether a system state is safe and find the safe sequence." },
      { property: "og:title", content: "Banker's Safety Algorithm — Deadlock Lab" },
      { property: "og:description", content: "Check whether a system state is safe and find the safe sequence." },
    ],
  }),
  component: BankersPage,
});

function BankersPage() {
  const { system } = useDashboard();
  const [n, setN] = useState(String(system?.processes ?? BANKER_SAMPLE.processes));
  const [m, setM] = useState(String(system?.resources ?? BANKER_SAMPLE.resources));
  const [alloc, setAlloc] = useState(system ? matrixToText(system.allocation) : BANKER_SAMPLE.allocation);
  const [max, setMax] = useState(system ? matrixToText(system.max) : BANKER_SAMPLE.max);
  const [avail, setAvail] = useState(system ? system.available.join(" ") : BANKER_SAMPLE.available);
  const [errors, setErrors] = useState<string[]>([]);
  const [out, setOut] = useState<{ s: SystemState; r: SafetyResult } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const P = Number(n), R = Number(m);
    if (!Number.isInteger(P) || P < 1 || !Number.isInteger(R) || R < 1) {
      setErrors(["Processes and resource types must be whole numbers ≥ 1."]);
      setOut(null);
      actions.logTest({ module: "Banker's Safety", input: `n=${n}, m=${m}`, result: "Invalid dimensions", status: "invalid" });
      return;
    }
    const a = parseMatrix(alloc, P, R, "Allocation");
    const x = parseMatrix(max, P, R, "Max");
    const v = parseVector(avail, R, "Available");
    const parseErr = [a, x, v].filter((t): t is string => typeof t === "string");
    if (parseErr.length) {
      setErrors(parseErr); setOut(null);
      actions.logTest({ module: "Banker's Safety", input: `${P}×${R}`, result: parseErr[0], status: "invalid" });
      return;
    }
    const s: SystemState = { processes: P, resources: R, allocation: a as number[][], max: x as number[][], available: v as number[] };
    const ve = validateState(s);
    if (ve.length) {
      setErrors(ve); setOut(null);
      actions.logTest({ module: "Banker's Safety", input: `${P}×${R}`, result: ve[0], status: "invalid" });
      return;
    }
    setBusy(true);
    try {
      const r = toSafetyResult(await checkSafety(s));
      setErrors([]); setOut({ s, r });
      actions.setSystem(s, r);
      actions.logTest({
        module: "Banker's Safety",
        input: `${P} processes, ${R} resources, Avail=[${s.available.join(",")}]`,
        result: r.safe ? `Safe: ${r.sequence.map((i) => "P" + i).join("→")}` : `Unsafe: ${r.finish.filter((f) => !f).length} process(es) cannot finish`,
        status: r.safe ? "safe" : "unsafe",
      });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "The safety check could not be completed."]);
      setOut(null);
    } finally {
      setBusy(false);
    }
  };

  const loadSample = () => {
    setN(String(BANKER_SAMPLE.processes)); setM(String(BANKER_SAMPLE.resources));
    setAlloc(BANKER_SAMPLE.allocation); setMax(BANKER_SAMPLE.max); setAvail(BANKER_SAMPLE.available);
    setErrors([]); setOut(null);
  };

  return (
    <>
      <PageHeader icon={<ShieldCheck className="h-6 w-6" />} title="Banker's Safety Algorithm" subtitle="Enter the Allocation and Max matrices (one row per process, values separated by spaces) and the Available vector. The result becomes the current system shown on the Overview." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title="System input" className="xl:col-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Processes (n)"><input className={inputCls} type="number" min={1} value={n} onChange={(e) => setN(e.target.value)} /></Field>
              <Field label="Resource types (m)"><input className={inputCls} type="number" min={1} value={m} onChange={(e) => setM(e.target.value)} /></Field>
            </div>
            <Field label="Allocation matrix" hint="n rows × m columns"><textarea rows={5} className={textareaCls} value={alloc} onChange={(e) => setAlloc(e.target.value)} /></Field>
            <Field label="Max matrix" hint="n rows × m columns"><textarea rows={5} className={textareaCls} value={max} onChange={(e) => setMax(e.target.value)} /></Field>
            <Field label="Available vector" hint="m values"><input className={inputCls + " font-mono"} value={avail} onChange={(e) => setAvail(e.target.value)} /></Field>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={run} disabled={busy}><Play />{busy ? "Checking..." : "Run safety check"}</Button>
              <Button variant="outline" onClick={loadSample}><RotateCcw />Load textbook example</Button>
            </div>
          </div>
        </Panel>
        <div className="space-y-6 xl:col-span-3">
          {errors.length > 0 && (
            <Notice kind="danger">
              <p className="font-semibold">Please fix the input:</p>
              <ul className="list-disc pl-4 font-normal">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            </Notice>
          )}
          {!out && errors.length === 0 && <Notice kind="info">Run the safety check to see the Need matrix, safe sequence and diagram.</Notice>}
          {out && (
            <>
              <Notice kind={out.r.safe ? "success" : "warning"}>
                {out.r.safe ? (
                  <p>System is in a <b>SAFE</b> state. Safe sequence: <span className="font-mono">{out.r.sequence.map((i) => "P" + i).join(" → ")}</span></p>
                ) : (
                  <p>System is <b>UNSAFE</b>. Processes that cannot finish: <span className="font-mono">{out.r.finish.map((f, i) => (f ? null : "P" + i)).filter(Boolean).join(", ")}</span></p>
                )}
              </Notice>
              <div className="grid gap-4 md:grid-cols-2">
                <MatrixTable title="Need = Max − Allocation" data={out.r.need} highlight={(i) => (out.r.finish[i] ? undefined : "bg-warning-soft")} />
                <Panel title="Execution trace">
                  {out.r.steps.length === 0 ? <p className="text-sm text-muted-foreground">No process could run with the available resources.</p> : (
                    <ol className="space-y-2">
                      {out.r.steps.map((st, k) => (
                        <li key={k} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                          <span><span className="mr-2 text-muted-foreground">#{k + 1}</span><b className="text-primary">P{st.process}</b> finishes</span>
                          <span className="font-mono text-xs text-muted-foreground">Work = [{st.work.join(", ")}]</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Panel>
              </div>
              <Panel title="Allocation diagram">
                <ProcessDiagram allocation={out.s.allocation} request={out.r.need} statusOf={(i) => (out.r.finish[i] ? "safe" : "waiting")} />
              </Panel>
            </>
          )}
        </div>
      </div>
    </>
  );
}
