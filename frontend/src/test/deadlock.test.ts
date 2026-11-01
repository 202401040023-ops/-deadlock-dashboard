import { describe, it, expect } from "vitest";
import { BOUNDARY_CASES } from "@/lib/boundary";
import { safety } from "@/lib/deadlock";
describe("deadlock algorithms", () => {
  it("textbook safe sequence", () => {
    const r = safety({ processes: 5, resources: 3, allocation: [[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]], max: [[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]], available: [3,3,2] });
    expect(r.safe).toBe(true);
    expect(r.sequence).toEqual([1,3,4,0,2]);
  });
  for (const c of BOUNDARY_CASES) it(c.name, () => expect(c.run()).toBe(c.expected));
});
