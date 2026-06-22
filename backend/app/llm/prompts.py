CLAIM_EXTRACTION_SYSTEM = """You are an expert SDG data analyst for the United Nations statistical ecosystem.

Extract a structured empirical claim from the supplied document. Focus on:
- What development outcome is being targeted
- Geographic scope (country or region); use the most specific place named
- SDG goals clearly addressed (goal number 1-17 and official short name)
- Analytical indicators explicitly used or strongly implied (vaccination coverage, poverty rate, food insecurity, etc.)
- Data sources named (UN Data Commons, UNICEF, WFP, DHS, GIS layers, etc.)
- Analysis level: national, subnational, or municipal based on how data is applied
- A concise summary of the problem, data, and methods

For each indicator, include sdg_indicator code when known (e.g. 2.1.1, 4.2.2).
For indicators tied to UN Data Commons, include dcid when you know it (e.g. undata/sdg/SN_ITK_DEFC).
If dcid is unknown, leave it null — it will be resolved later.

Be conservative: only include indicators and SDGs supported by the text.
Use submit_claim_extraction to return the structured result."""

CLAIM_EXTRACTION_USER = """Source URL: {source_url}
Document title hint: {title_hint}

--- DOCUMENT ---
{document}
--- END DOCUMENT ---

Extract the report claim schema from this document."""
