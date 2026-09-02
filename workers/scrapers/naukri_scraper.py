"""Naukri.com job scraper.

Uses httpx to fetch the public Naukri search results (JSON API where available)
and parses them into standardized job records. Fails gracefully when the target
source is unavailable or the schema changes.
"""
from __future__ import annotations

import re
from typing import Optional

import httpx

from workers.scrapers.base_scraper import BaseScraper
from workers.nlp import skill_extraction, text_clean

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

SEARCH_URLS = {
    "json": "https://www.naukri.com/jobapi/v3/search",
    "html": "https://www.naukri.com/{query}-jobs-in-{location}",
}


class NaukriScraper(BaseScraper):
    def __init__(self, timeout: int = 20):
        super().__init__("naukri", "https://www.naukri.com")
        self.timeout = timeout

    def _headers(self) -> dict[str, str]:
        return {"User-Agent": USER_AGENT, "Accept": "application/json"}

    async def _fetch(self, url: str, params: Optional[dict] = None, html: bool = False) -> Optional[str]:
        headers = {"User-Agent": USER_AGENT}
        if not html:
            headers["Accept"] = "application/json"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                return resp.text
        except Exception:
            return None

    async def scrape_search(self, query: str, location: str = "") -> list[dict]:
        """Query the Naukri JSON search API and return standardized jobs."""
        params = {
            "q": query,
            "cityType": 0,
            "searchType": "adv",
            "experienceType": "3,4,5",
        }
        if location:
            params["city"] = location

        # 1) Try the JSON endpoint.
        payload = await self._fetch(f"{self.base_url}/jobapi/v3/search", params=params)
        if payload:
            jobs = self._parse_json(payload)
            if jobs:
                return jobs

        # 2) Fallback to HTML endpoint.
        slug = re.sub(r"[^a-z0-9]+", "-", query.lower()).strip("-")
        loc_slug = re.sub(r"[^a-z0-9]+", "-", location.lower()).strip("-") if location else "all-india"
        html = await self._fetch(SEARCH_URLS["html"].format(query=slug, location=loc_slug), html=True)
        if html:
            return self._parse_html(html)

        return []

    async def scrape_trending(self, sectors: list[str] | None = None) -> list[dict]:
        sectors = sectors or ["IT", "Finance", "Healthcare", "Retail"]
        jobs: list[dict] = []
        for sector in sectors:
            jobs.extend(await self.scrape_search(sector))
        return jobs

    def _parse_json(self, payload: str) -> list[dict]:
        import json
        try:
            data = json.loads(payload)
        except Exception:
            return []
        results = data.get("jobDetails", data.get("jobs", []))
        if not isinstance(results, list):
            return []
        return [self.parse_job(r) for r in results if self.parse_job(r)]

    def _parse_html(self, html: str) -> list[dict]:
        # Minimal HTML parsing for fallback: capture common JSON-LD blocks.
        import json
        jobs: list[dict] = []
        for m in re.finditer(
            r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>',
            html,
            re.DOTALL | re.IGNORECASE,
        ):
            try:
                block = json.loads(m.group(1).strip())
            except Exception:
                continue
            if isinstance(block, dict):
                block = [block]
            for job in block:
                if job.get("@type") == "JobPosting":
                    loc = job.get("jobLocation", {}) or {}
                    address = loc.get("address", {}) or {}
                    salary = None
                    bs = job.get("baseSalary", {}) or {}
                    if isinstance(bs, dict):
                        salary = (bs.get("value", {}) or {}).get("value")
                    parsed = self.parse_job({
                        "title": job.get("title", ""),
                        "description": job.get("description", ""),
                        "location": address.get("addressLocality", ""),
                        "state": address.get("addressRegion", ""),
                        "salary": salary,
                        "url": job.get("url", ""),
                    })
                    if parsed:
                        jobs.append(parsed)
        return jobs

    def parse_job(self, raw_data: dict) -> dict:
        """Parse raw Naukri record + run NLP extraction on the description."""
        title = raw_data.get("title", "") or ""
        description = raw_data.get("description", "") or raw_data.get("jobDescription", "") or ""
        cleaned = text_clean.clean_description(description)
        req = skill_extraction.extract_requirements(f"{title} {cleaned}")
        preferred = skill_extraction.extract_preferred_skills(cleaned)
        location = raw_data.get("location", "") or raw_data.get("place", "") or ""
        state = raw_data.get("state", "") or ""
        district = raw_data.get("district", "") or ""

        required_set = set(req["skills"]) - set(preferred)
        return {
            "title": title,
            "description": cleaned,
            "description_raw": description,
            "required_skills": sorted(required_set, key=lambda s: req["skills"].index(s)),
            "preferred_skills": preferred,
            "experience_min_months": req["experience_min_months"],
            "salary_min": req["salary_min"],
            "salary_max": req["salary_max"],
            "location": location,
            "state": state,
            "district": district,
            "source_portal": self.portal_name,
            "source_url": raw_data.get("url", ""),
        }
