from fastapi import APIRouter
from ..schemas.requests import BankerInput, ResourceRequestInput, MultipleDetectionInput, SingleDetectionInput, RecoveryInput, PreventionInput, PreemptionInput
from ..algorithms.bankers import safety
from ..algorithms.resource_request import request_resources
from ..algorithms.multiple_detection import detect_multiple
from ..algorithms.single_detection import detect_wait_for_cycle
from ..algorithms.recovery import terminate_process, preempt_resource, recover_all
from ..algorithms.prevention import validate_order

router=APIRouter(prefix="/api")
@router.post("/safety")
def safety_route(data: BankerInput): return safety(data.allocation,data.maximum,data.available)
@router.post("/request")
def request_route(data: ResourceRequestInput): return request_resources(data.model_dump())
@router.post("/detection/single")
def single_route(data: SingleDetectionInput): return detect_wait_for_cycle(data.processes,data.waits)
@router.post("/detection/multiple")
def multiple_route(data: MultipleDetectionInput): return detect_multiple(data.allocation,data.request,data.available)
@router.post("/recovery")
def recovery_route(data: RecoveryInput): return terminate_process(data.model_dump())
@router.post("/recovery/preempt")
def preempt_route(data: PreemptionInput): return preempt_resource(data.model_dump())
@router.post("/recovery/automatic")
def automatic_recovery_route(data: MultipleDetectionInput): return recover_all(data.model_dump())
@router.post("/prevention/order")
def prevention_route(data: PreventionInput): return validate_order(data.resource_order,data.acquisition)
