from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.admin import router as admin_router
from app.api.v1.disease import router as disease_router
from app.api.v1.health import router as health_router
from app.api.v1.planting import router as planting_router
from app.api.v1.user_plans import router as user_plans_router
from app.core.config import settings


app = FastAPI(
    title="Integrated Agricultural Advisory Demo API",
    description="A demo API foundation. No live agricultural data sources are connected.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url] if settings.frontend_url else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def private_account_responses(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith(("/api/v1/auth/", "/api/v1/saved-plans")):
        response.headers["Cache-Control"] = "no-store"
    return response


app.include_router(health_router, prefix="/api/v1")
app.include_router(disease_router, prefix="/api/v1")
app.include_router(planting_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(user_plans_router, prefix="/api/v1")
