import os

from fastapi import APIRouter

router = APIRouter(tags=["system"])


@router.get("/v1/bootstrap/status")
async def bootstrap_status():
    key_id = os.getenv("PLATFORM_ADMIN_KEY_ID", "")
    return {
        "bootstrapped": bool(key_id),
        "admin_key_id": key_id or None,
    }
