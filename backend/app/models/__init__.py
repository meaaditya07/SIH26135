from app.models.user import User, OTPRecord
from app.models.candidate import Candidate
from app.models.training_partner import TrainingPartner
from app.models.employer import Employer
from app.models.course import Course
from app.models.job_posting import JobPosting
from app.models.enrollment import Enrollment
from app.models.employment_outcome import EmploymentOutcome
from app.models.survey_schedule import SurveySchedule
from app.models.survey_template import SurveyTemplate
from app.models.survey_response import SurveyResponse
from app.models.skill_taxonomy import SkillTaxonomy
from app.models.skill_gap import SkillGapScore
from app.models.scheme_analytics import SchemeAnalytics
from app.models.candidate_job_match import CandidateJobMatch
from app.models.job_application import JobApplication
from app.models.notification import Notification, NotificationTemplate

__all__ = [
    "User",
    "OTPRecord",
    "Candidate",
    "TrainingPartner",
    "Employer",
    "Course",
    "JobPosting",
    "Enrollment",
    "EmploymentOutcome",
    "SurveySchedule",
    "SurveyTemplate",
    "SurveyResponse",
    "SkillTaxonomy",
    "SkillGapScore",
    "SchemeAnalytics",
    "CandidateJobMatch",
    "JobApplication",
    "Notification",
    "NotificationTemplate",
]
