import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldAlert, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Notice, PageHeader, Panel, textareaCls, inputCls } from "@/components/dash/ui";
import { parseMatrix, preventionVerdict, readDetectionInput, validateState, type PreventionFlags, type RecoveryStep, type SystemState } from "@/lib/deadlock";
import { detectDeadlock, recoverProcess, validateResourceOrder, type PreventionApiResult } from "@/lib/api";
import { actions } from "@/lib/store";
import { DETECTION_SAMPLE } from "@/lib/samples";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prevention")({
  head: () => ({
    meta: [
      { title: "Prevention and Recovery — Deadlock Lab" },
      { name: "description", content: "Coffman conditions analysis and recovery by process termination." },
      { property: "og:title", content: "Prevention and Recovery — Deadlock Lab" },
      { property: "og:description", content: "Coffman conditions analysis and recovery by process termination." },
    ],
  }),
  component: PreventionPage,
});

const CONDITIONS: { key: keyof PreventionFlags; label: string; fix: string }[] = [
  { key: "mutualExclusion", label: "Mutual exclusion", fix: "Make resources sharable where possible (e.g. read-only files, spooling)." },
  { key: "holdAndWait", label: "Hold and wait", fix: "Require processes to request all resources at once, or release before requesting." },
  { key: "noPreemption", label: "No preemption", fix: "Allow the OS to preempt resources from waiting processes." },
  { key: "circularWait", label: "Circular wait", fix: "Impose a total ordering on resource types and request in increasing order." },
];

