from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from apikeys import APIKey, APIKeyClient
from apikeys.exceptions import AlreadyExistsError

from app.core.client import get_client
from app.core.deps import require_admin, require_read

router = APIRouter(prefix="/v1/products", tags=["products"])


class CreateProductBody(BaseModel):
    org_id: str
    name: str


class LinkProductBody(BaseModel):
    product_id: str


@router.post("", status_code=201)
async def create_product(
    body: CreateProductBody,
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    try:
        product = await client.create_product(org_id=body.org_id, name=body.name)
        return product
    except AlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("")
async def list_products(
    org_id: Optional[str] = Query(None),
    _key: APIKey = Depends(require_read),
    client: APIKeyClient = Depends(get_client),
):
    if org_id:
        return await client.list_products(org_id=org_id)
    orgs = await client.list_organizations()
    all_products = []
    for org in orgs:
        products = await client.list_products(org_id=str(org.id))
        all_products.extend(products)
    return all_products


@router.get("/project/{project_id}")
async def list_project_products(
    project_id: str,
    _key: APIKey = Depends(require_read),
    client: APIKeyClient = Depends(get_client),
):
    return await client.list_project_products(project_id=project_id)


@router.post("/project/{project_id}/link", status_code=204)
async def link_product_to_project(
    project_id: str,
    body: LinkProductBody,
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    try:
        await client.add_product_to_project(
            project_id=project_id, product_id=body.product_id
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))
