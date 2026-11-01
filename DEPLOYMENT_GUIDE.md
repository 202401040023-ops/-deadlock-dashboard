# Deployment guide — separate frontend and backend

The project is intentionally split into two folders. Deploy them as two independent services from the same Git repository. Deploy the backend first so you have its public URL before configuring Netlify.

## A. Deploy backend to Render

### Recommended: connect the project repository

1. Extract this ZIP and push the complete `Deadlock-Insights-Dashboard` folder to a GitHub repository. Render's standard Web Service workflow deploys from a connected Git repository; it is not a normal ZIP-folder upload workflow.
2. In Render choose **New + → Blueprint** and select the repository if you want Render to read the root `render.yaml`. The blueprint defines the service root directory as `backend`. Alternatively choose **New + → Web Service**, select the repository, and enter these settings manually:
   - Root Directory: `backend`
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health Check Path: `/health`
3. Add environment variable `CORS_ORIGINS` temporarily as `http://localhost:5173` for local testing. After Netlify deployment, replace/add the exact Netlify origin, e.g. `https://YOUR-SITE.netlify.app`. Do not add a trailing slash.
4. Deploy and open `https://YOUR-RENDER-SERVICE.onrender.com/health`. Expect JSON containing `"status":"ok"`. Open `/docs` for interactive API documentation.

## B. Deploy frontend to Netlify

1. In Netlify choose **Add new project → Import an existing project** and connect the same Git repository.
2. Set **Base directory** to `frontend`. The frontend `netlify.toml` supplies the build and publish settings; verify they are:
   - Build command: `npm run build`
   - Publish directory: `.output/public`
3. In Netlify Site configuration → Environment variables, add:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://YOUR-RENDER-SERVICE.onrender.com` (your actual Render service origin, no trailing slash)
4. Trigger a new deploy after setting the variable. `VITE_*` values are embedded during the frontend build.
5. Copy the exact public Netlify site origin and set it as Render's `CORS_ORIGINS` value. Save and redeploy/restart the Render service.
6. Open the public Netlify website and test each algorithm. In browser Developer Tools → Network, confirm API calls go to your Render URL and not `localhost`.

## C. Local development (Windows PowerShell)

Backend terminal from the project root:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:CORS_ORIGINS="http://localhost:5173"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend in a second terminal from the project root:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
# Set VITE_API_BASE_URL=http://127.0.0.1:8000 in frontend/.env.local
npm run dev
```

Open the Vite URL printed by the terminal. Restart Vite after changing `.env.local`.

## D. Can you deploy without GitHub?

Netlify supports manual/CLI deploy workflows for built frontend output, but this project uses a TanStack Start/Nitro Netlify preset. Use the included build configuration and verify the generated Netlify server-function output; do not simply upload the source folder as static HTML. Render's normal Python Web Service workflow expects a connected Git provider (GitHub, GitLab, or Bitbucket). Therefore, for this two-service project, a Git repository is the most reliable and simplest repeatable approach.

## E. Verification and limitations

No public deployment is performed from this workspace because it does not have access to your Netlify/Render accounts or repository credentials. Backend tests are documented in `TEST_RESULTS.md`; still run a production frontend build and test the deployed UI/API integration before calling the site production-ready.
