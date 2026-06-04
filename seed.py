"""
Seed script — creates orgs, projects, products, and API keys against the running server.

Edit the variables below, then run:
    python seed.py                  # full run
    python seed.py --start 501      # resume from org 501
    python seed.py --start 501 --end 750   # run a specific range
"""

import argparse
import asyncio
import httpx

# ── Configuration ──────────────────────────────────────────────────────────────
ADMIN_API_KEY     = "ak_live_cq23uuHi0-RARkLjf4OpSDcKtSfNglK2Zr8NZTme4gM"          # paste your admin key here
BASE_URL          = "http://127.0.0.1:8000"
NUM_ORGS          = 10
PROJECTS_PER_ORG  = 5
CONCURRENCY       = 20                    # parallel requests in flight
# ───────────────────────────────────────────────────────────────────────────────

HEADERS = {"X-API-Key": ADMIN_API_KEY, "Content-Type": "application/json"}


async def post(client: httpx.AsyncClient, sem: asyncio.Semaphore, path: str, body: dict) -> dict:
    async with sem:
        r = await client.post(f"{BASE_URL}{path}", json=body, headers=HEADERS, timeout=30)
        if not r.is_success:
            raise RuntimeError(f"HTTP {r.status_code} {path} — {r.text[:200]}")
        return r.json()


async def seed_org(client: httpx.AsyncClient, sem: asyncio.Semaphore, idx: int) -> dict:
    """Create one org with PROJECTS_PER_ORG projects, 1 product per project, and 3 keys."""
    org_name = f"org-{idx:04d}"
    org = await post(client, sem, "/v1/organizations", {"name": org_name})
    org_id = org["id"]

    # Create all projects and their products concurrently
    async def setup_project(p_idx: int):
        proj_name = f"{org_name}-project-{p_idx:03d}"
        proj = await post(client, sem, "/v1/projects", {"org_id": org_id, "name": proj_name})
        project_id = proj["id"]

        prod = await post(client, sem, "/v1/products", {"org_id": org_id, "name": f"{proj_name}-product"})
        product_id = prod["id"]

        await post(client, sem, f"/v1/products/project/{project_id}/link", {"product_id": product_id})
        return project_id, product_id

    results = await asyncio.gather(*[setup_project(p) for p in range(1, PROJECTS_PER_ORG + 1)])

    # Use the first project/product for the scoped keys
    first_project_id, first_product_id = results[0]

    # Create 3 keys per org
    key_org, key_proj, key_prod = await asyncio.gather(
        post(client, sem, "/v1/keys", {
            "org_id": org_id,
            "name": f"{org_name}-org-key",
            "scopes": ["read", "write"],
        }),
        post(client, sem, "/v1/keys", {
            "org_id": org_id,
            "project_id": first_project_id,
            "name": f"{org_name}-project-key",
            "scopes": ["read", "write"],
        }),
        post(client, sem, "/v1/keys", {
            "org_id": org_id,
            "product_id": first_product_id,
            "name": f"{org_name}-product-key",
            "scopes": ["read"],
        }),
    )

    return {
        "org": org_name,
        "org_key":     key_org.get("key_prefix"),
        "project_key": key_proj.get("key_prefix"),
        "product_key": key_prod.get("key_prefix"),
    }


async def main(start: int, end: int):
    if ADMIN_API_KEY == "REPLACE_ME":
        print("ERROR: set ADMIN_API_KEY at the top of seed.py before running.")
        return

    total = end - start + 1
    sem = asyncio.Semaphore(CONCURRENCY)
    print(f"Seeding orgs {start}–{end} ({total} orgs) × {PROJECTS_PER_ORG} projects each against {BASE_URL} …\n")

    errors = 0
    async with httpx.AsyncClient() as client:
        for idx in range(start, end + 1):
            done = idx - start + 1
            try:
                result = await seed_org(client, sem, idx)
                print(f"  [{done}/{total}] ✓ {result['org']} — "
                      f"org-key: {result['org_key']}… | "
                      f"project-key: {result['project_key']}… | "
                      f"product-key: {result['product_key']}…")
            except Exception as e:
                errors += 1
                print(f"  [{done}/{total}] ✗ org-{idx:04d} ERROR: {e}")

    succeeded = total - errors
    print(f"\nDone. {succeeded}/{total} orgs seeded, "
          f"{succeeded * PROJECTS_PER_ORG} projects, "
          f"{succeeded * PROJECTS_PER_ORG} products, "
          f"{succeeded * 3} keys.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed orgs/projects/products/keys")
    parser.add_argument("--start", type=int, default=1,
                        help="Company number to start from, e.g. --start 501 → org-0501 (default: 1)")
    parser.add_argument("--end", type=int, default=NUM_ORGS,
                        help=f"Company number to end at, e.g. --end 750 → org-0750 (default: {NUM_ORGS})")
    args = parser.parse_args()

    if args.start < 1 or args.end < args.start:
        parser.error("--start must be >= 1 and --end must be >= --start")

    asyncio.run(main(args.start, args.end))
