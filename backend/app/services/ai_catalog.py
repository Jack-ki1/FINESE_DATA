"""AI provider catalog and user-selectable model registry.

The catalog is declarative: the frontend renders providers, models, limits and
settings from this single source so the selections stay in sync with what the
backend can actually call. All OpenAI-compatible gateways share one transport.
"""
from typing import Any
from backend.app.config import settings

# provider id -> gateway configuration
PROVIDERS: dict[str, dict[str, Any]] = {
    "auto": {"label": "Auto (best available key)", "kind": "auto", "env": None, "docs": ""},
    "local": {"label": "Local deterministic engine", "kind": "local", "env": None, "docs": "Runs on the FINESE compute server; no data leaves your infrastructure."},
    "openai": {"label": "OpenAI", "kind": "openai", "env": "OPENAI_API_KEY", "base": "https://api.openai.com/v1"},
    "anthropic": {"label": "Anthropic", "kind": "anthropic_chat", "env": "ANTHROPIC_API_KEY", "base": "https://api.anthropic.com/v1"},
    "google": {"label": "Google Gemini", "kind": "gemini", "env": "GOOGLE_API_KEY", "base": "https://generativelanguage.googleapis.com/v1beta"},
    "openrouter": {"label": "OpenRouter", "kind": "openai_compatible", "env": "OPENROUTER_API_KEY", "base": "https://openrouter.ai/api/v1"},
    "groq": {"label": "Groq", "kind": "openai_compatible", "env": "GROQ_API_KEY", "base": "https://api.groq.com/openai/v1"},
    "deepseek": {"label": "DeepSeek", "kind": "openai_compatible", "env": "DEEPSEEK_API_KEY", "base": "https://api.deepseek.com/v1"},
    "mistral": {"label": "Mistral AI", "kind": "openai_compatible", "env": "MISTRAL_API_KEY", "base": "https://api.mistral.ai/v1"},
    "together": {"label": "Together AI", "kind": "openai_compatible", "env": "TOGETHER_API_KEY", "base": "https://api.together.xyz/v1"},
    "fireworks": {"label": "Fireworks AI", "kind": "openai_compatible", "env": "FIREWORKS_API_KEY", "base": "https://api.fireworks.ai/inference/v1"},
    "perplexity": {"label": "Perplexity", "kind": "openai_compatible", "env": "PERPLEXITY_API_KEY", "base": "https://api.perplexity.ai"},
    "xai": {"label": "xAI Grok", "kind": "openai_compatible", "env": "XAI_API_KEY", "base": "https://api.x.ai/v1"},
    "cerebras": {"label": "Cerebras", "kind": "openai_compatible", "env": "CEREBRAS_API_KEY", "base": "https://api.cerebras.ai/v1"},
    "moonshot": {"label": "Moonshot (Kimi)", "kind": "openai_compatible", "env": "MOONSHOT_API_KEY", "base": "https://api.moonshot.ai/v1"},
    "nvidia": {"label": "NVIDIA NIM", "kind": "openai_compatible", "env": "NVIDIA_API_KEY", "base": "https://integrate.api.nvidia.com/v1"},
    "ollama": {"label": "Ollama (self-hosted)", "kind": "openai_compatible", "env": "OLLAMA_BASE_URL", "base": "http://127.0.0.1:11434/v1"},
    "azure": {"label": "Azure OpenAI", "kind": "openai_compatible", "env": "AZURE_OPENAI_API_KEY", "base": ""},
    "custom": {"label": "Custom OpenAI-compatible endpoint", "kind": "openai_compatible", "env": "CUSTOM_AI_API_KEY", "base": ""},
}

