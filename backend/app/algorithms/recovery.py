from .bankers import safety
from .multiple_detection import detect_multiple

def terminate_process(data: dict) -> dict:
    p = data["process_id"]; allocation = [r.copy() for r in data["allocation"]]; available = data["available"].copy()
    released = allocation[p].copy()
    allocation[p] = [0] * len(available)
    available = [available[j] + released[j] for j in range(len(available))]
    maximum = [r.copy() for r in data["maximum"]]; maximum[p] = [0] * len(available)
    maximum[p] = [0] * len(available)  # terminated process is removed from future claims
    check = safety(allocation, maximum, available)
    return {"status":"RECOVERY COMPLETE","strategy":"process_termination","terminated_process":p,"released_resources":released,"allocation_after":allocation,"available_after":available,"safety_after_recovery":check,"explanation":f"P{p} is terminated; all resources allocated to it are released. Its pending work is discarded. Other processes retain their allocations."}

def preempt_resource(data: dict) -> dict:
    p, r, amount = data["process_id"], data["resource_id"], data["amount"]
    allocation = [row.copy() for row in data["allocation"]]; available = data["available"].copy()
    if amount < 1 or amount > allocation[p][r]: raise ValueError("Preemption amount must be positive and no greater than the selected process's allocated units.")
    allocation[p][r] -= amount; available[r] += amount
    return {"status":"RESOURCE PREEMPTED","strategy":"resource_preemption","process_id":p,"resource_id":r,"preempted":amount,"allocation_after":allocation,"available_after":available,"explanation":"The selected resource units were reclaimed. The application must define checkpointing/rollback and starvation safeguards before using preemption in a real operating system."}

def recover_all(data: dict) -> dict:
    allocation = [r.copy() for r in data["allocation"]]; request = [r.copy() for r in data["request"]]; available = data["available"].copy()
    steps=[]
    result=detect_multiple(allocation,request,available)
    while result["deadlocked"]:
        victim=max(result["unfinished_processes"], key=lambda i:(sum(allocation[i]),-i))
        released=allocation[victim].copy(); allocation[victim]=[0]*len(available); request[victim]=[0]*len(available)
        available=[available[j]+released[j] for j in range(len(available))]
        result=detect_multiple(allocation,request,available)
        steps.append({"terminated":victim,"released":released,"remaining":result["unfinished_processes"]})
    return {"steps":steps,"terminated":[s["terminated"] for s in steps],"allocation_after":allocation,"available_after":available,"detection_after":result,"explanation":"Repeatedly terminate the unfinished process holding the largest total allocation; each termination releases its resources and detection is rerun."}
