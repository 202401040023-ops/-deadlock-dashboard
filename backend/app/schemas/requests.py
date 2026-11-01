from pydantic import BaseModel, Field, ConfigDict, model_validator
from typing import Annotated

Count = Annotated[int, Field(ge=0, le=1_000_000)]
Matrix = list[list[Count]]
Vector = list[Count]

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class BankerInput(StrictModel):
    allocation: Matrix
    maximum: Matrix
    available: Vector
    @model_validator(mode="after")
    def dimensions_and_bounds(self):
        validate_matrices(self.allocation, self.maximum, self.available, "maximum")
        for i, row in enumerate(self.allocation):
            for j, value in enumerate(row):
                if value > self.maximum[i][j]:
                    raise ValueError(f"Allocation[P{i}][R{j}] cannot exceed maximum claim.")
        return self

class ResourceRequestInput(BankerInput):
    process_id: int = Field(ge=0)
    request: Vector
    @model_validator(mode="after")
    def request_dimensions(self):
        if self.process_id >= len(self.allocation): raise ValueError("process_id is outside the process range.")
        if len(self.request) != len(self.available): raise ValueError("Request vector length must equal the number of resource types.")
        return self

class MultipleDetectionInput(StrictModel):
    allocation: Matrix
    request: Matrix
    available: Vector
    @model_validator(mode="after")
    def dimensions(self):
        validate_matrices(self.allocation, self.request, self.available, "request")
        return self

class SingleDetectionInput(StrictModel):
    processes: list[str] = Field(min_length=1, max_length=200)
    waits: list[tuple[str, str]] = Field(default_factory=list, max_length=2000)
    @model_validator(mode="after")
    def edges_reference_processes(self):
        if any(not p.strip() for p in self.processes): raise ValueError("Process names cannot be empty.")
        if len(set(self.processes)) != len(self.processes): raise ValueError("Process names must be unique.")
        known = set(self.processes)
        for a, b in self.waits:
            if a not in known or b not in known: raise ValueError(f"Wait edge {a} -> {b} references an unknown process.")
            if a == b: continue
        return self

class RecoveryInput(BankerInput):
    process_id: int = Field(ge=0)
    @model_validator(mode="after")
    def process_exists(self):
        if self.process_id >= len(self.allocation): raise ValueError("process_id is outside the process range.")
        return self

class PreventionInput(StrictModel):
    resource_order: list[str] = Field(min_length=1, max_length=500)
    acquisition: list[str] = Field(min_length=1, max_length=2000)
    @model_validator(mode="after")
    def unique_order(self):
        if any(not x.strip() for x in self.resource_order + self.acquisition): raise ValueError("Resource names cannot be empty.")
        if len(set(self.resource_order)) != len(self.resource_order): raise ValueError("Global resource order must contain unique resource names.")
        return self

def validate_matrices(allocation, other, available, other_name):
    if not allocation: raise ValueError("At least one process is required.")
    if not available: raise ValueError("At least one resource type is required.")
    rows, cols = len(allocation), len(available)
    if len(other) != rows: raise ValueError(f"{other_name.capitalize()} matrix must have {rows} rows.")
    for name, matrix in (("Allocation", allocation), (other_name.capitalize(), other)):
        for i, row in enumerate(matrix):
            if len(row) != cols: raise ValueError(f"{name} row {i} must contain {cols} values.")

class PreemptionInput(MultipleDetectionInput):
    process_id: int = Field(ge=0)
    resource_id: int = Field(ge=0)
    amount: Count
    @model_validator(mode="after")
    def preemption_bounds(self):
        if self.process_id >= len(self.allocation): raise ValueError("process_id is outside the process range.")
        if self.resource_id >= len(self.available): raise ValueError("resource_id is outside the resource range.")
        if self.amount < 1: raise ValueError("amount must be at least 1.")
        if self.amount > self.allocation[self.process_id][self.resource_id]: raise ValueError("Preemption amount exceeds the selected process's allocation.")
        return self
