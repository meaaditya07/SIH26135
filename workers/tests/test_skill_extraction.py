"""Tests for the NLP skill-extraction module (no DB required)."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from workers.nlp.skill_extraction import (
    clean_text,
    extract_requirements,
    extract_skills,
    extract_experience,
    extract_salary,
    extract_preferred_skills,
)


def test_clean_text_normalizes_whitespace():
    assert clean_text("  Hello   World\u00a0! \n  Next  ") == "Hello World ! \n Next"


def test_extract_skills_identifies_canonical_skills():
    text = "Need a Python developer who knows Django, FastAPI and AWS."
    skills = extract_skills(text)
    assert "Python" in skills
    assert "Django" in skills
    assert "FastAPI" in skills
    assert "AWS" in skills


def test_extract_skills_case_insensitive_with_aliases():
    text = "Experience required with nodejs, postgresql, and ruby on rails."
    skills = extract_skills(text)
    assert "Node.js" in skills
    assert "SQL" in skills  # postgresql -> SQL alias
    assert "Ruby on Rails" in skills


def test_extract_skills_no_false_stopword_hits():
    # Ensure everyday words are not classified as skills.
    text = "We need a good team player with working knowledge."
    skills = extract_skills(text)
    assert "teamwork" not in skills  # 'team' is a stop token; 'team player' is a skill
    # 'team player' should be matched as Teamwork
    assert "Teamwork" in skills


def test_extract_experience():
    assert extract_experience("5+ years experience") == 60
    assert extract_experience("2-4 years of Node.js") == 24
    assert extract_experience("6 months internship") == 6
    assert extract_experience("no requirement") is None


def test_extract_salary_range_monthly():
    low, high = extract_salary("Salary 12,000 - 18,000 per month")
    assert (low, high) == (12000, 18000)


def test_extract_salary_lpa_converted_to_monthly():
    low, high = extract_salary("Compensation: 18-25 LPA")
    # 18 LPA / 12 = 150000, 25 LPA / 12 ~= 208333
    assert low == 150000
    assert 208000 <= high <= 208500


def test_extract_requirements_bundle():
    text = (
        "Senior Data Scientist with 3+ years. Skills: Python, Pandas, "
        "TensorFlow, SQL. Compensation 20-30 LPA."
    )
    req = extract_requirements(text)
    assert "Python" in req["skills"]
    assert "TensorFlow" in req["skills"]
    assert req["experience_min_months"] == 36
    assert req["salary_min"] > 0


def test_extract_preferred_skills():
    text = (
        "Required: Python and Django. Nice to have: Kubernetes and Docker. "
        "Must know SQL."
    )
    preferred = extract_preferred_skills(text)
    assert "Kubernetes" in preferred
    assert "Docker" in preferred
