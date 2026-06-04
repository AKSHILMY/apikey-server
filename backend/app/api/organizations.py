from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from apikeys import APIKey, APIKeyClient
from apikeys.exceptions import AlreadyExistsError

from app.core.client import get_client
from app.core.deps import require_admin

router = APIRouter(prefix="/v1/organizations", tags=["organizations"])


class CreateOrgBody(BaseModel):
    name: str


@router.post("", status_code=201)
async def create_organization(
    body: CreateOrgBody,
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    try:
        org = await client.create_organization(body.name)
        return org
    except AlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("")
async def list_organizations(
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    return await client.list_organizations()


@router.get("/{org_id}")
async def get_organization(
    org_id: str,
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    orgs = await client.list_organizations()
    for org in orgs:
        if org.id == org_id:
            return org
    raise HTTPException(status_code=404, detail="Organization not found")