# (provider, model id, label, context window, tier)
MODELS: list[tuple[str, str, str, str, str]] = [
    ("openai", "gpt-4.1", "GPT-4.1", "1M", "frontier"),
    ("openai", "gpt-4.1-mini", "GPT-4.1 mini", "1M", "balanced"),
    ("openai", "gpt-4.1-nano", "GPT-4.1 nano", "1M", "fast"),
    ("openai", "gpt-4o", "GPT-4o", "128K", "frontier"),
    ("openai", "gpt-4o-mini", "GPT-4o mini", "128K", "balanced"),
    ("openai", "o3", "o3", "200K", "reasoning"),
    ("openai", "o4-mini", "o4-mini", "200K", "reasoning"),
    ("openai", "gpt-5", "GPT-5", "400K", "frontier"),
    ("openai", "gpt-5-mini", "GPT-5 mini", "400K", "balanced"),
    ("anthropic", "claude-sonnet-4-5-20250929", "Claude Sonnet 4.5", "200K", "frontier"),
    ("anthropic", "claude-3-7-sonnet-latest", "Claude 3.7 Sonnet", "200K", "frontier"),
    ("anthropic", "claude-3-5-sonnet-latest", "Claude 3.5 Sonnet", "200K", "balanced"),
    ("anthropic", "claude-3-5-haiku-latest", "Claude 3.5 Haiku", "200K", "fast"),
    ("anthropic", "claude-3-opus-latest", "Claude 3 Opus", "200K", "frontier"),
    ("google", "gemini-2.5-pro", "Gemini 2.5 Pro", "1M", "frontier"),
    ("google", "gemini-2.5-flash", "Gemini 2.5 Flash", "1M", "balanced"),
    ("google", "gemini-2.0-flash", "Gemini 2.0 Flash", "1M", "fast"),
    ("google", "gemini-1.5-pro", "Gemini 1.5 Pro", "2M", "balanced"),
    ("google", "gemini-1.5-flash", "Gemini 1.5 Flash", "1M", "fast"),
    ("openrouter", "openrouter/auto", "OpenRouter Auto", "varies", "auto"),
    ("openrouter", "anthropic/claude-sonnet-4", "Claude Sonnet 4 (OR)", "200K", "frontier"),
    ("openrouter", "google/gemini-2.5-flash", "Gemini 2.5 Flash (OR)", "1M", "balanced"),
    ("openrouter", "meta-llama/llama-3.3-70b-instruct", "Llama 3.3 70B (OR)", "128K", "open"),
    ("openrouter", "deepseek/deepseek-r1", "DeepSeek R1 (OR)", "160K", "reasoning"),
    ("groq", "llama-3.3-70b-versatile", "Llama 3.3 70B", "128K", "fast"),
    ("groq", "llama-3.1-8b-instant", "Llama 3.1 8B", "128K", "fast"),
    ("groq", "qwen/qwen3-32b", "Qwen3 32B", "128K", "open"),
    ("groq", "deepseek-r1-distill-llama-70b", "DeepSeek R1 Distill 70B", "128K", "reasoning"),
    ("deepseek", "deepseek-chat", "DeepSeek Chat", "64K", "balanced"),
    ("deepseek", "deepseek-reasoner", "DeepSeek Reasoner", "64K", "reasoning"),
    ("mistral", "mistral-large-latest", "Mistral Large", "128K", "frontier"),
    ("mistral", "mistral-small-latest", "Mistral Small", "128K", "fast"),
    ("mistral", "codestral-latest", "Codestral", "256K", "code"),
    ("mistral", "pixtral-large-latest", "Pixtral Large", "128K", "multimodal"),
    ("together", "meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B Turbo", "128K", "open"),
    ("together", "Qwen/Qwen2.5-72B-Instruct-Turbo", "Qwen 2.5 72B Turbo", "32K", "open"),
    ("together", "mistralai/Mixtral-8x22B-Instruct-v0.1", "Mixtral 8x22B", "64K", "open"),
    ("fireworks", "accounts/fireworks/models/llama-v3p3-70b-instruct", "Llama 3.3 70B (FW)", "128K", "open"),
    ("fireworks", "accounts/fireworks/models/qwen2p5-72b-instruct", "Qwen 2.5 72B (FW)", "32K", "open"),
    ("perplexity", "sonar-pro", "Sonar Pro", "200K", "search"),
    ("perplexity", "sonar", "Sonar", "128K", "search"),
    ("xai", "grok-3", "Grok 3", "131K", "frontier"),
    ("xai", "grok-3-mini", "Grok 3 mini", "131K", "fast"),
    ("cerebras", "llama-3.3-70b", "Llama 3.3 70B (Cerebras)", "128K", "fast"),
    ("cerebras", "qwen-3-32b", "Qwen3 32B (Cerebras)", "131K", "open"),
    ("moonshot", "moonshot-v1-128k", "Kimi 128K", "128K", "balanced"),
    ("moonshot", "kimi-k2-0711-preview", "Kimi K2", "128K", "frontier"),
    ("nvidia", "meta/llama-3.1-70b-instruct", "Llama 3.1 70B (NIM)", "128K", "open"),
    ("nvidia", "nvidia/nemotron-4-340b-instruct", "Nemotron 4 340B", "4K", "frontier"),
    ("ollama", "llama3.2:3b", "Llama 3.2 3B (local)", "128K", "local"),
    ("ollama", "llama3.1:8b", "Llama 3.1 8B (local)", "128K", "local"),
    ("ollama", "qwen2.5:14b", "Qwen 2.5 14B (local)", "32K", "local"),
    ("ollama", "mistral-nemo", "Mistral Nemo (local)", "128K", "local"),
    ("ollama", "deepseek-r1:14b", "DeepSeek R1 14B (local)", "64K", "local"),
    ("ollama", "phi4", "Phi-4 (local)", "16K", "local"),
    ("azure", "gpt-4o", "GPT-4o (Azure deployment)", "128K", "managed"),
    ("azure", "gpt-4o-mini", "GPT-4o mini (Azure deployment)", "128K", "managed"),
    ("custom", "custom-model", "Custom model name", "varies", "custom"),
]

