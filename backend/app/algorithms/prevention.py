def validate_order(resource_order: list[str], acquisition: list[str]) -> dict:
    rank={name:i for i,name in enumerate(resource_order)}
    unknown=[name for name in acquisition if name not in rank]
    violations=[]
    if not unknown:
        for a,b in zip(acquisition, acquisition[1:]):
            if rank[b] < rank[a]: violations.append({"from":a,"to":b})
    valid=not unknown and not violations
    if unknown: explanation="Unknown resource(s) are not in the configured global order: " + ", ".join(dict.fromkeys(unknown)) + "."
    elif violations: explanation="Invalid acquisition order. Requests must follow the configured global order; descending transitions can reintroduce circular-wait risk. Violations: " + ", ".join(f"{v['from']} → {v['to']}" for v in violations) + "."
    else: explanation="Valid acquisition sequence. Every acquisition follows the same global resource order, preventing circular wait. Resource ordering breaks the circular-wait condition; it does not remove the other Coffman conditions."
    return {"valid":valid,"status":"VALID ORDER" if valid else "INVALID ORDER","acquisition":acquisition,"violations":violations,"unknown_resources":list(dict.fromkeys(unknown)),"explanation":explanation}
