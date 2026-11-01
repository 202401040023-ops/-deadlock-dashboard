// Boundary/edge-case test suite. Each case runs the real algorithm and compares to the expected textbook outcome.
import { detect, requestResources, safety, validateState, type SystemState } from "./deadlock";
import { ApiRequestError, checkSafety, detectDeadlock, submitResourceRequest } from "./api";

export interface BoundaryCase {
  name: string;
  description: string;
  expected: string;
  run: () => string; // returns actual outcome label
  runApi: () => Promise<string>;
}

const sys = (alloc: number[][], max: number[][], avail: number[]): SystemState => ({
  processes: alloc.length, resources: avail.length, allocation: alloc, max, available: avail,
});

const textbook = sys([[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]], [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]], [3,3,2]);
const apiTextbook = { allocation: textbook.allocation, maximum: textbook.max, available: textbook.available };
const apiSafety = async (allocation: number[][], maximum: number[][], available: number[]) =>
  (await checkSafety({ processes: allocation.length, resources: available.length, allocation, max: maximum, available })).safe ? "safe" : "unsafe";
const apiRequest = async (allocation: number[][], maximum: number[][], available: number[], processId: number, request: number[]) => {
  const result = await submitResourceRequest({ processes: allocation.length, resources: available.length, allocation, max: maximum, available }, processId, request);
  return ({ "INVALID REQUEST": "invalid", "WAITING/DEFERRED": "wait", GRANTED: "granted", DENIED: "denied" } as const)[result.status];
};
const apiDetection = async (allocation: number[][], request: number[][], available: number[]) =>
  (await detectDeadlock({ processes: allocation.length, resources: available.length, allocation, request, available })).deadlocked ? "deadlock" : "no-deadlock";
const invalidApiInput = async (operation: () => Promise<unknown>) => {
  try {
    await operation();
    return "valid";
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 422) return "invalid";
    throw error;
  }
};

export const BOUNDARY_CASES: BoundaryCase[] = [
  { name: "Textbook safe state", description: "Silberschatz 5×3 example", expected: "safe", run: () => (safety(textbook).safe ? "safe" : "unsafe"), runApi: () => apiSafety(apiTextbook.allocation, apiTextbook.maximum, apiTextbook.available) },
  { name: "Single process, zero need", description: "1 process already holds its max", expected: "safe", run: () => (safety(sys([[2]], [[2]], [0])).safe ? "safe" : "unsafe"), runApi: () => apiSafety([[2]], [[2]], [0]) },
  { name: "Zero available, all need > 0", description: "No process can start", expected: "unsafe", run: () => (safety(sys([[1,0],[0,1]], [[2,1],[1,2]], [0,0])).safe ? "safe" : "unsafe"), runApi: () => apiSafety([[1,0],[0,1]], [[2,1],[1,2]], [0,0]) },
  { name: "Allocation exceeds max", description: "Invalid input must be rejected", expected: "invalid", run: () => (validateState(sys([[3]], [[2]], [1])).length ? "invalid" : "valid"), runApi: () => invalidApiInput(() => checkSafety({ processes: 1, resources: 1, allocation: [[3]], max: [[2]], available: [1] })) },
  { name: "Negative available", description: "Invalid input must be rejected", expected: "invalid", run: () => (validateState(sys([[0]], [[1]], [-1])).length ? "invalid" : "valid"), runApi: () => invalidApiInput(() => checkSafety({ processes: 1, resources: 1, allocation: [[0]], max: [[1]], available: [-1] })) },
  { name: "Request > need", description: "P1 requests more than declared", expected: "invalid", run: () => requestResources(textbook, 1, [5,0,0]).status, runApi: () => apiRequest(apiTextbook.allocation, apiTextbook.maximum, apiTextbook.available, 1, [5,0,0]) },
  { name: "Request > available", description: "P0 requests 4 of R0 (only 3 free)", expected: "wait", run: () => requestResources(textbook, 0, [4,0,0]).status, runApi: () => apiRequest(apiTextbook.allocation, apiTextbook.maximum, apiTextbook.available, 0, [4,0,0]) },
  { name: "Safe request granted", description: "P1 requests (1,0,2)", expected: "granted", run: () => requestResources(textbook, 1, [1,0,2]).status, runApi: () => apiRequest(apiTextbook.allocation, apiTextbook.maximum, apiTextbook.available, 1, [1,0,2]) },
  { name: "Unsafe request denied", description: "P0 requests (0,2,0) after P1 grant", expected: "denied", run: () => {
    const g = requestResources(textbook, 1, [1,0,2]);
    return g.status === "granted" ? requestResources(g.newState, 0, [0,2,0]).status : "setup-failed";
  }, runApi: async () => {
    const granted = await submitResourceRequest({ processes: 5, resources: 3, allocation: apiTextbook.allocation, max: apiTextbook.maximum, available: apiTextbook.available }, 1, [1,0,2]);
    return apiRequest(granted.after.allocation, apiTextbook.maximum, granted.after.available, 0, [0,2,0]);
  } },
  { name: "Request exactly equals need", description: "P3 requests its full remaining need (0,1,1)", expected: "granted", run: () => requestResources(textbook, 3, [0,1,1]).status, runApi: () => apiRequest(apiTextbook.allocation, apiTextbook.maximum, apiTextbook.available, 3, [0,1,1]) },
  { name: "Detection: no deadlock", description: "Textbook detection, Available (0,0,0)", expected: "no-deadlock", run: () => (detect({ processes: 5, resources: 3, allocation: [[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]], request: [[0,0,0],[2,0,2],[0,0,0],[1,0,0],[0,0,2]], available: [0,0,0] }).deadlocked.length ? "deadlock" : "no-deadlock"), runApi: () => apiDetection([[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]], [[0,0,0],[2,0,2],[0,0,0],[1,0,0],[0,0,2]], [0,0,0]) },
  { name: "Detection: deadlock P1–P4", description: "P2 requests one more R2", expected: "deadlock", run: () => (detect({ processes: 5, resources: 3, allocation: [[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]], request: [[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]], available: [0,0,0] }).deadlocked.length ? "deadlock" : "no-deadlock"), runApi: () => apiDetection([[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]], [[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]], [0,0,0]) },
  { name: "Detection: idle processes", description: "No allocation, no requests", expected: "no-deadlock", run: () => (detect({ processes: 2, resources: 1, allocation: [[0],[0]], request: [[0],[0]], available: [0] }).deadlocked.length ? "deadlock" : "no-deadlock"), runApi: () => apiDetection([[0],[0]], [[0],[0]], [0]) },
  { name: "Two-process circular wait", description: "P0 holds R0 wants R1; P1 holds R1 wants R0", expected: "deadlock", run: () => (detect({ processes: 2, resources: 2, allocation: [[1,0],[0,1]], request: [[0,1],[1,0]], available: [0,0] }).deadlocked.length ? "deadlock" : "no-deadlock"), runApi: () => apiDetection([[1,0],[0,1]], [[0,1],[1,0]], [0,0]) },
];
