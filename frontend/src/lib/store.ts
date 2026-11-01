// Shared dashboard state (current system + test log + AI usage), persisted to localStorage.
import { useSyncExternalStore } from "react";
import type { SafetyResult, SystemState } from "./deadlock";

export type TestStatus = "safe" | "unsafe" | "waiting" | "deadlock" | "granted" | "invalid" | "pass" | "fail";

export interface TestRecord {
  id: string;
  time: number;
  module: string;
  input: string;
  result: string;
  status: TestStatus;
}

export interface AiRecord {
  id: string;
  time: number;
  tool: string;
  purpose: string;
  verification: string;
}

interface State {
  system: SystemState | null;
  safetyResult: SafetyResult | null;
  tests: TestRecord[];
  ai: AiRecord[];
}

const KEY = "deadlock-dashboard-v1";
let state: State = { system: null, safetyResult: null, tests: [], ai: [] };
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch {
    /* ignore corrupt storage */
  }
}

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

const SERVER: State = { system: null, safetyResult: null, tests: [], ai: [] };

export function useDashboard() {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      l();
      return () => listeners.delete(l);
    },
    () => {
      load();
      return state;
    },
    () => SERVER,
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const actions = {
  setSystem(system: SystemState, safetyResult: SafetyResult) {
    set({ system, safetyResult });
  },
  logTest(t: Omit<TestRecord, "id" | "time">) {
    set({ tests: [{ ...t, id: uid(), time: Date.now() }, ...state.tests].slice(0, 200) });
  },
  clearTests() {
    set({ tests: [] });
  },
  addAi(a: Omit<AiRecord, "id" | "time">) {
    set({ ai: [{ ...a, id: uid(), time: Date.now() }, ...state.ai] });
  },
  removeAi(id: string) {
    set({ ai: state.ai.filter((a) => a.id !== id) });
  },
};
