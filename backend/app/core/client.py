from functools import lru_cache

from apikeys import APIKeyClient

from .config import settings


@lru_cache(maxsize=1)
def get_client() -> APIKeyClient:
    return APIKeyClient(
        settings.db_url,
        signing_secret=settings.signing_secret,
        key_prefix=settings.key_prefix,
        environment=settings.environment,
    )
