from typing import Optional

import httpx

from app.config import DATACOMMONS_BASE_URL
from app.models import ObservationPoint


class DataCommonsClient:
    def __init__(self, base_url: str = DATACOMMONS_BASE_URL) -> None:
        self.base_url = base_url.rstrip("/")

    def _post(self, path: str, payload: dict) -> dict:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{self.base_url}{path}",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return response.json()

    def resolve_country(self, name: str) -> Optional[str]:
        data = self._post("/v2/resolve", {"nodes": [name]})
        entities = data.get("entities", [])
        if not entities:
            return None
        candidates = entities[0].get("candidates", [])
        return candidates[0]["dcid"] if candidates else None

    def search_indicators(self, query: str, limit: int = 5) -> list:
        data = self._post(
            "/v2/resolve",
            {"nodes": [query], "resolver": "indicator"},
        )
        entities = data.get("entities", [])
        if not entities:
            return []
        return entities[0].get("candidates", [])[:limit]

    def get_observations(
        self,
        entity_dcid: str,
        variable_dcids: list,
    ) -> list:
        if not entity_dcid or not variable_dcids:
            return []

        data = self._post(
            "/v2/observation",
            {
                "date": "LATEST",
                "entity": {"dcids": [entity_dcid]},
                "variable": {"dcids": variable_dcids},
                "select": ["entity", "variable", "value", "date", "facet"],
            },
        )

        points = []
        by_variable = data.get("byVariable", {})
        for dcid in variable_dcids:
            entity_block = by_variable.get(dcid, {}).get("byEntity", {}).get(
                entity_dcid, {}
            )
            facets = entity_block.get("orderedFacets", [])
            if not facets:
                points.append(
                    ObservationPoint(
                        dcid=dcid,
                        name=dcid.split("/")[-1],
                        value=None,
                        date=None,
                        source="UN Data Commons",
                    )
                )
                continue

            facet = facets[0]
            observations = facet.get("observations", [])
            if not observations:
                continue

            observation = observations[-1]
            provenance = facet.get("provenanceUrl") or facet.get("importName")
            points.append(
                ObservationPoint(
                    dcid=dcid,
                    name=dcid.split("/")[-1],
                    value=observation.get("value"),
                    date=observation.get("date"),
                    source=provenance or "UN Data Commons",
                )
            )
        return points
