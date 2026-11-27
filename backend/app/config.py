from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    app_name: str = "Job Order Analytics API"
    environment: str = "development"
    job_orders_api_url: str = ""
    external_api_timeout_seconds: float = 20.0
    # How long a successful upstream response is reused. 0 disables caching.
    job_orders_cache_ttl_seconds: float = 60.0
    # Comma-separated browser origins allowed to call this API directly,
    # e.g. "https://analytics.example.com". Leave empty when the frontend and
    # API share one origin (reverse proxy) or in local dev (Vite proxy).
    cors_allowed_origins: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_allowed_origins.split(",") if origin.strip()]

settings = Settings()
