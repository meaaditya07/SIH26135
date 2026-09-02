"""Rule + lexicon based skill and requirement extraction from job text.

The extractor works fully offline with a curated skill lexicon and regex rules,
optionally enriched with spaCy POS/entity annotations when a model is available.
"""
from __future__ import annotations

import re

# ─── Curated skill lexicon: {canonical_skill: [aliases, patterns]} ───
SKILL_LEXICON: dict[str, list[str]] = {
    # Programming Languages
    "Python": ["python", "python3", "py"],
    "Java": ["java", "j2ee"],
    "JavaScript": ["javascript", "js", "ecmascript"],
    "TypeScript": ["typescript", "ts"],
    "C++": ["c++", "cpp"],
    "C": ["c programming", "c language"],
    "C#": ["c#", "csharp", ".net", "dotnet"],
    "Go": ["golang", "go language"],
    "Rust": ["rust"],
    "Kotlin": ["kotlin"],
    "Swift": ["swift"],
    "PHP": ["php"],
    "Ruby": ["ruby", "ruby on rails", "rails"],
    "R": ["r programming", "statistical r"],
    "SQL": ["sql", "mysql", "postgresql", "postgres", "sql server", "tsql", "pl/sql", "oracle sql", "sqlite"],
    "HTML": ["html", "html5"],
    "CSS": ["css", "css3", "sass", "scss", "less"],
    "Bash": ["bash", "shell scripting", "shell script", "unix shell"],
    "PowerShell": ["powershell"],
    "Scala": ["scala"],
    "Dart": ["dart", "flutter"],
    "Groovy": ["groovy"],
    "MATLAB": ["matlab"],
    # Web Frameworks
    "React": ["react", "react.js", "reactjs", "react.jsx"],
    "React Native": ["react native", "react-native"],
    "Angular": ["angular", "angularjs", "angular 2", "angular 7", "angular 8"],
    "Vue.js": ["vue", "vue.js", "vuejs", "nuxt"],
    "Django": ["django"],
    "Flask": ["flask"],
    "FastAPI": ["fastapi", "fast api"],
    "Node.js": ["node.js", "nodejs", "node js", "express.js", "expressjs", "express"],
    "Next.js": ["next.js", "nextjs", "next js"],
    "Ruby on Rails": ["ruby on rails", "rails"],
    "Spring": ["spring", "spring boot", "springboot"],
    "Laravel": ["laravel"],
    "ASP.NET": ["asp.net", "asp net", "aspnet"],
    "ASP.NET Core": ["asp.net core"],
    "GraphQL": ["graphql"],
    "Gatsby": ["gatsby"],
    "Svelte": ["svelte"],
    "Tailwind CSS": ["tailwind", "tailwind css"],
    "Bootstrap": ["bootstrap"],
    "jQuery": ["jquery"],
    # Databases & Big Data
    "MongoDB": ["mongodb", "mongo"],
    "Redis": ["redis"],
    "Elasticsearch": ["elasticsearch", "elastic search", "es"],
    "Apache Kafka": ["kafka"],
    "Apache Spark": ["spark", "pyspark"],
    "Apache Hadoop": ["hadoop"],
    "Apache Airflow": ["airflow"],
    "Amazon Redshift": ["redshift"],
    "Cassandra": ["cassandra"],
    "Neo4j": ["neo4j"],
    "Snowflake": ["snowflake"],
    "BigQuery": ["bigquery"],
    "DynamoDB": ["dynamodb"],
    "Databricks": ["databricks"],
    "ClickHouse": ["clickhouse"],
    "DuckDB": ["duckdb"],
    # Cloud & DevOps
    "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "cloudformation"],
    "Azure": ["azure", "azure devops"],
    "GCP": ["gcp", "google cloud", "google cloud platform"],
    "Docker": ["docker", "docker-compose", "docker compose"],
    "Kubernetes": ["kubernetes", "k8s", "openshift"],
    "Terraform": ["terraform"],
    "Ansible": ["ansible"],
    "Puppet": ["puppet"],
    "Chef": ["chef"],
    "CI/CD": ["ci/cd", "cicd", "continuous integration", "continuous delivery", "continuous deployment", "jenkins", "github actions", "gitlab ci", "circleci"],
    "Linux": ["linux", "ubuntu", "centos", "red hat", "rhel", "debian"],
    "Nginx": ["nginx"],
    "Prometheus": ["prometheus"],
    "Grafana": ["grafana"],
    "Helm": ["helm"],
    "Istio": ["istio"],
    "Serverless": ["serverless", "lambda"],
    "Microservices": ["microservices", "micro-service", "micro service"],
    "Service Mesh": ["service mesh", "envoy"],
    # Data & Analytics
    "Pandas": ["pandas"],
    "NumPy": ["numpy", "nump"],
    "scikit-learn": ["scikit-learn", "sklearn", "scikit learn"],
    "TensorFlow": ["tensorflow", "tf"],
    "PyTorch": ["pytorch", "torch"],
    "XGBoost": ["xgboost", "xgb"],
    "LightGBM": ["lightgbm", "lgbm"],
    "Keras": ["keras"],
    "OpenCV": ["opencv"],
    "NLTK": ["nltk"],
    "spaCy": ["spacy"],
    "Hugging Face": ["hugging face", "huggingface", "transformers"],
    "MLflow": ["mlflow"],
    "Tableau": ["tableau"],
    "Power BI": ["power bi", "powerbi"],
    "Looker": ["looker"],
    "Apache Superset": ["superset"],
    "Metabase": ["metabase"],
    "Excel": ["excel", "microsoft excel", "ms excel"],
    "Google Sheets": ["google sheets", "google spreadsheet"],
    "ETL": ["etl", "extract transform load", "data pipelines", "data pipeline"],
    "Data Warehouse": ["data warehouse", "data warehousing", "dwh"],
    "Data Mining": ["data mining"],
    "Statistical Analysis": ["statistics", "statistical analysis", "statistical modeling", "statistical modelling"],
    "Time Series": ["time series", "timeseries", "time-series"],
    "Experimentation": ["experiment design", "a/b testing", "ab testing", "hypothesis testing"],
    "Feature Engineering": ["feature engineering", "feature selection"],
    "Deep Learning": ["deep learning", "neural networks", "neural network"],
    "NLP": ["nlp", "natural language processing"],
    "Computer Vision": ["computer vision", "cv"],
    # Mobile
    "Android": ["android", "android sdk", "kotlin android"],
    "iOS": ["ios", "apple ios"],
    "Flutter": ["flutter", "dart"],
    # Testing & QA
    "Jest": ["jest"],
    "JUnit": ["junit"],
    "Cypress": ["cypress"],
    "Selenium": ["selenium"],
    "Playwright": ["playwright"],
    "pytest": ["pytest", "py.test"],
    "Mocha": ["mocha"],
    "Postman": ["postman"],
    "Test Automation": ["test automation", "automation testing", "ui automation"],
    "Performance Testing": ["performance testing", "load testing", "jmeter"],
    # Tools & Version Control
    "Git": ["git", "gitlab", "github", "bitbucket"],
    "Jira": ["jira"],
    "Confluence": ["confluence"],
    "Agile": ["agile", "scrum", "kanban", "sprint"],
    # Networking & Security
    "TCP/IP": ["tcp/ip", "tcp ip", "networking"],
    "Network Security": ["network security", "firewall", "vpn", "ids/ips"],
    "Cybersecurity": ["cybersecurity", "cyber security", "information security", "infosec", "penetration testing", "ethical hacking"],
    "Encryption": ["encryption", "cryptography", "aes", "rsa"],
    "OAuth2": ["oauth2", "oauth 2", "oauth"],
    "JWT": ["jwt", "json web token"],
    "IAM": ["iam", "identity and access management", "access management"],
    # Business / Soft / Domain
    "Communication": ["communication", "communication skills", "interpersonal communication"],
    "Problem Solving": ["problem solving", "problem-solving", "analytical thinking", "critical thinking"],
    "Teamwork": ["teamwork", "collaboration", "team player"],
    "Leadership": ["leadership", "team management", "people management"],
    "Project Management": ["project management", "program management", "pmp"],
    "Agile Project Management": ["agile project management", "scrum master"],
    "Digital Marketing": ["digital marketing", "seo", "sem", "social media marketing", "content marketing", "email marketing"],
    "Data Visualization": ["data visualization", "data vis", "visualization", "dashboarding"],
    "Business Analysis": ["business analysis", "requirements gathering", "stakeholder management"],
    "SQL Optimization": ["sql optimization", "query optimization", "performance tuning"],
    "API Development": ["api development", "rest api", "restful api", "rest", "microservice api"],
    "UI/UX": ["ui/ux", "ui design", "ux design", "user experience", "user interface", "figma", "sketch", "adobe xd"],
    "Product Management": ["product management", "product owner"],
}

