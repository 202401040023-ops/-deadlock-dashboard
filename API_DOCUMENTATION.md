# API documentation

Base URL: `http://127.0.0.1:8000` locally; use the Render origin in production. Interactive OpenAPI docs are at `/docs`.

All resource quantities must be non-negative integers. Matrices must have one row per process and one column per resource type. The API returns HTTP 422 for malformed dimensions, negative quantities, allocation exceeding maximum claim, duplicate process names, and unknown process references.

## `GET /health`
Returns service status and version.

## `POST /api/safety`
```json
{"allocation":[[0,1],[1,0]],"maximum":[[1,1],[1,1]],"available":[0,0]}
```
Returns `safe`, `status`, `need`, `finish`, `safe_sequence`, `partial_sequence`, and a step-by-step `trace`. Unsafe is not synonymous with deadlock.

## `POST /api/request`
Same matrices as safety plus `process_id` and `request` vector. Checks Request ≤ Need, Request ≤ Available, tentatively allocates, and runs safety. A rejected request does not mutate the submitted state. Status is `INVALID REQUEST`, `WAITING/DEFERRED`, `DENIED`, or `GRANTED`.

## `POST /api/detection/single`
```json
{"processes":["P0","P1"],"waits":[["P0","P1"],["P1","P0"]]}
```
Input edges are wait-for graph edges (process → process), not resource-allocation graph edges. For single-instance resource types, a wait-for cycle is necessary and sufficient for deadlock. The response includes graph adjacency and one cycle if found.

## `POST /api/detection/multiple`
```json
{"allocation":[[1],[1]],"request":[[1],[1]],"available":[0]}
```
Runs the standard multiple-instance Work/Finish detection algorithm. `request` means each process's current outstanding request, not Banker's remaining Need. Processes with zero allocation are initialized as finished. Returns unfinished/deadlocked process IDs and trace.

## `POST /api/recovery`
Same matrices as safety plus `process_id`. Terminates that process, releases its current allocation, and returns the updated allocation/available vectors plus a Banker safety check. This endpoint does not claim to implement arbitrary OS-level checkpoint/restart semantics.

## `POST /api/prevention/order`
```json
{"resource_order":["R0","R1","R2"],"acquisition":["R0","R2"]}
```
Checks every acquired resource is in the declared unique global order and that the sequence is nondecreasing by rank. Enforcing one consistent global order prevents circular wait; it does not eliminate the other Coffman conditions.

## Error format
FastAPI/Pydantic validation errors use HTTP 422 with a `detail` array. Unexpected server errors use standard HTTP 500 responses. CORS is controlled by the comma-separated `CORS_ORIGINS` environment variable.

## Additional recovery endpoints

`POST /api/recovery/automatic` accepts the same body as `/api/detection/multiple`. It repeatedly detects and terminates the unfinished process holding the most allocated units, returning every recovery step and final state.

`POST /api/recovery/preempt` accepts `allocation`, `request`, `available`, `process_id`, `resource_id`, and `amount`. It preempts the requested allocated units and returns the changed state. This is a simulation primitive; a production OS needs checkpoint/rollback and starvation handling. The current dashboard's recovery form uses the selected-process termination endpoint.
