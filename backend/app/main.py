import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import APP_NAME, allowed_origins
from .routes.api import router

app = FastAPI(
    title=APP_NAME,
    version="1.0.0",
    description="Operating Systems deadlock safety, request, detection, prevention and recovery algorithms.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok", "service": APP_NAME, "version": "1.0.0"}


@app.get("/")
def root():
    return {"message": APP_NAME, "docs": "/docs", "health": "/health"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true",
    )
