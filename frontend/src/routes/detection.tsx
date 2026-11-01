import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GitBranch, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, MatrixTable, Notice, PageHeader, Panel, textareaCls, inputCls } from "@/components/dash/ui";
import { ProcessDiagram } from "@/components/dash/ProcessDiagram";
import { readDetectionInput, type DetectionInput, type DetectionResult } from "@/lib/deadlock";
import { detectDeadlock, detectWaitForCycle, type WaitForApiResult } from "@/lib/api";
import { actions } from "@/lib/store";
import { DETECTION_SAMPLE } from "@/lib/samples";

export const Route = createFileRoute("/detection")({
  head: () => ({
    meta: [
      { title: "Deadlock Detection — Deadlock Lab" },
      { name: "description", content: "Detect deadlocks with multiple-instance resource data or a single-instance wait-for graph." },
      { property: "og:title", content: "Deadlock Detection — Deadlock Lab" },
      { property: "og:description", content: "Detect deadlocks with multiple-instance resource data or a single-instance wait-for graph." },
    ],
  }),
  component: DetectionPage,
});

function DetectionPage() {
  const [mode, setMode] = useState<"multiple" | "single">("multiple");
  const [n, setN] = useState(String(DETECTION_SAMPLE.processes));
  const [m, setM] = useState(String(DETECTION_SAMPLE.resources));
  const [alloc, setAlloc] = useState(DETECTION_SAMPLE.allocation);
  const [req, setReq] = useState(DETECTION_SAMPLE.request);
  const [avail, setAvail] = useState(DETECTION_SAMPLE.available);
  const [errors, setErrors] = useState<string[]>([]);
  const [out, setOut] = useState<{ d: DetectionInput; r: DetectionResult } | null>(null);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState("");
  const [processNames, setProcessNames] = useState("P0, P1");
  const [waitEdges, setWaitEdges] = useState("P0, P1\nP1, P0");
  const [singleOut, setSingleOut] = useState<WaitForApiResult | null>(null);

  const runMultiple = async () => {
    setSingleOut(null);
    const d = readDetectionInput(n, m, alloc, req, avail);
    if (Array.isArray(d)) {
      setErrors(d); setOut(null);
      setApiError("");
      actions.logTest({ module: "Deadlock Detection", input: `${n}×${m}`, result: d[0], status: "invalid" });
      return;
    }
    setBusy(true);
    setApiError("");
    try {
      const response = await detectDeadlock(d);
      const r: DetectionResult = {
        deadlocked: response.unfinished_processes,
        finishOrder: response.completed_sequence,
        finish: Array.from({ length: d.processes }, (_, i) => !response.unfinished_processes.includes(i)),
      };
      setErrors([]); setOut({ d, r });
      actions.logTest({
        module: "Deadlock Detection",
        input: `${d.processes} processes, Avail=[${d.available.join(",")}]`,
        result: r.deadlocked.length ? `Deadlocked: ${r.deadlocked.map((i) => "P" + i).join(", ")}` : "No deadlock",
        status: r.deadlocked.length ? "deadlock" : "safe",
      });
    } catch (error) {
      setOut(null);
      setApiError(error instanceof Error ? error.message : "Deadlock detection could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const runSingle = async () => {
    setOut(null);
    const processes = processNames.split(/[,\s]+/).map((value) => value.trim()).filter(Boolean);
    const lines = waitEdges.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const waits: Array<[string, string]> = [];
    let malformedEdge = false;
    for (const line of lines) {
      const edge = line.split(/\s*(?:,|->)\s*/).filter(Boolean);
      if (edge.length !== 2) {
        malformedEdge = true;
        break;
      }
      waits.push([edge[0], edge[1]]);
    }
    if (!processes.length || malformedEdge) {
      const message = !processes.length ? "Enter at least one process name." : "Each wait edge must contain two process names separated by a comma or arrow.";
      setErrors([message]);
      setApiError("");
      setSingleOut(null);
      actions.logTest({ module: "Deadlock Detection", input: "Wait-for graph", result: message, status: "invalid" });
      return;
    }

    setBusy(true);
    setErrors([]);
    setApiError("");
    try {
      const response = await detectWaitForCycle(processes, waits);
      setSingleOut(response);
      actions.logTest({
        module: "Deadlock Detection",
        input: `Processes: ${processes.join(", ")}`,
        result: response.deadlocked ? `Cycle: ${response.cycle.join(" → ")}` : "No wait-for cycle",
        status: response.deadlocked ? "deadlock" : "safe",
      });
    } catch (error) {
      setSingleOut(null);
      setApiError(error instanceof Error ? error.message : "Wait-for graph detection could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const run = () => mode === "multiple" ? runMultiple() : runSingle();

  const changeMode = (next: "multiple" | "single") => {
    setMode(next);
    setErrors([]);
    setApiError("");
    setOut(null);
    setSingleOut(null);
  };

  return (
    <>
      <PageHeader icon={<GitBranch className="h-6 w-6" />} title="Deadlock Detection" subtitle="Use the multiple-instance detection model or check for a cycle in a single-instance wait-for graph." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title="Snapshot input" className="xl:col-span-2">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant={mode === "multiple" ? "default" : "outline"} onClick={() => changeMode("multiple")}>Multiple instances</Button>
              <Button variant={mode === "single" ? "default" : "outline"} onClick={() => changeMode("single")}>Single-instance graph</Button>
            </div>
            {mode === "single" ? (
              <>
                <Field label="Processes" hint="Comma- or space-separated names"><input className={inputCls} value={processNames} onChange={(e) => setProcessNames(e.target.value)} /></Field>
                <Field label="Wait edges" hint="One waiting-process, blocking-process pair per line"><textarea rows={5} className={textareaCls} value={waitEdges} onChange={(e) => setWaitEdges(e.target.value)} /></Field>
              </>
            ) : (
              <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Processes (n)"><input className={inputCls} type="number" value={n} onChange={(e) => setN(e.target.value)} /></Field>
              <Field label="Resource types (m)"><input className={inputCls} type="number" value={m} onChange={(e) => setM(e.target.value)} /></Field>
            </div>
            <Field label="Allocation matrix"><textarea rows={5} className={textareaCls} value={alloc} onChange={(e) => setAlloc(e.target.value)} /></Field>
            <Field label="Request matrix"><textarea rows={5} className={textareaCls} value={req} onChange={(e) => setReq(e.target.value)} /></Field>
            <Field label="Available vector"><input className={inputCls + " font-mono"} value={avail} onChange={(e) => setAvail(e.target.value)} /></Field>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={run} disabled={busy}><Play />{busy ? "Detecting..." : mode === "single" ? "Detect cycle" : "Detect deadlock"}</Button>
              {mode === "single" ? (
                <Button variant="outline" onClick={() => { setProcessNames("P0, P1"); setWaitEdges("P0, P1\nP1, P0"); setSingleOut(null); setErrors([]); setApiError(""); }}><RotateCcw />Load cycle example</Button>
              ) : (
                <Button variant="outline" onClick={() => { setN("5"); setM("3"); setAlloc(DETECTION_SAMPLE.allocation); setReq(DETECTION_SAMPLE.request); setAvail(DETECTION_SAMPLE.available); setOut(null); setErrors([]); setApiError(""); }}><RotateCcw />Load example</Button>
              )}
            </div>
          </div>
        </Panel>
        <div className="space-y-6 xl:col-span-3">
          {errors.length > 0 && <Notice kind="danger"><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
          {apiError && <Notice kind="danger">{apiError}</Notice>}
          {mode === "multiple" && !out && errors.length === 0 && <Notice kind="info">Run detection to see which processes are deadlocked.</Notice>}
          {mode === "single" && !singleOut && errors.length === 0 && <Notice kind="info">Run the wait-for graph check to look for a cycle.</Notice>}
          {mode === "single" && singleOut && (
            <>
              <Notice kind={singleOut.deadlocked ? "danger" : "success"}>
                {singleOut.deadlocked
                  ? <p><b>DEADLOCK detected.</b> Cycle: <span className="font-mono">{singleOut.cycle.join(" → ")}</span></p>
                  : <p><b>No cycle detected.</b> The wait-for graph does not show a deadlock.</p>}
              </Notice>
              <Panel title="Wait-for graph">
                <ul className="space-y-2 text-sm">
                  {Object.entries(singleOut.graph).map(([process, blockedBy]) => (
                    <li key={process} className="rounded-lg bg-muted px-3 py-2">
                      <b>{process}</b> waits for {blockedBy.length ? blockedBy.join(", ") : "no process"}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">{singleOut.assumption}</p>
              </Panel>
            </>
          )}
          {mode === "multiple" && out && (
            <>
              <Notice kind={out.r.deadlocked.length ? "danger" : "success"}>
                {out.r.deadlocked.length
                  ? <p><b>DEADLOCK detected.</b> Processes involved: <span className="font-mono">{out.r.deadlocked.map((i) => "P" + i).join(", ")}</span></p>
                  : <p><b>No deadlock.</b> Completion order: <span className="font-mono">{out.r.finishOrder.map((i) => "P" + i).join(" → ") || "all idle"}</span></p>}
              </Notice>
              <Panel title="Wait-for / allocation diagram">
                <ProcessDiagram allocation={out.d.allocation} request={out.d.request} statusOf={(i) => (out.r.finish[i] ? "safe" : "deadlock")} />
              </Panel>
              <div className="grid gap-4 md:grid-cols-2">
                <MatrixTable title="Allocation" data={out.d.allocation} highlight={(i) => (out.r.finish[i] ? undefined : "bg-danger-soft")} />
                <MatrixTable title="Request" data={out.d.request} highlight={(i) => (out.r.finish[i] ? undefined : "bg-danger-soft")} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
