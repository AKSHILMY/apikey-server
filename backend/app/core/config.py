from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    db_url: str = "sqlite+aiosqlite:///./keys.db"
    signing_secret: str
    key_prefix: str = "ak"
    environment: str = "live"
    platform_admin_key_id: str = ""
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
