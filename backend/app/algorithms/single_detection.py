def detect_wait_for_cycle(processes: list[str], waits: list[tuple[str,str]]) -> dict:
    graph = {p: [] for p in processes}
    for a,b in waits:
        if b not in graph[a]: graph[a].append(b)
    color, stack, cycle = {}, [], []
    def visit(node):
        nonlocal cycle
        color[node] = 1; stack.append(node)
        for nxt in graph[node]:
            if color.get(nxt,0) == 0:
                if visit(nxt): return True
            elif color.get(nxt) == 1:
                k = stack.index(nxt); cycle = stack[k:] + [nxt]; return True
        stack.pop(); color[node] = 2
        return False
    for p in processes:
        if color.get(p,0) == 0 and visit(p): break
    return {"deadlocked":bool(cycle),"status":"DEADLOCKED" if cycle else "NO DEADLOCK DETECTED","graph":graph,"cycle":cycle,"assumption":"This input is a wait-for graph (process → process), derived for single-instance resource types. A cycle is necessary and sufficient for deadlock in a single-instance model. A resource-allocation graph instead contains process and resource nodes; its cycle criterion is not generally sufficient when resource types have multiple instances."}
