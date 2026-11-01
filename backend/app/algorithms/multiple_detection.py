def detect_multiple(allocation: list[list[int]], request: list[list[int]], available: list[int]) -> dict:
    n, m = len(allocation), len(available)
    work = available.copy()
    # Standard detection initialization: processes with zero allocation are marked finish=True.
    finish = [all(x == 0 for x in allocation[i]) for i in range(n)]
    completed, trace = [], []
    while True:
        p = next((i for i in range(n) if not finish[i] and all(request[i][j] <= work[j] for j in range(m))), None)
        if p is None: break
        before = work.copy(); work = [work[j] + allocation[p][j] for j in range(m)]
        finish[p] = True; completed.append(p)
        trace.append({"process":p,"work_before":before,"request":request[p],"released":allocation[p],"work_after":work.copy(),"explanation":f"P{p}'s outstanding Request is satisfiable; assume it completes and releases its allocation."})
    deadlocked = [i for i, done in enumerate(finish) if not done]
    return {"deadlocked":bool(deadlocked),"status":"DEADLOCKED" if deadlocked else "NO DEADLOCK DETECTED","unfinished_processes":deadlocked,"completed_sequence":completed,"work_final":work,"finish":finish,"trace":trace,"explanation":("Processes " + ", ".join(f"P{i}" for i in deadlocked) + " remain unfinished and are deadlocked under the supplied current Request/Allocation snapshot." if deadlocked else "All processes can finish; no deadlock is detected.")}
