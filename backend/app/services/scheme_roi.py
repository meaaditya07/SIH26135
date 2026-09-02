from dataclasses import dataclass


@dataclass
class SchemeROIMetrics:
    scheme_id: str
    total_enrolled: int
    total_completed: int
    completion_rate: float
    total_placed_12m: int
    placement_rate: float
    total_cost: float
    cost_per_placement: float
    avg_salary: float
    roi_score: float
    curriculum_fit: float
    alert_status: str


def compute_scheme_roi(
    enrolled: int,
    completed: int,
    placed_12m: int,
    retained_6m: int,
    placed_6m: int,
    total_cost: float,
    avg_placement_salary: float,
    sector_avg_salary: float,
    course_skills: list[str],
    market_trending_skills: list[str],
) -> SchemeROIMetrics:
    """
    ROI = (
        0.35 * cpp_normalized +     # Lower CPP = better
        0.30 * salary_ratio +       # Higher salary = better
        0.20 * retention_6m_rate +  # Higher retention = better
        0.15 * curriculum_fit       # Better market alignment = better
    ) * 100
    """
    completion_rate = completed / max(enrolled, 1)
    placement_rate = placed_12m / max(completed, 1)
    retention_6m_rate = retained_6m / max(placed_6m, 1)
    cpp = total_cost / max(placed_12m, 1)
    salary_ratio = avg_placement_salary / max(sector_avg_salary, 1)

    cpp_normalized = max(0, 1 - (cpp / 5000))

    course_set = set(s.lower() for s in course_skills)
    trending_set = set(s.lower() for s in market_trending_skills)
    curriculum_fit = len(course_set & trending_set) / max(len(trending_set), 1)

    roi = (
        0.35 * cpp_normalized +
        0.30 * min(salary_ratio, 1.5) / 1.5 +
        0.20 * retention_6m_rate +
        0.15 * curriculum_fit
    ) * 100

    alert_status = "active"
    reasons = []
    if completion_rate < 0.6:
        reasons.append("low_completion")
    if placement_rate < 0.3:
        reasons.append("low_placement")
    if retention_6m_rate < 0.5:
        reasons.append("low_retention")
    if curriculum_fit < 0.3:
        reasons.append("curriculum_outdated")
    if len(reasons) >= 2:
        alert_status = "underperforming"
    if cpp > 3000 and placement_rate < 0.15:
        alert_status = "alert"

    return SchemeROIMetrics(
        scheme_id="",
        total_enrolled=enrolled,
        total_completed=completed,
        completion_rate=round(completion_rate * 100, 2),
        total_placed_12m=placed_12m,
        placement_rate=round(placement_rate * 100, 2),
        total_cost=total_cost,
        cost_per_placement=round(cpp, 2),
        avg_salary=avg_placement_salary,
        roi_score=round(roi, 2),
        curriculum_fit=round(curriculum_fit * 100, 2),
        alert_status=alert_status,
    )
