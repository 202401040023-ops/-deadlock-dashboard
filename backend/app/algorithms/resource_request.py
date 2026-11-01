from .bankers import safety

def request_resources(data: dict) -> dict:
    allocation, maximum, available = data["allocation"], data["maximum"], data["available"]
    p, request = data["process_id"], data["request"]
    need = [maximum[p][j] - allocation[p][j] for j in range(len(available))]
    if all(x == 0 for x in request):
        return {"status":"INVALID REQUEST","granted":False,"reason":"A zero request does not allocate any resources.","after":{"allocation":allocation,"need":need,"available":available}}
    if any(request[j] > need[j] for j in range(len(available))):
        return {"status":"INVALID REQUEST","granted":False,"reason":"Request exceeds the process's remaining maximum claim (Need). State was not changed.","after":{"allocation":allocation,"need":need,"available":available}}
    if any(request[j] > available[j] for j in range(len(available))):
        return {"status":"WAITING/DEFERRED","granted":False,"reason":"Insufficient currently available resources. The process must wait; state was not changed.","after":{"allocation":allocation,"need":need,"available":available}}
    trial_a = [row.copy() for row in allocation]; trial_v = available.copy()
    for j, amount in enumerate(request): trial_a[p][j] += amount; trial_v[j] -= amount
    check = safety(trial_a, maximum, trial_v)
    if not check["safe"]:
        return {"status":"DENIED","granted":False,"reason":"The tentative allocation would leave the system unsafe. The original state has been preserved.","after":{"allocation":allocation,"need":need,"available":available},"safety_check":check}
    new_need = [[maximum[i][j] - trial_a[i][j] for j in range(len(available))] for i in range(len(allocation))]
    return {"status":"GRANTED","granted":True,"reason":"Request granted: the tentative state is safe.","after":{"allocation":trial_a,"need":new_need,"available":trial_v},"safe_sequence":check["safe_sequence"],"safety_check":check}
