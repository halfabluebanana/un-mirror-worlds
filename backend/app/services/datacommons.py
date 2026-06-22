from typing import Optional

import httpx

from app.config import DATACOMMONS_BASE_URL
from app.models import ObservationPoint

# Maps importName shortcodes to human-readable agency + method descriptions
_IMPORT_NAME_METADATA: dict[str, dict] = {
    "unicef":   {"agency": "UNICEF",       "method": "JMP modelled estimate"},
    "who":      {"agency": "WHO",           "method": "Modelled estimate"},
    "worldbank":{"agency": "World Bank",    "method": "Modelled estimate"},
    "ilo":      {"agency": "ILO",           "method": "ILO modelled estimate"},
    "fao":      {"agency": "FAO",           "method": "Administrative / reported"},
    "unsd":     {"agency": "UNSD",          "method": "National reported"},
    "undesa":   {"agency": "UNDESA",        "method": "Direct count / projection"},
    "wfp":      {"agency": "WFP",           "method": "Operational survey"},
    "unhcr":    {"agency": "UNHCR",         "method": "Administrative / reported"},
}


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

        facets_meta = data.get("facets", {})
        points = []
        by_variable = data.get("byVariable", {})

        for dcid in variable_dcids:
            # API keys byVariable by the full DCID as sent; fall back to bare name
            entity_block = (
                by_variable.get(dcid, {})
                or by_variable.get(dcid.split("/")[-1], {})
            ).get("byEntity", {}).get(entity_dcid, {})

            facet_list = entity_block.get("orderedFacets", [])
            if not facet_list:
                points.append(
                    ObservationPoint(
                        dcid=dcid,
                        name=dcid.split("/")[-1],
                        value=None,
                        date=None,
                        source="UN Data Commons",
                        data_available=False,
                    )
                )
                continue

            facet = facet_list[0]
            observations = facet.get("observations", [])
            if not observations:
                points.append(
                    ObservationPoint(
                        dcid=dcid,
                        name=dcid.split("/")[-1],
                        value=None,
                        date=None,
                        source="UN Data Commons",
                        data_available=False,
                    )
                )
                continue

            observation = observations[-1]
            facet_id = str(facet.get("facetId", ""))
            facet_detail = facets_meta.get(facet_id, {})
            import_name = facet_detail.get("importName", "")
            import_meta = _IMPORT_NAME_METADATA.get(import_name.lower(), {})

            points.append(
                ObservationPoint(
                    dcid=dcid,
                    name=dcid.split("/")[-1],
                    value=observation.get("value"),
                    date=observation.get("date"),
                    source=import_name or "UN Data Commons",
                    agency=import_meta.get("agency", import_name or None),
                    measurement_method=import_meta.get("method"),
                    observation_period=facet_detail.get("observationPeriod"),
                    unit=facet_detail.get("unit"),
                    earliest_date=facet.get("earliestDate"),
                    latest_date=facet.get("latestDate"),
                    obs_count=facet.get("obsCount"),
                    data_available=True,
                )
            )
        return points
