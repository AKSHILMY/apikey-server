import os
import sys
from pathlib import Path

from apikeys import create_tables
from apikeys.models import KeyMetadata

from .client import get_client
from .config import settings

_BOOTSTRAP_ORG = "platform-internal"
_BOOTSTRAP_PRODUCT_BASE = "base"
_BOOTSTRAP_PRODUCT_ADVANCED = "advanced"
_BOOTSTRAP_PROJECT = "platform-admin"
_BOOTSTRAP_KEY_NAME = "platform-super-admin"
_BOOTSTRAP_SCOPES = ["admin", "read", "write"]
_ENV_FILE = Path(".env")


async def run_bootstrap() -> None:
    await create_tables(settings.db_url)

    client = get_client()

    org, _ = await client.get_or_create_organization(_BOOTSTRAP_ORG)
    org_id = str(org.id)

    product_base, _ = await client.get_or_create_product(org_id=org_id, name=_BOOTSTRAP_PRODUCT_BASE)
    product_adv, _ = await client.get_or_create_product(org_id=org_id, name=_BOOTSTRAP_PRODUCT_ADVANCED)
    project, _ = await client.get_or_create_project(org_id=org_id, name=_BOOTSTRAP_PROJECT)

    for product_id in (str(product_base.id), str(product_adv.id)):
        try:
            await client.add_product_to_project(
                project_id=str(project.id), product_id=product_id
            )
        except Exception:
            pass  # already linked on previous boot

    existing_id = settings.platform_admin_key_id

    if not existing_id:
        key = await client.create_key(
            org_id,
            project_id=str(project.id),
            metadata=KeyMetadata(
                name=_BOOTSTRAP_KEY_NAME,
                scopes=_BOOTSTRAP_SCOPES,
            ),
        )
        _print_bootstrap_banner(key.plaintext)
        _persist_key_id(str(key.key.id))
    else:
        try:
            keys = await client.list_project_keys(project_id=str(project.id))
            ids = {str(k.id) for k in keys}
            if existing_id not in ids:
                print(
                    f"[bootstrap] WARNING: PLATFORM_ADMIN_KEY_ID={existing_id!r} not found in DB. "
                    "Delete it from .env and restart to re-bootstrap.",
                    file=sys.stderr,
                )
        except Exception as exc:
            print(f"[bootstrap] WARNING: could not validate admin key: {exc}", file=sys.stderr)


def _print_bootstrap_banner(raw_key: str) -> None:
    sep = "=" * 72
    print(sep, file=sys.stderr)
    print("  PLATFORM BOOTSTRAP — SAVE THIS API KEY NOW", file=sys.stderr)
    print("  It will NEVER be shown again.", file=sys.stderr)
    print(f"\n  {raw_key}\n", file=sys.stderr)
    print("  Use it as:  X-API-Key: <key>  on all management API requests.", file=sys.stderr)
    print(sep, file=sys.stderr)


def _persist_key_id(key_id: str) -> None:
    with _ENV_FILE.open("a") as f:
        f.write(f"\nPLATFORM_ADMIN_KEY_ID={key_id}\n")
    os.environ["PLATFORM_ADMIN_KEY_ID"] = key_id
