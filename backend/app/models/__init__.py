"""
Kavach — Models Package

Import all models here so Alembic auto-discovers them.
"""

from app.models.user import User, UserRole  # noqa: F401
from app.models.administrative import State, District, Block, Tehsil  # noqa: F401
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.settlement import Settlement  # noqa: F401
from app.models.hazard import Hazard  # noqa: F401
from app.models.relocation_site import RelocationSite  # noqa: F401
