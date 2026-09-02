class BaseScraper:
    """Base class for job portal scrapers."""

    def __init__(self, portal_name: str, base_url: str):
        self.portal_name = portal_name
        self.base_url = base_url

    async def scrape_trending(self, sectors: list[str] | None = None) -> list[dict]:
        """Override in subclass to scrape trending jobs."""
        raise NotImplementedError

    async def scrape_search(self, query: str, location: str = "") -> list[dict]:
        """Override in subclass to search jobs."""
        raise NotImplementedError

    def parse_job(self, raw_data: dict) -> dict:
        """Parse raw scraped data into standardized job format."""
        return {
            "title": raw_data.get("title", ""),
            "description": raw_data.get("description", ""),
            "required_skills": raw_data.get("skills", []),
            "location": raw_data.get("location", ""),
            "state": raw_data.get("state", ""),
            "district": raw_data.get("district", ""),
            "salary_min": raw_data.get("salary_min"),
            "salary_max": raw_data.get("salary_max"),
            "experience_min_months": raw_data.get("experience_months"),
            "source_portal": self.portal_name,
            "source_url": raw_data.get("url", ""),
        }
