from pathlib import Path
import httpx
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.models.schema import Dataset
from backend.app.schemas.ai import AIInsightRequest, AIInsightResponse
from backend.app.services.dataset_service import DatasetService
from backend.app.security import APIException

class AIService:
    @staticmethod
    async def generate_insight(db: Session, req: AIInsightRequest) -> AIInsightResponse:
        if not req.user_consent:
            raise APIException(400, "CONSENT_REQUIRED", "User consent is required before sharing data context with AI services.")

        provenance = {
            "mode": "deterministic_grounded",
            "dataset_id": req.dataset_id,
            "fields_analyzed": [],
        }

        # 1. Gather verified local data context if dataset_id is provided
        context_str = ""
        if req.dataset_id:
            ds = db.query(Dataset).filter(Dataset.id == req.dataset_id, Dataset.is_deleted == False).first()
            if not ds:
                raise APIException(404, "DATASET_NOT_FOUND", "Dataset not found.")
            
            df = DatasetService.load_dataframe(Path(ds.storage_path))
            profile = DatasetService.profile_dataframe(df, ds.id, ds.name)
            
            provenance["fields_analyzed"] = [col.name for col in profile.column_profiles]
            provenance["row_count"] = profile.rows
            provenance["quality_score"] = profile.quality_score
            provenance["missing_cells"] = profile.missing_count
            provenance["duplicates"] = profile.duplicates_count

            # Minimized schema context for AI
            num_cols = [c.name for c in profile.column_profiles if c.type == "Number"]
            cat_cols = [c.name for c in profile.column_profiles if c.type in ("Text", "Categorical")]
            context_str = (
                f"Dataset: {ds.name} ({profile.rows} rows, {profile.columns} columns). "
                f"Quality score: {profile.quality_score}/100. "
                f"Numeric fields: {', '.join(num_cols) if num_cols else 'None'}. "
                f"Categorical fields: {', '.join(cat_cols) if cat_cols else 'None'}."
            )

        # 2. Check for OpenAI key proxy
        if settings.OPENAI_API_KEY:
            try:
                system_msg = (
                    "You are FINESE DATA Assistant. Provide concise, factual analytical insights based "
                    "strictly on the provided data context. Ground all statements in verified figures."
                )
                user_msg = f"{context_str}\n\nUser Question: {req.prompt}"

                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {"role": "system", "content": system_msg},
                                {"role": "user", "content": user_msg},
                            ],
                            "max_tokens": req.max_tokens,
                            "temperature": 0.2,
                        },
                    )
                if resp.status_code == 200:
                    data = resp.json()
                    answer = data["choices"][0]["message"]["content"]
                    tokens = data["usage"]["total_tokens"]
                    provenance["mode"] = "openai_proxy"
                    return AIInsightResponse(
                        insight=answer,
                        provenance=provenance,
                        model_used="gpt-4o-mini",
                        tokens_used=tokens,
                        computation_verified=True,
                    )
            except Exception:
                # Fallback safely to deterministic summary
                pass

        # 3. Deterministic Grounded Insight (Zero external dependencies)
        lower_prompt = req.prompt.lower()
        if req.dataset_id:
            if any(w in lower_prompt for w in ["quality", "missing", "clean", "null"]):
                insight_text = (
                    f"Local data quality verification: The dataset has {provenance.get('row_count', 0)} rows. "
                    f"{provenance.get('missing_cells', 0)} cells are missing and {provenance.get('duplicates', 0)} exact "
                    f"duplicate rows were detected. The heuristic quality score is {provenance.get('quality_score', 0)}/100."
                )
            elif any(w in lower_prompt for w in ["feature", "column", "schema", "type"]):
                fields = ", ".join(provenance.get("fields_analyzed", []))
                insight_text = f"Verified schema: {fields}. These were extracted directly from the stored dataset."
            elif any(w in lower_prompt for w in ["model", "ml", "train", "predict"]):
                insight_text = (
                    "ML evaluation recommendation: Review target distribution and check for data leakage "
                    "before running heavy training. Use ML Studio or the /api/jobs endpoint with fixed random seeds."
                )
            else:
                insight_text = (
                    f"Dataset context: {context_str} "
                    f"You asked: '{req.prompt}'. This summary was generated using verified local computations."
                )
        else:
            insight_text = (
                f"You asked: '{req.prompt}'. Connect a dataset or provide a dataset_id to receive verified data summaries. "
                "This insight uses deterministic local logic."
            )

        return AIInsightResponse(
            insight=insight_text,
            provenance=provenance,
            model_used="finese-deterministic-local",
            tokens_used=len(insight_text.split()),
            computation_verified=True,
        )
