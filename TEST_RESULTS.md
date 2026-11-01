# Verification report

Date: 2026-11-01

## Backend

Executed from `backend/`:

```text
python -m pytest -q
...................                                                      [100%]
19 passed in 0.73s
```

The 19 automated tests cover:

- Banker safety: textbook safe sequence and unsafe state.
- Resource request: grant, wait, over-Need rejection, exact-Need request, unsafe tentative allocation denial, and preservation of the submitted state.
- Multiple-instance detection: deadlock, no-deadlock, and textbook snapshots.
- Single-instance wait-for graph: cycle and acyclic graph.
- Recovery: process termination/resource release, automatic termination recovery, and resource preemption.
- Prevention: valid order, descending order, and unknown resource.
- HTTP: health, safety, single/multiple detection, and invalid matrix dimensions.

Also executed `python -m compileall -q app` successfully.

## Frontend

A production frontend build was **not verified** in this environment. The ZIP did not contain `node_modules` or an npm lockfile. `npm install --no-audit --no-fund` was attempted but exceeded the available execution window, so `npm run build` could not be run. Run `npm install` and `npm run build` locally or in Netlify before considering the frontend deployment verified.

## Deployment

No deployment was performed. Render and Netlify account access, repository connection, deployed domain, and environment configuration are user-controlled. Follow `DEPLOYMENT_GUIDE.md` and verify the deployed health endpoint and browser Network requests.
