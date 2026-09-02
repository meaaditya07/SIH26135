from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ─── App ───
    APP_NAME: str = "SkillTrace AI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    APP_WEB_URL: str = "http://localhost:3000"
    PUBLIC_APP_BASE_URL: str = "http://localhost:3000"
    SECRET_KEY: str = "change-me-to-a-64-char-random-string-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    JWT_ALGORITHM: str = "HS256"

    # ─── Database ───
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "skilltrace"
    POSTGRES_PASSWORD: str = "skilltrace_dev_secret"
    POSTGRES_DB: str = "skilltrace"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_SYNC(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ─── Redis ───
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # ─── DigiLocker ───
    DIGILOCKER_CLIENT_ID: str = ""
    DIGILOCKER_CLIENT_SECRET: str = ""
    DIGILOCKER_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/digilocker/callback"
    DIGILOCKER_BASE_URL: str = "https://api.digitallocker.gov.in/public/oauth2/1"

    # ─── Twilio ───
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = "whatsapp:+14155238886"
    TWILIO_SMS_NUMBER: str = "+15005550001"
    # Secret used to verify X-Twilio-Signature header on webhook (set empty to skip).
    TWILIO_WEBHOOK_SECRET: str = ""

    # ─── MSG91 SMS ───
    MSG91_AUTH_KEY: str = ""
    MSG91_SENDER_ID: str = "STTRACE"

    # ─── Survey Dispatch ───
    SURVEY_CHANNEL_PREFERENCE: str = "whatsapp"  # whatsapp | sms
    SURVEY_SMS_FALLBACK: bool = True
    SURVEY_RETRY_DAYS: int = 2      # re-attempt after N days if no reply
    SURVEY_MAX_ATTEMPTS: int = 3
    SURVEY_EXPIRY_DAYS: int = 14    # days after which an unanswered survey is expired

    # ─── Celery ───
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ─── Elasticsearch ───
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    # ─── Job Scrapers ───
    INDEED_PUBLISHER_ID: str = ""
    JOB_SCRAPE_MAX_PER_SECTOR: int = 25

    model_config = {"env_file": ".env", "case_sensitive": True}


@lru_cache
def get_settings() -> Settings:
    return Settings()
