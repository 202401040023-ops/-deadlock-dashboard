def safety(allocation: list[list[int]], maximum: list[list[int]], available: list[int]) -> dict:
    n, m = len(allocation), len(available)
    need = [[maximum[i][j] - allocation[i][j] for j in range(m)] for i in range(n)]
    work, finish, sequence, trace = available.copy(), [False] * n, [], []
    while True:
        chosen = next((i for i in range(n) if not finish[i] and all(need[i][j] <= work[j] for j in range(m))), None)
        if chosen is None: break
        before = work.copy()
        work = [work[j] + allocation[chosen][j] for j in range(m)]
        finish[chosen] = True; sequence.append(chosen)
        trace.append({"process": chosen, "work_before": before, "need": need[chosen], "released": allocation[chosen], "work_after": work.copy(), "explanation": f"P{chosen} can finish because Need[P{chosen}] <= Work; it releases its allocation."})
    safe = all(finish)
    partial = sequence.copy()
    return {"safe": safe, "status": "SAFE" if safe else "UNSAFE", "allocation": allocation, "maximum": maximum, "need": need, "available": available, "initial_work": available, "finish": finish, "safe_sequence": sequence if safe else [], "partial_sequence": partial, "trace": trace, "explanation": ("Every process can finish; the system is in a safe state." if safe else "No unfinished process can satisfy its remaining Need with current Work. The state is unsafe; this does not by itself prove deadlock.")}
