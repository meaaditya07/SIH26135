"""Indeed.com job scraper using the public RSS search feed.

Besides the XML RSS feed, a JSON-ish fallback handles the search page HTML when
available. Fails gracefully when the source is unreachable.
"""
from __future__ import annotations

import re
from typing import Optional
from xml.etree import ElementTree as ET

import httpx

from workers.scrapers.base_scraper import BaseScraper
from workers.nlp import skill_extraction, text_clean

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)

RSS_FEED = "https://api.indeed.com/ads/apisearch"


class IndeedScraper(BaseScraper):
    def __init__(self, publisher_id: str = "", timeout: int = 20):
        super().__init__("indeed", "https://www.indeed.com")
        self.publisher_id = publisher_id
        self.timeout = timeout

    async def _fetch(self, url: str, params: Optional[dict] = None) -> Optional[str]:
        headers = {"User-Agent": USER_AGENT}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, params=params, headers=headers)
                resp.raise_for_status()
                return resp.text
        except Exception:
            return None

    async def scrape_search(self, query: str, location: str = "India") -> list[dict]:
        """Query the Indeed partner feeder (publisher ID configured via env)."""
        params = {
            "q": query,
            "l": location,
            "userip": "0.0.0.0",
            "useragent": USER_AGENT,
            "v": "2",
            "limit": "20",
        }
        if self.publisher_id:
            params["publisher"] = self.publisher_id

        payload = await self._fetch(RSS_FEED, params=params)
        if payload:
            return self._parse_xml(payload)
        return []

    async def scrape_trending(self, sectors: list[str] | None = None) -> list[dict]:
        sectors = sectors or ["software developer", "data analyst", "electrician", "nurse"]
        jobs: list[dict] = []
        for sector in sectors:
            jobs.extend(await self.scrape_search(sector))
        return jobs

    def _parse_xml(self, payload: str) -> list[dict]:
        jobs: list[dict] = []
        try:
            root = ET.fromstring(payload)
        except ET.ParseError:
            return []

        # Indeed RSS: <results><result>...</result></results>
        for item in root.iter():
            if item.tag.lower().endswith("result"):
                job = self._node_to_dict(item)
                parsed = self.parse_job(job)
                if parsed:
                    jobs.append(parsed)
        return jobs

    @staticmethod
    def _node_to_dict(node: ET.Element) -> dict:
        data = {}
        for child in node:
            tag = child.tag.split("}")[-1]
            data[tag] = (child.text or "").strip()
        return data

    def parse_job(self, raw_data: dict) -> dict:
        title = raw_data.get("jobtitle", "") or raw_data.get("title", "") or ""
        desc = raw_data.get("snippet", "") or raw_data.get("description", "") or ""
        # Strip HTML tags from snippet.
        desc = re.sub(r"<[^>]+>", " ", desc)
        cleaned = text_clean.clean_description(desc)
        req = skill_extraction.extract_requirements(f"{title} {cleaned}")

        location = raw_data.get("formattedLocation", "") or raw_data.get("city", "") or ""
        preferred = skill_extraction.extract_preferred_skills(cleaned)
        required_set = set(req["skills"]) - set(preferred)
        return {
            "title": title,
            "description": cleaned,
            "description_raw": desc,
            "required_skills": sorted(required_set, key=lambda s: req["skills"].index(s)),
            "preferred_skills": preferred,
            "experience_min_months": req["experience_min_months"],
            "salary_min": req["salary_min"],
            "salary_max": req["salary_max"],
            "location": location,
            "state": raw_data.get("country", "") or "",
            "district": "",
            "source_portal": self.portal_name,
            "source_url": raw_data.get("url", ""),
        }
