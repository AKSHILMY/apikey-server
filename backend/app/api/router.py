from fastapi import APIRouter

from .bootstrap_status import router as bootstrap_router
from .health import router as health_router
from .keys import router as keys_router
from .organizations import router as orgs_router
from .products import router as products_router
from .projects import router as projects_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(bootstrap_router)
api_router.include_router(orgs_router)
api_router.include_router(products_router)
api_router.include_router(projects_router)
api_router.include_router(keys_router)
