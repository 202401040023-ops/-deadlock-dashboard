import type { DetectionInput, SafetyResult, SystemState } from "./deadlock";

const configuredBase = import.meta.env["VITE_API_BASE_URL"]?.trim().replace(/\/+$/, "");
const isLocalRuntime = import.meta.env.DEV || import.meta.env.MODE === "test";
const API_BASE_URL = isLocalRuntime ? "" : configuredBase;

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export interface SafetyApiResult {
  safe: boolean;
  status: string;
  allocation: number[][];
  maximum: number[][];
  need: number[][];
  available: number[];
  initial_work: number[];
  finish: boolean[];
  safe_sequence: number[];
  partial_sequence: number[];
  trace: Array<{ process: number; work_after: number[] }>;
  explanation: string;
}

export interface RequestApiResult {
  status: "INVALID REQUEST" | "WAITING/DEFERRED" | "DENIED" | "GRANTED";
  granted: boolean;
  reason: string;
  after: { allocation: number[][]; need: number[][]; available: number[] };
  safe_sequence?: number[];
  safety_check?: SafetyApiResult;
}

export interface DetectionApiResult {
  deadlocked: boolean;
  status: string;
  unfinished_processes: number[];
  completed_sequence: number[];
  work_final: number[];
  trace: Array<{ process: number; work_after: number[] }>;
  explanation: string;
}

export interface WaitForApiResult {
  deadlocked: boolean;
  status: string;
  graph: Record<string, string[]>;
  cycle: string[];
  assumption: string;
}

export interface RecoveryApiResult {
  status: string;
  terminated_process: number;
  released_resources: number[];
  allocation_after: number[][];
  available_after: number[];
  safety_after_recovery: SafetyApiResult;
}

export interface PreventionApiResult {
  valid: boolean;
  status: string;
  acquisition: string[];
  violations: Array<{ from: string; to: string }>;
  explanation: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  if (!API_BASE_URL && !isLocalRuntime) {
    throw new Error("VITE_API_BASE_URL is not configured for this deployment.");
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(`Could not connect to the deadlock API at ${API_BASE_URL}. Check that the backend is running and CORS allows this frontend origin.`);
  }

  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    throw new Error(`The deadlock API returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? data.detail
        : undefined;
    const message = typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : `Request failed (${response.status}).`;
    throw new ApiRequestError(message, response.status);
  }
  if (data === null) throw new Error("The deadlock API returned an empty response.");
  return data as T;
}

export function checkSafety(system: SystemState) {
  return post<SafetyApiResult>("/api/safety", {
    allocation: system.allocation,
    maximum: system.max,
    available: system.available,
  });
}

export function submitResourceRequest(system: SystemState, processId: number, request: number[]) {
  return post<RequestApiResult>("/api/request", {
    allocation: system.allocation,
    maximum: system.max,
    available: system.available,
    process_id: processId,
    request,
  });
}

export function detectDeadlock(input: DetectionInput) {
  return post<DetectionApiResult>("/api/detection/multiple", {
    allocation: input.allocation,
    request: input.request,
    available: input.available,
  });
}

export function detectWaitForCycle(processes: string[], waits: Array<[string, string]>) {
  return post<WaitForApiResult>("/api/detection/single", { processes, waits });
}

export function recoverProcess(system: SystemState, processId: number) {
  return post<RecoveryApiResult>("/api/recovery", {
    allocation: system.allocation,
    maximum: system.max,
    available: system.available,
    process_id: processId,
  });
}

export function validateResourceOrder(resourceOrder: string[], acquisition: string[]) {
  return post<PreventionApiResult>("/api/prevention/order", {
    resource_order: resourceOrder,
    acquisition,
  });
}

export function toSafetyResult(result: SafetyApiResult): SafetyResult {
  return {
    safe: result.safe,
    sequence: result.safe ? result.safe_sequence : result.partial_sequence,
    steps: result.trace.map(({ process, work_after }) => ({ process, work: work_after })),
    need: result.need,
    finish: result.finish,
  };
}
