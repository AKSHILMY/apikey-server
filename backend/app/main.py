from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.bootstrap import run_bootstrap
from app.core.client import get_client
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_bootstrap()
    yield


app = FastAPI(title="API Key Management Platform", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def attach_client(request: Request, call_next):
    request.state.apikeys_client = get_client()
    return await call_next(request)


app.include_router(api_router)
