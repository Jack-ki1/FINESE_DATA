from pathlib import Path

import httpx
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.schema import Dataset
from backend.app.schemas.ai import AIInsightRequest, AIInsightResponse
from backend.app.security import APIException
from backend.app.services.dataset_service import DatasetService


class AIService:
    @staticmethod
    async def generate_insight(db: Session, req: AIInsightRequest) -> AIInsightResponse:
        if not req.user_consent:
            raise APIException(
                400,
                "CONSENT_REQUIRED",
                "User consent is required before sharing data context with AI services.",
            )

        provenance = {
            "mode": "deterministic_grounded",
            "dataset_id": req.dataset_id,
            "fields_analyzed": [],
        }

        context_str = ""
        if req.dataset_id:
            ds = (
                db.query(Dataset)
                .filter(Dataset.id == req.dataset_id, Dataset.is_deleted == False)
                .first()
            )
            if not ds:
                raise APIException(404, "DATASET_NOT_FOUND", "Dataset not found.")

            df = DatasetService.load_dataframe(Path(ds.storage_path))
            profile = DatasetService.profile_dataframe(df, ds.id, ds.name)

            provenance["fields_analyzed"] = [col.name for col in profile.column_profiles]
            provenance["row_count"] = profile.rows
            provenance["quality_score"] = profile.quality_score
            provenance["missing_cells"] = profile.missing_count
            provenance["duplicates"] = profile.duplicates_count

            num_cols = [c.name for c in profile.column_profiles if c.type == "Number"]
            cat_cols = [c.name for c in profile.column_profiles if c.type in ("Text", "Categorical")]
            context_str = (
                f"Dataset: {ds.name} ({profile.rows} rows, {profile.columns} columns). "
                f"Quality score: {profile.quality_score}/100. "
                f"Numeric fields: {', '.join(num_cols) if num_cols else 'None'}. "
                f"Categorical fields: {', '.join(cat_cols) if cat_cols else 'None'}."
            )

        if settings.OPENAI_API_KEY:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    response = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": (
                                        "You are FINESE DATA Assistant. Give concise answers based strictly "
                                        "on the supplied context. Do not invent figures or claim to have run "
                                        "an analysis that is not present in the context."
                                    ),
                                },
                                {
                                    "role": "user",
                                    "content": f"{context_str}\n\nUser Question: {req.prompt}",
                                },
                            ],
                            "max_tokens": req.max_tokens,
                            "temperature": 0.2,
                        },
                    )
            except httpx.TimeoutException as exc:
                raise APIException(
                    504, "AI_PROVIDER_TIMEOUT", "The AI provider did not respond in time."
                ) from exc
            except httpx.RequestError as exc:
                raise APIException(
                    502, "AI_PROVIDER_UNAVAILABLE", "The AI provider could not be reached."
                ) from exc

            if not response.is_success:
                raise APIException(
                    502, "AI_PROVIDER_ERROR", "The AI provider could not complete the request."
                )

            try:
                provider_data = response.json()
                answer = provider_data["choices"][0]["message"]["content"]
                tokens = provider_data.get("usage", {}).get("total_tokens", 0)
            except (ValueError, KeyError, IndexError, TypeError, AttributeError) as exc:
                raise APIException(
                    502, "AI_PROVIDER_INVALID_RESPONSE", "The AI provider returned an invalid response."
                ) from exc

            if not isinstance(answer, str) or not answer.strip() or not isinstance(tokens, int):
                raise APIException(
                    502, "AI_PROVIDER_INVALID_RESPONSE", "The AI provider returned an invalid response."
                )

            provenance["mode"] = "openai_proxy"
            return AIInsightResponse(
                insight=answer.strip(),
                provenance=provenance,
                model_used="gpt-4o-mini",
                tokens_used=tokens,
                computation_verified=False,
            )

        lower_prompt = req.prompt.lower()
        computation_verified = True
        if req.dataset_id:
            if any(word in lower_prompt for word in ("quality", "missing", "clean", "null")):
                insight_text = (
                    f"Local data quality verification: The dataset has {provenance['row_count']} rows. "
                    f"{provenance['missing_cells']} cells are missing and {provenance['duplicates']} exact "
                    f"duplicate rows were detected. The heuristic quality score is "
                    f"{provenance['quality_score']}/100."
                )
            elif any(word in lower_prompt for word in ("feature", "column", "schema", "type")):
                fields = ", ".join(provenance["fields_analyzed"])
                insight_text = f"Verified schema: {fields}. These were extracted directly from the stored dataset."
            elif any(word in lower_prompt for word in ("model", "ml", "train", "predict")):
                computation_verified = False
                insight_text = (
                    "No model was trained. Before training, review the target distribution and check for "
                    "data leakage; use the ML endpoint for an actual evaluation."
                )
            else:
                computation_verified = False
                insight_text = (
                    "The local analyst has not run an analysis for that question. Ask about data quality, "
                    "missing values, duplicates, or the dataset schema."
                )
        else:
            computation_verified = False
            insight_text = (
                "No dataset was provided, so no data analysis was performed. "
                "Import a dataset to get a verified local summary."
            )

        return AIInsightResponse(
            insight=insight_text,
            provenance=provenance,
            model_used="finese-deterministic-local",
            tokens_used=len(insight_text.split()),
            computation_verified=computation_verified,
        )
