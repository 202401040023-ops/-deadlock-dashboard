// Resource-allocation-style diagram: processes on the left, resources on the right.
// Solid edges = allocation (resource → process); dashed edges = outstanding need/request (process → resource).
import { cn } from "@/lib/utils";

interface Props {
  allocation: number[][];
  request: number[][];
  statusOf: (i: number) => "safe" | "waiting" | "deadlock";
}

export function ProcessDiagram({ allocation, request, statusOf }: Props) {
  const n = allocation.length;
  const m = allocation[0]?.length ?? 0;
  const rowH = 56;
  const h = Math.max(n, m) * rowH + 20;
  const py = (i: number) => 10 + (i + 0.5) * ((h - 20) / n);
  const ry = (j: number) => 10 + (j + 0.5) * ((h - 20) / m);
  const fill = { safe: "var(--success)", waiting: "var(--warning)", deadlock: "var(--danger)" };
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 520 ${h}`} className="mx-auto w-full max-w-xl" role="img" aria-label="Process resource diagram">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--muted-foreground)" />
          </marker>
          <marker id="arrP" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" />
          </marker>
        </defs>
        {allocation.map((row, i) =>
          row.map((a, j) =>
            a > 0 ? (
              <g key={`a${i}${j}`}>
                <line x1={400} y1={ry(j)} x2={142} y2={py(i)} stroke="var(--primary)" strokeWidth={1 + Math.min(a, 4) * 0.6} markerEnd="url(#arrP)" opacity={0.75} />
              </g>
            ) : null,
          ),
        )}
        {request.map((row, i) =>
          row.map((r, j) =>
            r > 0 ? (
              <line key={`r${i}${j}`} x1={142} y1={py(i) + 6} x2={398} y2={ry(j) + 6} stroke="var(--muted-foreground)" strokeDasharray="5 4" strokeWidth={1.2} markerEnd="url(#arr)" opacity={0.6} />
            ) : null,
          ),
        )}
        {allocation.map((_, i) => (
          <g key={`p${i}`} className="transition-opacity hover:opacity-80">
            <circle cx={115} cy={py(i)} r={24} fill={fill[statusOf(i)]} />
            <text x={115} y={py(i) + 5} textAnchor="middle" className="fill-primary-foreground font-mono text-[13px] font-bold">P{i}</text>
          </g>
        ))}
        {Array.from({ length: m }, (_, j) => (
          <g key={`res${j}`}>
            <rect x={400} y={ry(j) - 20} width={48} height={40} rx={10} fill="var(--sidebar)" />
            <text x={424} y={ry(j) + 5} textAnchor="middle" className="fill-primary-foreground font-mono text-[13px] font-bold">R{j}</text>
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
        <Legend cls="bg-success" label="Can finish" />
        <Legend cls="bg-warning" label="Waiting" />
        <Legend cls="bg-danger" label="Deadlocked / blocked" />
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-primary" />Allocated</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-5 border-t border-dashed border-muted-foreground" />Needs / requests</span>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", cls)} />{label}</span>
  );
}
