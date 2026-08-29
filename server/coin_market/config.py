from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_int(name: str, default: int) -> int:
    value = os.environ.get(name)
    return default if value is None else int(value)


@dataclass(frozen=True)
class Settings:
    site_url: str
    data_root: Path
    database_path: Path
    market_enabled: bool
    min_usdt_micro: int
    min_increment_micro: int
    protection_seconds: int
    power_lifetime_seconds: int
    quote_seconds: int
    incoming_countdown_seconds: int
    audience_floor_enabled: bool
    audience_floor_cpm_micro: int
    tron_provider: str
    tron_network: str
    trongrid_api_key: str
    receive_address: str
    contract_address: str
    admin_password: str
    session_secret: str
    analytics_secret: str
    telegram_bot_token: str
    telegram_admin_chat_id: str
    telegram_public_channel_id: str
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str
    smtp_from: str
    public_analytics_url: str
    quote_rate_limit_per_hour: int
    quote_expiry_cooldown_count: int
    quote_expiry_cooldown_seconds: int

    @classmethod
    def from_env(cls) -> "Settings":
        data_root = Path(os.environ.get("COIN_MARKET_DATA_ROOT", "/var/lib/coin-im-market"))
        min_usdt = 1
        increment_usdt = env_int("TAKEOVER_MIN_INCREMENT_USDT", 1)
        audience_cpm = env_int("AUDIENCE_FLOOR_CPM_USDT", 5)
        session_secret = os.environ.get("SESSION_SECRET", "")
        return cls(
            site_url=os.environ.get("SITE_URL", "https://coin.im").rstrip("/"),
            data_root=data_root,
            database_path=Path(os.environ.get("DATABASE_URL", str(data_root / "market.sqlite3")).removeprefix("sqlite:///")),
            market_enabled=env_bool("TAKEOVER_MARKET_ENABLED", False),
            min_usdt_micro=min_usdt * 1_000_000,
            min_increment_micro=increment_usdt * 1_000_000,
            protection_seconds=0,
            power_lifetime_seconds=env_int("TAKEOVER_POWER_LIFETIME_SECONDS", 86400),
            quote_seconds=env_int("TAKEOVER_QUOTE_SECONDS", 420),
            incoming_countdown_seconds=0,
            audience_floor_enabled=env_bool("AUDIENCE_FLOOR_ENABLED", False),
            audience_floor_cpm_micro=audience_cpm * 1_000_000,
            tron_provider=os.environ.get("TRON_PROVIDER", "disabled").strip().lower(),
            tron_network=os.environ.get("TRON_NETWORK", "mainnet").strip().lower(),
            trongrid_api_key=os.environ.get("TRONGRID_API_KEY", "").strip(),
            receive_address=os.environ.get("USDT_TRC20_RECEIVE_ADDRESS", "").strip(),
            contract_address=os.environ.get("USDT_TRC20_CONTRACT_ADDRESS", "").strip(),
            admin_password=os.environ.get("ADMIN_PASSWORD", ""),
            session_secret=session_secret,
            analytics_secret=os.environ.get("ANALYTICS_SECRET", session_secret),
            telegram_bot_token=os.environ.get("TELEGRAM_BOT_TOKEN", "").strip(),
            telegram_admin_chat_id=os.environ.get("TELEGRAM_ADMIN_CHAT_ID", "").strip(),
            telegram_public_channel_id=os.environ.get("TELEGRAM_PUBLIC_CHANNEL_ID", "").strip(),
            smtp_host=os.environ.get("SMTP_HOST", "").strip(),
            smtp_port=env_int("SMTP_PORT", 465),
            smtp_username=os.environ.get("SMTP_USERNAME", "").strip(),
            smtp_password=os.environ.get("SMTP_PASSWORD", ""),
            smtp_from=os.environ.get("SMTP_FROM", "").strip(),
            public_analytics_url=os.environ.get("PUBLIC_ANALYTICS_URL", "").strip(),
            quote_rate_limit_per_hour=env_int("TAKEOVER_QUOTE_RATE_LIMIT_PER_HOUR", 5),
            quote_expiry_cooldown_count=env_int("TAKEOVER_QUOTE_EXPIRY_COOLDOWN_COUNT", 3),
            quote_expiry_cooldown_seconds=env_int("TAKEOVER_QUOTE_EXPIRY_COOLDOWN_SECONDS", 3600),
        )

    @property
    def production_ready(self) -> bool:
        return bool(
            self.market_enabled
            and self.tron_provider == "trongrid"
            and self.trongrid_api_key
            and self.receive_address
            and self.contract_address
            and self.admin_password
            and len(self.session_secret) >= 32
        )

    @property
    def is_local(self) -> bool:
        return self.site_url.startswith("http://127.0.0.1") or self.site_url.startswith("http://localhost")

    @property
    def notification_channels(self) -> list[str]:
        channels: list[str] = []
        if self.smtp_host and self.smtp_from:
            channels.append("email")
        if self.telegram_bot_token:
            channels.append("telegram")
        return channels