LOCAL_MODELS = [
    {"id": "finese-insight-v1", "label": "Finese Insight (deterministic statistics)", "tier": "local", "context": "full profile"},
    {"id": "finese-rule-engine", "label": "Finese Rule Engine (explains computed findings)", "tier": "local", "context": "profile + rules"},
]

DEFAULT_PROJECT_SETTINGS: dict[str, Any] = {
    "theme": "light",
    "density": "comfortable",
    "accent": "#0ea5e9",
    "timezone": "UTC",
    "number_format": "en-US",
    "date_format": "YYYY-MM-DD",
    "language": "English",
    "auto_save": True,
    "confirm_destructive": True,
    "show_tooltips": True,
    "animate_charts": True,
    "sections": {
        "upload": True, "overview": True, "cleaning": True, "chat": True, "models": True, "export": True, "settings": True,
    },
    "overview": {
        "kpi_row": ["rows", "columns", "missing", "duplicates", "memory"],
        "preview_rows": 10,
        "preview_columns": 12,
        "column_summary_rows": 15,
        "histogram_bins": 16,
        "outlier_method": "iqr",
        "outlier_threshold": 1.5,
        "correlation_method": "pearson",
        "scatter_sample": 800,
        "auto_expand": "Completeness",
    },
    "cleaning": {
        "default_strategy": "median",
        "constant_value": "Unknown",
        "outlier_threshold": 1.5,
        "duplicate_keep": "first",
        "auto_preview": True,
        "max_versions": 50,
        "category_threshold": 0.9,
    },
    "plots": {
        "palette": "ocean",
        "default_type": "bar",
        "default_aggregation": "sum",
        "default_limit": 20,
        "bins": 20,
        "show_grid": True,
        "show_legend": True,
        "smooth_lines": True,
        "dashboard_columns": 2,
    },
    "models": {
        "default_task": "classification",
        "default_estimator": "random_forest",
        "cv_folds": 5,
        "test_size": 0.2,
        "random_seed": 42,
        "tune": False,
        "sweep_estimators": ["logistic_regression", "random_forest", "extra_trees", "gradient_boosting"],
        "max_candidates": 6,
        "show_learning_curve": True,
    },
    "ai": {
        "provider": "auto",
        "model": "gpt-4o-mini",
        "temperature": 0.2,
        "max_tokens": 900,
        "share_context": True,
        "include_sample_rows": False,
        "system_style": "analyst",
        "custom_base_url": "",
        "monthly_token_budget": 250000,
    },
}


def _key_for(provider_id: str) -> str | None:
    meta = PROVIDERS.get(provider_id) or {}
    if meta.get("kind") == "local" or not meta.get("env"):
        return None
    return getattr(settings, meta["env"], None)


def catalog() -> dict[str, Any]:
    providers = []
    for pid, meta in PROVIDERS.items():
        env = meta.get("env")
        configured = bool(getattr(settings, env, None)) if env and meta.get("kind") not in ("auto", "local") else (meta.get("kind") in ("auto", "local"))
        providers.append({
            "id": pid, "label": meta["label"], "kind": meta["kind"], "env_var": env,
            "configured": configured, "docs": meta.get("docs", ""),
            "models": [{"id": mid, "label": label, "context": ctx, "tier": tier}
                       for pid_, mid, label, ctx, tier in MODELS if pid_ == pid],
        })
    providers[-1]["models"] = [{"id": "custom-model", "label": "Custom model name", "context": "varies", "tier": "custom"}]
    for entry in providers:
        if entry["id"] == "local":
            entry["models"] = LOCAL_MODELS
    for entry in providers:
        if entry["id"] == "auto":
            entry["models"] = []
    return {"providers": providers, "total_models": sum(len(p["models"]) for p in providers),
            "total_providers": len([p for p in providers if p["id"] != "auto"])}


def resolve(provider: str | None, model: str | None) -> dict[str, Any]:
    """Resolve a provider/model pair against configured keys."""
    pid = (provider or "auto").lower()
    if pid not in PROVIDERS:
        raise ValueError(f"Unknown AI provider '{provider}'.")
    if pid == "auto":
        for candidate in ("openai", "anthropic", "google", "openrouter", "groq", "deepseek"):
            if _key_for(candidate):
                pid = candidate
                break
        else:
            return {"provider": "local", "model": "finese-insight-v1", "kind": "local", "reason": "auto-no-key"}
    meta = PROVIDERS[pid]
    if meta["kind"] == "local":
        return {"provider": pid, "model": model or "finese-insight-v1", "kind": "local", "meta": meta}
    key = _key_for(pid)
    if not key:
        return {"provider": pid, "model": model, "kind": meta["kind"], "missing_key": meta.get("env"), "meta": meta}
    default_model = model or (settings.ANTHROPIC_MODEL if pid == "anthropic" else settings.OPENAI_MODEL)
    return {"provider": pid, "model": default_model, "kind": meta["kind"], "key": key, "meta": meta}
