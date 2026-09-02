"""Tests for job scrapers — parsing logic only (no network / live portals)."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from workers.scrapers.naukri_scraper import NaukriScraper
from workers.scrapers.indeed_scraper import IndeedScraper


def test_naukri_parse_job_runs_nlp_extraction():
    s = NaukriScraper()
    job = s.parse_job({
        "title": "Backend Engineer",
        "description": (
            "We need a backend engineer with Python and Django. "
            "3+ years experience required. Salary 15-20 LPA. "
            "Nice to have: Kubernetes and Docker."
        ),
        "location": "Bengaluru",
        "state": "Karnataka",
        "url": "https://naukri.com/job/123",
    })
    assert job["title"] == "Backend Engineer"
    assert "Python" in job["required_skills"]
    assert "Django" in job["required_skills"]
    assert job["experience_min_months"] == 36
    # Preferred skills split out.
    assert "Kubernetes" in job["preferred_skills"]
    assert "Docker" in job["preferred_skills"]
    assert "Kubernetes" not in job["required_skills"]


def test_naukri_html_jsonld_parsing():
    s = NaukriScraper()
    html = """
    <html><body>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"Data Analyst",
       "description":"Analyze data with SQL and Python",
       "jobLocation":{"@type":"Place","address":{"addressLocality":"Pune","addressRegion":"Maharashtra"}},
       "url":"https://naukri.com/job/456","baseSalary":{"value":{"value":"10,00,000"}}}
      </script>
    </body></html>
    """
    jobs = s._parse_html(html)
    assert len(jobs) == 1
    assert jobs[0]["title"] == "Data Analyst"
    assert jobs[0]["state"] == "Maharashtra"
    assert "SQL" in jobs[0]["required_skills"] or "Python" in jobs[0]["required_skills"]


def test_indeed_xml_parsing():
    s = IndeedScraper()
    xml = """<?xml version="1.0"?>
    <results>
      <result>
        <jobtitle>React Developer</jobtitle>
        <snippet>Build UIs with React and TypeScript. &lt;b&gt;2+ years&lt;/b&gt;.</snippet>
        <formattedLocation>Mumbai</formattedLocation>
        <url>https://indeed.com/rc/789</url>
      </result>
    </results>
    """
    jobs = s._parse_xml(xml)
    assert len(jobs) == 1
    assert jobs[0]["title"] == "React Developer"
    assert jobs[0]["location"] == "Mumbai"
    assert jobs[0]["source_portal"] == "indeed"


def test_indeed_snippet_html_stripped():
    s = IndeedScraper()
    parsed = s.parse_job({
        "jobtitle": "QA Engineer",
        "snippet": "Test with <b>Selenium</b> and <i>pytest</i>.",
        "location": "Delhi",
    })
    assert "<b>" not in parsed["description"]
    assert "Selenium" in parsed["required_skills"]
    assert "pytest" in [x.lower() for x in parsed["required_skills"]]
