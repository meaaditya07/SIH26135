"""Sprint 9 — tests for the notification service (pure logic, no DB)."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.notification_service import (
    APPLICATION_STATUS_NOTIFICATIONS,
    DEFAULT_TEMPLATES,
    build_application_status_variables,
    render_template,
)


def test_render_template_braces():
    assert render_template("Hi {name}, job {job}", {"name": "Asha", "job": "Python Dev"}) == (
        "Hi Asha, job Python Dev"
    )


def test_render_template_double_braces():
    assert render_template("Hi {{name}}!", {"name": "Ravi"}) == "Hi Ravi!"


def test_render_unresolved_variable_left_untouched():
    assert render_template("Hello {missing}", {}) == "Hello {missing}"


def test_build_application_status_variables():
    vars_ = build_application_status_variables("Plumber", "ABC Corp")
    assert vars_["jobTitle"] == "Plumber"
    assert vars_["company"] == "ABC Corp"


def test_default_templates_include_all_status_kinds():
    kinds = {t["kind"] for t in DEFAULT_TEMPLATES}
    assert "job_alert" in kinds
    assert kinds >= {"application_status"}
    status_names = {t["name"] for t in DEFAULT_TEMPLATES}
    for key in APPLICATION_STATUS_NOTIFICATIONS:
        assert f"app_{key}" in status_names, f"missing template for {key}"


def test_every_default_template_renders_with_its_variables():
    for tpl in DEFAULT_TEMPLATES:
        variables = {
            (slot if isinstance(slot, str) else slot["key"]): "x"
            for slot in tpl.get("variables", [])
        }
        rendered = render_template(tpl["body"], variables)
        assert "{" not in rendered, f"template {tpl['name']} left unresolved placeholders"
