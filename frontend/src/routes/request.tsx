import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, MatrixTable, Notice, PageHeader, Panel, inputCls } from "@/components/dash/ui";
import { computeNeed, parseVector, type RequestOutcome } from "@/lib/deadlock";
import { submitResourceRequest, toSafetyResult } from "@/lib/api";
import { actions, useDashboard } from "@/lib/store";

export const Route = createFileRoute("/request")({
  head: () => ({
    meta: [
      { title: "Resource Request — Deadlock Lab" },
      { name: "description", content: "Simulate a process requesting resources using the Banker's request algorithm." },
      { property: "og:title", content: "Resource Request — Deadlock Lab" },
      { property: "og:description", content: "Simulate a process requesting resources using the Banker's request algorithm." },
    ],
  }),
  component: RequestPage,
});

function RequestPage() {
  const { system } = useDashboard();
  const [p, setP] = useState("1");
  const [req, setReq] = useState("1 0 2");
  const [out, setOut] = useState<RequestOutcome | null>(null);
  const [commit, setCommit] = useState(true);
  const [apiError, setApiError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!system)
    return (
      <>
        <PageHeader icon={<SendHorizonal className="h-6 w-6" />} title="Resource Request" subtitle="Test whether granting a request keeps the system safe." />
        <Notice kind="info">
          No system loaded yet. Define one on the <Link to="/bankers" className="font-semibold underline">Banker's Safety Algorithm</Link> page first.
        </Notice>
      </>
    );

  const run = async () => {
    const pi = Number(p);
    const v = parseVector(req, system.resources, "Request");
    let o: RequestOutcome;
    if (!Number.isInteger(pi) || p.trim() === "") o = { status: "invalid", message: "Process number must be a whole number." };
    else if (pi < 0 || pi >= system.processes) o = { status: "invalid", message: `Process number must be between 0 and ${system.processes - 1}.` };
    else if (typeof v === "string") o = { status: "invalid", message: v };
    else {
      setBusy(true);
      setApiError("");
      try {
        const response = await submitResourceRequest(system, pi, v);
        const safety = response.safety_check ? toSafetyResult(response.safety_check) : undefined;
        if (response.status === "GRANTED" && safety) {
          o = {
            status: "granted",
            message: response.reason,
            result: safety,
            newState: { ...system, allocation: response.after.allocation, available: response.after.available },
          };
        } else if (response.status === "DENIED" && safety) {
          o = { status: "denied", message: response.reason, result: safety };
        } else if (response.status === "WAITING/DEFERRED") {
          o = { status: "wait", message: response.reason };
        } else {
          o = { status: "invalid", message: response.reason };
        }
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "The resource request could not be completed.");
        setOut(null);
        return;
      } finally {
        setBusy(false);
      }
    }
    setOut(o);
    setApiError("");
    if (o.status === "granted" && commit) actions.setSystem(o.newState, o.result);
    actions.logTest({
      module: "Resource Request",
      input: `P${p} requests [${req.trim().split(/[\s,]+/).join(",")}]`,
      result: o.message,
      status: o.status === "granted" ? "granted" : o.status === "invalid" ? "invalid" : o.status === "wait" ? "waiting" : "unsafe",
    });
  };

  const kind = !out ? "info" : out.status === "granted" ? "success" : out.status === "invalid" ? "danger" : "warning";

  return (
    <>
      <PageHeader icon={<SendHorizonal className="h-6 w-6" />} title="Resource Request" subtitle="Runs the Banker's resource-request algorithm against the current system: Request ≤ Need, Request ≤ Available, then a safety check on the trial state." />
      <div className="grid gap-6 xl:grid-cols-5">
        <Panel title="New request" className="xl:col-span-2">
          <div className="space-y-4">
            <Field label="Process number" hint={`0 to ${system.processes - 1}`}><input className={inputCls} type="number" value={p} onChange={(e) => setP(e.target.value)} /></Field>
            <Field label="Request vector" hint={`${system.resources} values`}><input className={inputCls + " font-mono"} value={req} onChange={(e) => setReq(e.target.value)} /></Field>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={commit} onChange={(e) => setCommit(e.target.checked)} className="accent-primary" />
              Apply granted requests to the current system
            </label>
            <Button onClick={run} disabled={busy}><SendHorizonal />{busy ? "Submitting..." : "Submit request"}</Button>
          </div>
        </Panel>
        <div className="space-y-4 xl:col-span-3">
          <Notice kind={apiError ? "danger" : kind}>{apiError || (out ? out.message : "Submit a request to see whether it can be granted.")}</Notice>
          <div className="grid gap-4 md:grid-cols-2">
            <MatrixTable title="Current allocation" data={system.allocation} />
            <MatrixTable title="Current need" data={computeNeed(system)} />
          </div>
          <Panel>
            <p className="text-sm text-muted-foreground">Available: <span className="font-mono font-semibold text-foreground">[{system.available.join(", ")}]</span></p>
          </Panel>
        </div>
      </div>
    </>
  );
}
