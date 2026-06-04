from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from apikeys import APIKey, APIKeyClient
from apikeys.exceptions import (
    ExpiredKeyError,
    InvalidKeyError,
    RevokedKeyError,
)
from apikeys.models import KeyMetadata, RateLimit, RateLimitWindow

from app.core.client import get_client
from app.core.deps import require_admin, require_read, require_write

router = APIRouter(prefix="/v1/keys", tags=["keys"])

_WINDOW_MAP = {
    "second": RateLimitWindow.second,
    "minute": RateLimitWindow.minute,
    "hour": RateLimitWindow.hour,
    "day": RateLimitWindow.day,
}


class RateLimitBody(BaseModel):
    requests: int
    window: str


class CreateKeyBody(BaseModel):
    org_id: str
    project_id: Optional[str] = None
    product_id: Optional[str] = None
    name: Optional[str] = None
    scopes: list[str] = []
    rate_limit: Optional[RateLimitBody] = None
    expires_at: Optional[datetime] = None
    custom: Optional[dict] = None


class UpdateKeyBody(BaseModel):
    name: Optional[str] = None
    scopes: Optional[list[str]] = None
    rate_limit: Optional[RateLimitBody] = None
    expires_at: Optional[datetime] = None
    custom: Optional[dict] = None


class VerifyKeyBody(BaseModel):
    key: str


def _parse_rate_limit(body: Optional[RateLimitBody]) -> Optional[RateLimit]:
    if body is None:
        return None
    if body.window not in _WINDOW_MAP:
        raise HTTPException(status_code=422, detail=f"Invalid window: {body.window!r}. Choose from: {list(_WINDOW_MAP)}")
    return RateLimit(requests=body.requests, window=_WINDOW_MAP[body.window])


def _key_status(key: APIKey) -> str:
    if key.revoked_at is not None:
        return "revoked"
    exp = key.metadata.expires_at
    if exp:
        exp_aware = exp if exp.tzinfo is not None else exp.replace(tzinfo=timezone.utc)
        if exp_aware < datetime.now(tz=timezone.utc):
            return "expired"
    return "active"


def _serialize(key: APIKey, plaintext: Optional[str] = None) -> dict[str, Any]:
    d = key.model_dump()
    d["status"] = _key_status(key)
    if plaintext:
        d["plaintext"] = plaintext
    return d


# IMPORTANT: /verify must be registered before /{key_id} to avoid route collision
@router.post("/verify")
async def verify_key(
    body: VerifyKeyBody,
    _key: APIKey = Depends(require_read),
    client: APIKeyClient = Depends(get_client),
):
    try:
        result = await client.verify_key(body.key, track_usage=True)
        return {"valid": True, "key": _serialize(result)}
    except ExpiredKeyError:
        return {"valid": False, "reason": "expired"}
    except RevokedKeyError:
        return {"valid": False, "reason": "revoked"}
    except InvalidKeyError:
        return {"valid": False, "reason": "invalid"}


@router.post("", status_code=201)
async def create_key(
    body: CreateKeyBody,
    _key: APIKey = Depends(require_write),
    client: APIKeyClient = Depends(get_client),
):
    metadata = KeyMetadata(
        name=body.name,
        scopes=body.scopes,
        rate_limit=_parse_rate_limit(body.rate_limit),
        expires_at=body.expires_at,
        custom=body.custom or {},
    )
    try:
        created = await client.create_key(
            body.org_id,
            project_id=body.project_id,
            product_id=body.product_id,
            metadata=metadata,
        )
        return _serialize(created.key, plaintext=created.plaintext)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("")
async def list_keys(
    org_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    _key: APIKey = Depends(require_read),
    client: APIKeyClient = Depends(get_client),
):
    if project_id:
        keys = await client.list_project_keys(project_id=project_id)
        return [_serialize(k) for k in keys]
    if org_id:
        keys = await client.list_org_keys(org_id=org_id)
        return [_serialize(k) for k in keys]
    orgs = await client.list_organizations()
    all_keys = []
    for org in orgs:
        keys = await client.list_org_keys(org_id=str(org.id))
        all_keys.extend(_serialize(k) for k in keys)
    return all_keys


@router.get("/{key_id}")
async def get_key(
    key_id: str,
    _key: APIKey = Depends(require_read),
    client: APIKeyClient = Depends(get_client),
):
    try:
        key = await client.get_key(key_id)
        return _serialize(key)
    except Exception:
        raise HTTPException(status_code=404, detail="Key not found")


@router.patch("/{key_id}")
async def update_key(
    key_id: str,
    body: UpdateKeyBody,
    _key: APIKey = Depends(require_write),
    client: APIKeyClient = Depends(get_client),
):
    metadata = KeyMetadata(
        name=body.name,
        scopes=body.scopes or [],
        rate_limit=_parse_rate_limit(body.rate_limit),
        expires_at=body.expires_at,
        custom=body.custom or {},
    )
    try:
        key = await client.update_key(key_id=key_id, metadata=metadata)
        return _serialize(key)
    except Exception:
        raise HTTPException(status_code=404, detail="Key not found")


@router.post("/{key_id}/revoke", status_code=204)
async def revoke_key(
    key_id: str,
    _key: APIKey = Depends(require_write),
    client: APIKeyClient = Depends(get_client),
):
    try:
        await client.revoke_key(key_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Key not found")


@router.delete("/{key_id}", status_code=204)
async def delete_key(
    key_id: str,
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    try:
        await client.delete_key(key_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Key not found")
