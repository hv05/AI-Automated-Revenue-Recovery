from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "RecoverFlow AI"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database connection
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./recoverflow.db",
        description="Async SQLAlchemy database connection string (PostgreSQL or SQLite)",
    )

    # Redis configuration
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis URL for idempotency locks and session caching",
    )

    # Razorpay credentials
    RAZORPAY_KEY_ID: str = Field(
        default="rzp_test_recoverflow123",
        description="Razorpay API Key ID",
    )
    RAZORPAY_KEY_SECRET: str = Field(
        default="sample_razorpay_secret_key",
        description="Razorpay API Key Secret",
    )
    RAZORPAY_WEBHOOK_SECRET: str = Field(
        default="recoverflow_webhook_secret_xyz",
        description="Razorpay Webhook Secret for HMAC SHA256 verification",
    )

    # LLM API keys
    OPENAI_API_KEY: Optional[str] = Field(default=None, description="OpenAI API Key")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, description="Anthropic API Key")

    # Twilio / WhatsApp configuration
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"

    # CORS origins
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000", "*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
