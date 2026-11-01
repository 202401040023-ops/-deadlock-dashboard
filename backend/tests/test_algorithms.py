import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.algorithms.bankers import safety
from app.algorithms.resource_request import request_resources
from app.algorithms.multiple_detection import detect_multiple
from app.algorithms.single_detection import detect_wait_for_cycle
from app.algorithms.prevention import validate_order
from app.algorithms.recovery import terminate_process

client=TestClient(app)
ALLOC=[[0,1,0],[2,0,0],[3,0,2],[2,1,1],[0,0,2]]
MAX=[[7,5,3],[3,2,2],[9,0,2],[2,2,2],[4,3,3]]

def test_bankers_safe_textbook():
    r=safety(ALLOC,MAX,[3,3,2]); assert r['safe']; assert r['safe_sequence']==[1,3,0,2,4]

def test_bankers_unsafe():
    r=safety([[1,0],[0,1]],[[2,1],[1,2]],[0,0]); assert not r['safe']; assert r['partial_sequence']==[]

def test_request_granted_and_state_updated():
    r=request_resources({'allocation':ALLOC,'maximum':MAX,'available':[3,3,2],'process_id':1,'request':[1,0,2]})
    assert r['granted'] and r['after']['allocation'][1]==[3,0,2]

def test_request_waits_without_mutation():
    a=[[0]]; r=request_resources({'allocation':a,'maximum':[[2]],'available':[0],'process_id':0,'request':[1]})
    assert r['status']=='WAITING/DEFERRED' and r['after']['allocation']==a

def test_request_exceeds_need():
    r=request_resources({'allocation':[[0]],'maximum':[[1]],'available':[1],'process_id':0,'request':[2]})
    assert r['status']=='INVALID REQUEST'

def test_multiple_instance_deadlock():
    r=detect_multiple([[1],[1]],[[1],[1]],[0]); assert r['deadlocked'] and r['unfinished_processes']==[0,1]

def test_multiple_instance_no_deadlock():
    r=detect_multiple([[1],[0]],[[0],[1]],[0]); assert not r['deadlocked'] and r['unfinished_processes']==[]

def test_single_instance_cycle():
    r=detect_wait_for_cycle(['P0','P1'],[('P0','P1'),('P1','P0')]); assert r['deadlocked'] and r['cycle'][0]==r['cycle'][-1]

def test_single_instance_acyclic():
    assert not detect_wait_for_cycle(['P0','P1'],[('P0','P1')])['deadlocked']

def test_recovery_termination_releases_resources():
    r=terminate_process({'allocation':[[2],[1]],'maximum':[[2],[1]],'available':[0],'process_id':0})
    assert r['released_resources']==[2] and r['available_after']==[2]

def test_resource_order():
    assert validate_order(['R1','R2','R3'],['R1','R2','R3'])['valid']
    assert not validate_order(['R1','R2','R3'],['R2','R1'])['valid']
    assert not validate_order(['R1','R2'],['R3'])['valid']

def test_api_health_and_safety():
    assert client.get('/health').status_code==200
    r=client.post('/api/safety',json={'allocation':ALLOC,'maximum':MAX,'available':[3,3,2]})
    assert r.status_code==200 and r.json()['safe']

def test_api_rejects_invalid_dimensions():
    r=client.post('/api/safety',json={'allocation':[[0,0]],'maximum':[[1]],'available':[1]})
    assert r.status_code==422


def test_automatic_recovery_clears_two_process_deadlock():
    from app.algorithms.recovery import recover_all
    r=recover_all({"allocation":[[1],[1]],"request":[[1],[1]],"available":[0]})
    assert len(r["terminated"]) == 1
    assert not r["detection_after"]["deadlocked"]

def test_resource_preemption():
    from app.algorithms.recovery import preempt_resource
    r=preempt_resource({"allocation":[[2]],"request":[[1]],"available":[0],"process_id":0,"resource_id":0,"amount":1})
    assert r["allocation_after"] == [[1]] and r["available_after"] == [1]

def test_api_single_and_multiple_endpoints():
    single=client.post('/api/detection/single',json={"processes":["P0","P1"],"waits":[["P0","P1"],["P1","P0"]]})
    assert single.status_code==200 and single.json()["deadlocked"]
    multiple=client.post('/api/detection/multiple',json={"allocation":[[1],[1]],"request":[[1],[1]],"available":[0]})
    assert multiple.status_code==200 and multiple.json()["unfinished_processes"]==[0,1]

def test_unsafe_request_denied_and_original_state_preserved():
    granted=request_resources({'allocation':ALLOC,'maximum':MAX,'available':[3,3,2],'process_id':1,'request':[1,0,2]})
    before=granted['after']
    denied=request_resources({'allocation':before['allocation'],'maximum':MAX,'available':before['available'],'process_id':0,'request':[0,2,0]})
    assert denied['status']=='DENIED'
    assert denied['after']['allocation']==before['allocation']
    assert denied['after']['available']==before['available']

def test_request_exactly_equals_need_is_granted():
    r=request_resources({'allocation':ALLOC,'maximum':MAX,'available':[3,3,2],'process_id':3,'request':[0,1,1]})
    assert r['status']=='GRANTED'

def test_multiple_detection_textbook_safe_and_deadlock_examples():
    a=[[0,1,0],[2,0,0],[3,0,3],[2,1,1],[0,0,2]]
    no_deadlock=[[0,0,0],[2,0,2],[0,0,0],[1,0,0],[0,0,2]]
    deadlock=[[0,0,0],[2,0,2],[0,0,1],[1,0,0],[0,0,2]]
    assert detect_multiple(a,no_deadlock,[0,0,0])['unfinished_processes']==[]
    assert detect_multiple(a,deadlock,[0,0,0])['unfinished_processes']==[1,2,3,4]
