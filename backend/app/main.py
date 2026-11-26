from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.admin import router as admin_router
from app.api.v1.planting import router as planting_router
from app.api.v1.chat import router as chat_router
from app.api.v1.messaging import router as messaging_router
from app.api.v1.animal_health import router as animal_health_router
from app.api.v1.disease import router as disease_router
from app.api.v1.agrovets import router as agrovets_router
from app.api.v1.health import router as health_router
from app.api.v1.user_plans import router as user_plans_router
from app.core.config import settings
from app.data_access.database import initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Apply the demo's idempotent schema upgrades before serving requests."""
    initialize_database()
    from app.data_access.animal_repository import initialize_animal_tables
    initialize_animal_tables()
    yield


app = FastAPI(
    title="Duducare Demo API",
    description="A demo API foundation. No live agricultural data sources are connected.",
    version="0.1.0",
    lifespan=lifespan,
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
    if request.url.path.startswith(("/api/v1/auth/", "/api/v1/admin", "/api/v1/agrovets", "/api/v1/disease/cases", "/api/v1/saved-plans", "/api/v1/chat", "/api/v1/animal-health", "/api/v1/messaging")):
        response.headers["Cache-Control"] = "no-store"
    return response


app.include_router(health_router, prefix="/api/v1")
app.include_router(disease_router, prefix="/api/v1")
app.include_router(agrovets_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(user_plans_router, prefix="/api/v1")

app.include_router(planting_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(messaging_router, prefix="/api/v1")

app.include_router(animal_health_router, prefix="/api/v1")
