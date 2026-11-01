// Pure OS deadlock algorithms. No UI code here.
export type Matrix = number[][];
export type Vector = number[];

export interface SystemState {
  processes: number;
  resources: number;
  allocation: Matrix;
  max: Matrix;
  available: Vector;
}

export interface SafetyStep {
  process: number;
  work: Vector; // work after this process finishes
}

export interface SafetyResult {
  safe: boolean;
  sequence: number[];
  steps: SafetyStep[];
  need: Matrix;
  finish: boolean[];
}

export const zeros = (r: number, c: number): Matrix =>
  Array.from({ length: r }, () => Array(c).fill(0));

export function computeNeed(s: SystemState): Matrix {
  return s.max.map((row, i) => row.map((m, j) => m - s.allocation[i][j]));
}

/** Validates matrices. Returns a list of human-readable problems (empty = valid). */
export function validateState(s: SystemState): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(s.processes) || s.processes < 1) errs.push("Number of processes must be at least 1.");
  if (!Number.isInteger(s.resources) || s.resources < 1) errs.push("Number of resource types must be at least 1.");
  const check = (v: number, label: string) => {
    if (!Number.isFinite(v) || !Number.isInteger(v)) errs.push(`${label} must be a whole number.`);
    else if (v < 0) errs.push(`${label} cannot be negative.`);
  };
  s.available.forEach((v, j) => check(v, `Available[R${j}]`));
  for (let i = 0; i < s.processes; i++)
    for (let j = 0; j < s.resources; j++) {
      check(s.allocation[i]?.[j], `Allocation[P${i}][R${j}]`);
      check(s.max[i]?.[j], `Max[P${i}][R${j}]`);
      if (s.allocation[i]?.[j] > s.max[i]?.[j])
        errs.push(`P${i} allocation of R${j} (${s.allocation[i][j]}) exceeds its maximum (${s.max[i][j]}).`);
    }
  return errs;
}

/** Banker's safety algorithm. */
export function safety(s: SystemState): SafetyResult {
  const need = computeNeed(s);
  const work = [...s.available];
  const finish = Array(s.processes).fill(false);
  const sequence: number[] = [];
  const steps: SafetyStep[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let i = 0; i < s.processes; i++) {
      if (!finish[i] && need[i].every((n, j) => n <= work[j])) {
        for (let j = 0; j < s.resources; j++) work[j] += s.allocation[i][j];
        finish[i] = true;
        sequence.push(i);
        steps.push({ process: i, work: [...work] });
        progressed = true;
      }
    }
  }
  return { safe: finish.every(Boolean), sequence, steps, need, finish };
}

export type RequestOutcome =
  | { status: "invalid"; message: string }
  | { status: "wait"; message: string }
  | { status: "denied"; message: string; result: SafetyResult }
  | { status: "granted"; message: string; result: SafetyResult; newState: SystemState };

/** Resource-request algorithm: checks request ≤ need, request ≤ available, then pretends to allocate. */
export function requestResources(s: SystemState, p: number, req: Vector): RequestOutcome {
  if (p < 0 || p >= s.processes) return { status: "invalid", message: `Process P${p} does not exist.` };
  if (req.some((r) => !Number.isInteger(r) || r < 0))
    return { status: "invalid", message: "Request values must be non-negative whole numbers." };
  if (req.every((r) => r === 0)) return { status: "invalid", message: "Request is all zeros — nothing to allocate." };
  const need = computeNeed(s);
  const overNeed = req.findIndex((r, j) => r > need[p][j]);
  if (overNeed >= 0)
    return { status: "invalid", message: `Error: P${p} requested ${req[overNeed]} of R${overNeed} but its remaining need is only ${need[p][overNeed]}.` };
  const overAvail = req.findIndex((r, j) => r > s.available[j]);
  if (overAvail >= 0)
    return { status: "wait", message: `P${p} must wait: only ${s.available[overAvail]} of R${overAvail} available, requested ${req[overAvail]}.` };
  const trial: SystemState = {
    ...s,
    available: s.available.map((a, j) => a - req[j]),
    allocation: s.allocation.map((row, i) => (i === p ? row.map((a, j) => a + req[j]) : [...row])),
    max: s.max.map((r) => [...r]),
  };
  const result = safety(trial);
  if (result.safe)
    return { status: "granted", message: `Request granted. Safe sequence: ${result.sequence.map((x) => "P" + x).join(" → ")}`, result, newState: trial };
  return { status: "denied", message: `Request denied: granting it would leave the system in an unsafe state. P${p} must wait.`, result };
}