function PreventionPage() {
  const [flags, setFlags] = useState<PreventionFlags>({ mutualExclusion: true, holdAndWait: true, noPreemption: true, circularWait: true });
  const v = preventionVerdict(flags);

  const [n, setN] = useState("5"); const [m, setM] = useState("3");
  const [alloc, setAlloc] = useState(DETECTION_SAMPLE.allocation);
  const [req, setReq] = useState(DETECTION_SAMPLE.request);
  const [maximum, setMaximum] = useState(DETECTION_SAMPLE.maximum);
  const [avail, setAvail] = useState(DETECTION_SAMPLE.available);
  const [errors, setErrors] = useState<string[]>([]);
  const [steps, setSteps] = useState<RecoveryStep[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [resourceOrder, setResourceOrder] = useState("R0, R1, R2");
  const [acquisition, setAcquisition] = useState("R0, R1, R2");
  const [orderResult, setOrderResult] = useState<PreventionApiResult | null>(null);
  const [orderError, setOrderError] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);

  const logPrevention = () =>
    actions.logTest({
      module: "Prevention",
      input: CONDITIONS.map((c) => `${c.label[0] ?? ""}${c.label.split(" ")[1]?.[0] ?? ""}=${flags[c.key] ? "Y" : "N"}`).join(" "),
      result: v.possible ? "All 4 Coffman conditions hold — deadlock possible" : `Prevented by breaking ${v.broken.length} condition(s)`,
      status: v.possible ? "unsafe" : "safe",
    });

  const recover = async () => {
    const d = readDetectionInput(n, m, alloc, req, avail);
    if (Array.isArray(d)) {
      setErrors(d); setSteps(null);
      actions.logTest({ module: "Recovery", input: `${n}×${m}`, result: d[0], status: "invalid" });
      return;
    }
    const max = parseMatrix(maximum, d.processes, d.resources, "Maximum");
    if (typeof max === "string") {
      setErrors([max]); setSteps(null);
      return;
    }
    const system: SystemState = { processes: d.processes, resources: d.resources, allocation: d.allocation, max, available: d.available };
    const validationErrors = validateState(system);
    if (validationErrors.length) {
      setErrors(validationErrors); setSteps(null);
      return;
    }

    setBusy(true);
    setErrors([]);
    try {
      let allocation = d.allocation.map((row) => [...row]);
      const request = d.request.map((row) => [...row]);
      let available = [...d.available];
      const currentMaximum = max.map((row) => [...row]);
      let detection = await detectDeadlock({ ...d, allocation, request, available });
      const recoverySteps: RecoveryStep[] = [];

      for (let count = 0; count < d.processes && detection.deadlocked; count++) {
        const victim = [...detection.unfinished_processes].sort(
          (a, b) => allocation[b].reduce((sum, value) => sum + value, 0) - allocation[a].reduce((sum, value) => sum + value, 0),
        )[0];
        const result = await recoverProcess(
          { ...system, allocation, max: currentMaximum, available },
          victim,
        );
        allocation = result.allocation_after;
        available = result.available_after;
        currentMaximum[victim] = currentMaximum[victim].map(() => 0);
        request[victim] = request[victim].map(() => 0);
        detection = await detectDeadlock({ ...d, allocation, request, available });
        recoverySteps.push({ terminated: victim, released: result.released_resources, remaining: detection.unfinished_processes });
      }

      if (detection.deadlocked) throw new Error("Recovery stopped before all detected processes were cleared.");
      setSteps(recoverySteps);
      actions.logTest({
        module: "Recovery",
        input: `${d.processes} processes`,
        result: recoverySteps.length ? `Terminated ${recoverySteps.map((step) => "P" + step.terminated).join(", ")} to resolve deadlock` : "No deadlock — nothing to recover",
        status: recoverySteps.length ? "deadlock" : "safe",
      });
    } catch (error) {
      setSteps(null);
      setErrors([error instanceof Error ? error.message : "Recovery could not be completed."]);
    } finally {
      setBusy(false);
    }
  };

  const checkOrder = async () => {
    const split = (value: string) => value.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
    const order = split(resourceOrder);
    const sequence = split(acquisition);
    if (!order.length || !sequence.length) {
      setOrderError("Enter both a resource order and an acquisition sequence.");
      setOrderResult(null);
      return;
    }
    setOrderBusy(true);
    setOrderError("");
    try {
      const result = await validateResourceOrder(order, sequence);
      setOrderResult(result);
      actions.logTest({
        module: "Resource Ordering",
        input: sequence.join(" → "),
        result: result.explanation,
        status: result.valid ? "safe" : "unsafe",
      });
    } catch (error) {
      setOrderResult(null);
      setOrderError(error instanceof Error ? error.message : "Resource order validation could not be completed.");
    } finally {
      setOrderBusy(false);
    }
  };

  return (
    <>
      <PageHeader icon={<ShieldAlert className="h-6 w-6" />} title="Prevention and Recovery" subtitle="Prevent deadlock by breaking at least one Coffman condition, or recover from one by terminating processes." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Prevention: Coffman conditions">
          <div className="grid gap-3 sm:grid-cols-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.key}
                onClick={() => setFlags((f) => ({ ...f, [c.key]: !f[c.key] }))}
                className={cn("rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5", flags[c.key] ? "border-danger/30 bg-danger-soft" : "border-success/30 bg-success-soft")}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{c.label}</span>
                  <span className={cn("text-xs font-bold", flags[c.key] ? "text-danger" : "text-success")}>{flags[c.key] ? "HOLDS" : "BROKEN"}</span>
                </div>
                {!flags[c.key] && <p className="mt-2 text-xs text-muted-foreground">{c.fix}</p>}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <Notice kind={v.possible ? "warning" : "success"}>
              {v.possible ? "All four conditions hold — deadlock is possible. Click a condition to break it." : `Deadlock prevented: ${v.broken.length} condition(s) broken.`}
            </Notice>
            <Button variant="outline" onClick={logPrevention}>Record this analysis</Button>
          </div>
        </Panel>

        <Panel title="Recovery: terminate processes">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Processes"><input className={inputCls} type="number" value={n} onChange={(e) => setN(e.target.value)} /></Field>
              <Field label="Resources"><input className={inputCls} type="number" value={m} onChange={(e) => setM(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Allocation"><textarea rows={5} className={textareaCls} value={alloc} onChange={(e) => setAlloc(e.target.value)} /></Field>
              <Field label="Request"><textarea rows={5} className={textareaCls} value={req} onChange={(e) => setReq(e.target.value)} /></Field>
            </div>
            <Field label="Maximum claim" hint="Used by the backend to verify safety after each process termination"><textarea rows={5} className={textareaCls} value={maximum} onChange={(e) => setMaximum(e.target.value)} /></Field>
            <Field label="Available"><input className={inputCls + " font-mono"} value={avail} onChange={(e) => setAvail(e.target.value)} /></Field>
            <Button onClick={recover} disabled={busy}><Skull />{busy ? "Recovering..." : "Detect and recover"}</Button>
            {errors.length > 0 && <Notice kind="danger"><ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul></Notice>}
            {steps && steps.length === 0 && <Notice kind="success">No deadlock found — no process needs to be terminated.</Notice>}
            {steps && steps.length > 0 && (
              <ol className="space-y-2">
                {steps.map((s, k) => (
                  <li key={k} className="rounded-lg bg-muted px-3 py-2 text-sm">
                    <b className="text-danger">Terminate P{s.terminated}</b> → releases <span className="font-mono">[{s.released.join(", ")}]</span>.{" "}
                    {s.remaining.length ? <>Still deadlocked: <span className="font-mono">{s.remaining.map((i) => "P" + i).join(", ")}</span></> : <span className="font-semibold text-success">Deadlock resolved.</span>}
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-muted-foreground">Detection and termination recovery are performed by the Python API. The process holding the most resources is selected first.</p>
          </div>
        </Panel>
      </div>
      <Panel title="Prevention: global resource ordering" className="mt-6">
        <p className="mb-4 text-sm text-muted-foreground">Validate an acquisition sequence against the configured global order using the backend prevention endpoint.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Global resource order" hint="Comma- or space-separated resource names"><input className={inputCls} value={resourceOrder} onChange={(e) => setResourceOrder(e.target.value)} /></Field>
          <Field label="Acquisition sequence" hint="The order in which resources are acquired"><input className={inputCls} value={acquisition} onChange={(e) => setAcquisition(e.target.value)} /></Field>
        </div>
        <div className="mt-3"><Button onClick={checkOrder} disabled={orderBusy}>{orderBusy ? "Checking..." : "Validate resource order"}</Button></div>
        {orderError && <div className="mt-3"><Notice kind="danger">{orderError}</Notice></div>}
        {orderResult && <div className="mt-3"><Notice kind={orderResult.valid ? "success" : "warning"}>{orderResult.explanation}</Notice></div>}
      </Panel>
    </>
  );
}
