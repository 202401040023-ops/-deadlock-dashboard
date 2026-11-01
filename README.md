# Deadlock Insights Dashboard

Full-stack OS deadlock learning dashboard. The original Lovable-generated frontend is in `frontend/`; the Python FastAPI backend is in `backend/`.

## Project layout

```text
Deadlock-Insights-Dashboard/
  frontend/                 # React + TypeScript + TanStack Start UI (Netlify)
    src/
    public/
    package.json
    netlify.toml
    .env.example
  backend/                  # FastAPI algorithms/API (Render)
    app/
      algorithms/
      routes/
      schemas/
    tests/
    requirements.txt
  render.yaml               # Render Blueprint; service rootDir is backend
  API_DOCUMENTATION.md
  DEPLOYMENT_GUIDE.md
  TEST_RESULTS.md
```

## Deploy order

1. Push this complete project folder to GitHub (or another Git provider supported by Render).
2. Deploy backend to Render using the root `render.yaml`, or create a Web Service with Root Directory `backend`.
3. Verify the Render `/health` endpoint.
4. Deploy frontend to Netlify from the same repository with Base directory `frontend`, build command `npm run build`, and publish directory `.output/public`.
5. Set Netlify environment variable `VITE_API_BASE_URL` to the Render service origin (no trailing slash), then redeploy.
6. Set Render `CORS_ORIGINS` to the exact Netlify site origin (for example `https://your-site.netlify.app`) and redeploy/restart the backend.

See `DEPLOYMENT_GUIDE.md` for step-by-step instructions.

## Local development (Windows PowerShell)

Backend terminal:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:CORS_ORIGINS="http://localhost:5173"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend in a second terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

The frontend proxies local `/api` requests to `VITE_API_BASE_URL` from `frontend/.env.local`, avoiding browser CORS and Vite port changes. Keep it set to the backend's address (default `http://127.0.0.1:8000`). For a backend on another port, update that value and restart the frontend dev server.

Backend health: `http://127.0.0.1:8000/health`; interactive API docs: `http://127.0.0.1:8000/docs`.

## Tests

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

See `TEST_RESULTS.md` for the recorded backend test run. A successful public deployment and frontend production build are not claimed until verified in your own deployment accounts/build logs.