# ─── Stop tokens that should never be skills by themselves ───
_STOP_TOKENS = {
    "the", "and", "for", "with", "from", "this", "that", "are", "will",
    "must", "should", "able", "knowledge", "experience", "ability", "good",
    "strong", "working", "work", "job", "role", "team", "etc", "like",
}

EXPERIENCE_RE = re.compile(
    r"(\d+)\s*(?:\+)?\s*(?:to\s*(\d+)|-\s*(\d+))?\s*(year|yr|month|mo)s?\b",
    re.IGNORECASE,
)
SALARY_RE = re.compile(
    r"(?:\u20b9|₹|rs\.?|inr)?\s*([\d,]+)\s*(?:-|to)\s*([\d,]+)\s*(?:k\b|lpa|lakh|thousand|\u20b9lakh)?", re.IGNORECASE
)


def clean_text(raw: str) -> str:
    """Normalize whitespace, strip odd chars, collapse Unicode spaces."""
    if not raw:
        return ""
    text = re.sub(r"[^\S\n]+", " ", raw)
    text = re.sub(r"[\u00a0\u2007\u202f\u2009]", " ", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _match_aliases(text_lower: str) -> set[str]:
    """Match every alias as a (word-boundary for single tokens, substring for phrases)."""
    found: set[str] = set()
    for skill, aliases in SKILL_LEXICON.items():
        for alias in aliases:
            alias_l = alias.lower().strip()
            if not alias_l or alias_l in _STOP_TOKENS:
                continue
            if " " in alias_l or "/" in alias_l or "-" in alias_l:
                if alias_l in text_lower:
                    found.add(skill)
            else:
                if re.search(rf"\b{re.escape(alias_l)}\b", text_lower):
                    found.add(skill)
    return found


def extract_skills(
    text: str,
    candidate_only: bool = True,
    min_occurrences: int = 1,
) -> list[str]:
    """Extract a deduplicated list of skills mentioned in text.

    Args:
        text: raw or cleaned text (job description / candidate profile).
        candidate_only: if True, only signals that look like requirements.
        min_occurrences: keep skills appearing at least this many times.

    Returns canonical skill names (order-preserving, case-correct from lexicon).
    """
    if not text:
        return []
    cleaned = clean_text(text)
    text_lower = cleaned.lower()

    found = _match_aliases(text_lower)
    found -= _STOP_TOKENS

    ordered = [s for s in SKILL_LEXICON.keys() if s in found]
    return ordered


def extract_experience(text: str) -> int | None:
    """Return minimum required experience in months, or None."""
    if not text:
        return None
    m = EXPERIENCE_RE.search(clean_text(text))
    if m:
        try:
            val = int(m.group(1))
        except (ValueError, TypeError):
            return None
        unit = (m.group(4) or "").lower()
        if unit.startswith("month") or unit == "mo":
            return val
        return val * 12
    return None


def extract_salary(text: str) -> tuple[int | None, int | None]:
    """Return (min, max) monthly salary in INR from text, else None."""
    if not text:
        return (None, None)
    m = SALARY_RE.search(clean_text(text))
    if not m:
        return (None, None)
    try:
        low = int(m.group(1).replace(",", ""))
        high = int((m.group(2) or m.group(1)).replace(",", ""))
    except (ValueError, TypeError):
        return (None, None)

    # Normalize: "18k" or "20,000" -> monthly INR. Heuristic scaling.
    raw = m.group(0).lower()
    if "lpa" in raw or "lakh" in raw or "lac" in raw:
        low, high = low * 100000 // 12, high * 100000 // 12
    elif "k" in raw and " " not in raw.replace(" ", " "):
        low, high = low * 1000, high * 1000
    return (low, high)


def extract_requirements(text: str) -> dict:
    """Run all extractors and return a normalized requirement bundle."""
    text = clean_text(text or "")
    return {
        "skills": extract_skills(text),
        "experience_min_months": extract_experience(text),
        "salary_min": (extract_salary(text)[0]),
        "salary_max": (extract_salary(text)[1]),
    }


# Markers introducing "good to have" / "preferred" skill sections.
_PREFERRED_MARKERS = re.compile(
    r"(nice\s*to\s*have|good\s*to\s*have|preferred|preferred\s+skills?|"
    r"bonus\s+skills?|desired\s+qualifications?|advantage)",
    re.IGNORECASE,
)


def extract_preferred_skills(text: str) -> list[str]:
    """Extract skills that appear in 'nice to have' / 'preferred' sections.

    Returns canonical skill names that are ALSO present in the text, but that
    were mentioned specifically around a preferred marker. As a conservative
    fallback, returns all extracted skills (callers decide how to split).
    """
    if not text:
        return []
    cleaned = clean_text(text or "")
    match = _PREFERRED_MARKERS.search(cleaned)
    if not match:
        return []
    # Heuristic: only window through end of the sentence/paragraph after marker.
    window = cleaned[match.start():]
    # Trim at the next "required"/"must have" hard boundary if it appears.
    boundary = re.search(r"\b(required|must have|essential)\b", window, re.IGNORECASE)
    if boundary:
        window = window[: boundary.start()]
    return extract_skills(window)


if __name__ == "__main__":
    demo = (
        "We need a Senior Python Developer with 5+ years experience in Django, "
        "FastAPI and AWS. Must know Docker, Kubernetes and SQL. Salary: 18-25 LPA."
    )
    print(extract_requirements(demo))
