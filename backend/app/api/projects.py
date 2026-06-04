from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from apikeys import APIKey, APIKeyClient
from apikeys.exceptions import AlreadyExistsError

from app.core.client import get_client
from app.core.deps import require_admin

router = APIRouter(prefix="/v1/projects", tags=["projects"])


class CreateProjectBody(BaseModel):
    org_id: str
    name: str


@router.post("", status_code=201)
async def create_project(
    body: CreateProjectBody,
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    try:
        project = await client.create_project(org_id=body.org_id, name=body.name)
        return project
    except AlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("")
async def list_projects(
    org_id: Optional[str] = Query(None),
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    if org_id:
        return await client.list_projects(org_id=org_id)
    # No filter: iterate all orgs
    orgs = await client.list_organizations()
    all_projects = []
    for org in orgs:
        projects = await client.list_projects(org_id=str(org.id))
        all_projects.extend(projects)
    return all_projects


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    _key: APIKey = Depends(require_admin),
    client: APIKeyClient = Depends(get_client),
):
    orgs = await client.list_organizations()
    for org in orgs:
        projects = await client.list_projects(org_id=str(org.id))
        for project in projects:
            if str(project.id) == project_id:
                return project
    raise HTTPException(status_code=404, detail="Project not found")
