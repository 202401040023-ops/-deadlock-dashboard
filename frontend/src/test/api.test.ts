import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, checkSafety, detectDeadlock, detectWaitForCycle, recoverProcess, submitResourceRequest, toSafetyResult, validateResourceOrder } from "@/lib/api";

const system = {
  processes: 1,
  resources: 1,
  allocation: [[0]],
  max: [[1]],
  available: [1],
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("deadlock API adapter", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends safety input in the Python API schema and adapts its result", async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      safe: true,
      status: "SAFE",
      allocation: [[0]],
      maximum: [[1]],
      need: [[1]],
      available: [1],
      initial_work: [1],
      finish: [true],
      safe_sequence: [0],
      partial_sequence: [0],
      trace: [{ process: 0, work_after: [1] }],
      explanation: "All processes can finish.",
    }));

    const response = await checkSafety(system);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/safety$/),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ allocation: [[0]], maximum: [[1]], available: [1] }),
      }),
    );
    expect(toSafetyResult(response)).toEqual({
      safe: true,
      sequence: [0],
      steps: [{ process: 0, work: [1] }],
      need: [[1]],
      finish: [true],
    });
  });

  it("keeps request, detection, and prevention endpoints on their existing paths", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ status: "WAITING/DEFERRED", granted: false, reason: "Wait", after: { allocation: [[0]], need: [[1]], available: [0] } }))
      .mockResolvedValueOnce(jsonResponse({ deadlocked: false, status: "NO DEADLOCK DETECTED", unfinished_processes: [], completed_sequence: [0], work_final: [1], trace: [], explanation: "No deadlock." }))
      .mockResolvedValueOnce(jsonResponse({ deadlocked: true, status: "DEADLOCKED", graph: { P0: ["P1"], P1: ["P0"] }, cycle: ["P0", "P1", "P0"], assumption: "Single instance." }))
      .mockResolvedValueOnce(jsonResponse({ status: "RECOVERY COMPLETE", terminated_process: 0, released_resources: [0], allocation_after: [[0]], available_after: [1], safety_after_recovery: {} }))
      .mockResolvedValueOnce(jsonResponse({ valid: true, status: "VALID ORDER", acquisition: ["R0"], violations: [], explanation: "Valid." }));

    await submitResourceRequest(system, 0, [1]);
    await detectDeadlock({ processes: 1, resources: 1, allocation: [[0]], request: [[0]], available: [1] });
    await detectWaitForCycle(["P0", "P1"], [["P0", "P1"], ["P1", "P0"]]);
    await recoverProcess(system, 0);
    await validateResourceOrder(["R0"], ["R0"]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/\/api\/request$/),
      expect.stringMatching(/\/api\/detection\/multiple$/),
      expect.stringMatching(/\/api\/detection\/single$/),
      expect.stringMatching(/\/api\/recovery$/),
      expect.stringMatching(/\/api\/prevention\/order$/),
    ]);
  });

  it("surfaces API validation responses with their status code", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "Allocation exceeds Maximum" }, 422));
    await expect(checkSafety(system)).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 422,
      message: "Allocation exceeds Maximum",
    });
  });

  it("reports connection failures without presenting fake results", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(checkSafety(system)).rejects.toThrow(/Could not connect to the deadlock API/);
  });
});