export interface DetectionInput {
  processes: number;
  resources: number;
  allocation: Matrix;
  request: Matrix;
  available: Vector;
}

export interface DetectionResult {
  deadlocked: number[];
  finishOrder: number[];
  finish: boolean[];
}

/** Deadlock detection algorithm (multiple instances per resource type). */
export function detect(d: DetectionInput): DetectionResult {
  const work = [...d.available];
  const finish = d.allocation.map((row) => row.every((a) => a === 0));
  const finishOrder: number[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (let i = 0; i < d.processes; i++) {
      if (!finish[i] && d.request[i].every((r, j) => r <= work[j])) {
        for (let j = 0; j < d.resources; j++) work[j] += d.allocation[i][j];
        finish[i] = true;
        finishOrder.push(i);
        progressed = true;
      }
    }
  }
  return { deadlocked: finish.map((f, i) => (f ? -1 : i)).filter((i) => i >= 0), finishOrder, finish };
}

export interface RecoveryStep {
  terminated: number;
  released: Vector;
  remaining: number[];
}

/** Recovery by terminating deadlocked processes one at a time (largest allocation first) until no deadlock. */
export function recoverByTermination(d: DetectionInput): { steps: RecoveryStep[]; terminated: number[] } {
  let cur: DetectionInput = { ...d, allocation: d.allocation.map((r) => [...r]), request: d.request.map((r) => [...r]), available: [...d.available] };
  const steps: RecoveryStep[] = [];
  const terminated: number[] = [];
  let res = detect(cur);
  while (res.deadlocked.length > 0) {
    const victim = [...res.deadlocked].sort(
      (a, b) => cur.allocation[b].reduce((x, y) => x + y, 0) - cur.allocation[a].reduce((x, y) => x + y, 0),
    )[0];
    const released = [...cur.allocation[victim]];
    cur = {
      ...cur,
      available: cur.available.map((a, j) => a + released[j]),
      allocation: cur.allocation.map((r, i) => (i === victim ? r.map(() => 0) : r)),
      request: cur.request.map((r, i) => (i === victim ? r.map(() => 0) : r)),
    };
    terminated.push(victim);
    res = detect(cur);
    steps.push({ terminated: victim, released, remaining: res.deadlocked });
  }
  return { steps, terminated };
}

/** Coffman conditions check for prevention analysis. */
export interface PreventionFlags {
  mutualExclusion: boolean;
  holdAndWait: boolean;
  noPreemption: boolean;
  circularWait: boolean;
}

export function preventionVerdict(f: PreventionFlags) {
  const broken = Object.entries(f).filter(([, v]) => !v).map(([k]) => k);
  return { possible: broken.length === 0, broken };
}

/** Parse a whitespace/comma separated matrix text. Returns error string on failure. */
export function parseMatrix(text: string, rows: number, cols: number, label: string): Matrix | string {
  const lines = text.trim().split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length !== rows) return `${label}: expected ${rows} rows, got ${lines.length}.`;
  const m: Matrix = [];
  for (let i = 0; i < rows; i++) {
    const parts = lines[i].split(/[\s,]+/).filter(Boolean);
    if (parts.length !== cols) return `${label} row ${i + 1}: expected ${cols} values, got ${parts.length}.`;
    const nums = parts.map(Number);
    if (nums.some((n) => !Number.isInteger(n) || n < 0)) return `${label} row ${i + 1}: values must be non-negative whole numbers.`;
    m.push(nums);
  }
  return m;
}

export function parseVector(text: string, cols: number, label: string): Vector | string {
  const parts = text.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length !== cols) return `${label}: expected ${cols} values, got ${parts.length}.`;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isInteger(n) || n < 0)) return `${label}: values must be non-negative whole numbers.`;
  return nums;
}

export const matrixToText = (m: Matrix) => m.map((r) => r.join(" ")).join("\n");

export function readDetectionInput(n: string, m: string, alloc: string, req: string, avail: string): DetectionInput | string[] {
  const P = Number(n), R = Number(m);
  if (!Number.isInteger(P) || P < 1 || !Number.isInteger(R) || R < 1) return ["Processes and resource types must be whole numbers ≥ 1."];
  const a = parseMatrix(alloc, P, R, "Allocation");
  const r = parseMatrix(req, P, R, "Request");
  const v = parseVector(avail, R, "Available");
  const errs = [a, r, v].filter((t): t is string => typeof t === "string");
  if (errs.length) return errs;
  return { processes: P, resources: R, allocation: a as number[][], request: r as number[][], available: v as number[] };
}

