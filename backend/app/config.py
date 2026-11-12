from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    app_name: str = "Job Order Analytics API"
    environment: str = "development"
    job_orders_api_url: str = ""
    external_api_timeout_seconds: float = 20.0

settings = Settings()
