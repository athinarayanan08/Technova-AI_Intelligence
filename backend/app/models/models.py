import enum
from datetime import datetime, date
from typing import Optional, List
import uuid

from sqlalchemy import (
    String, Integer, Float, Boolean, Text, Date, DateTime,
    ForeignKey, Enum, JSON, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, mapped_column, Mapped

from app.db.database import Base
from app.models.mixins import TimestampMixin, SoftDeleteMixin


# ─────────────────────────── Enums ────────────────────────────

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    TEAM_LEAD = "TEAM_LEAD"
    EMPLOYEE = "EMPLOYEE"


class ProjectStatusEnum(str, enum.Enum):
    PLANNING = "PLANNING"
    ACTIVE = "ACTIVE"
    ON_HOLD = "ON_HOLD"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TaskStatusEnum(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    IN_REVIEW = "IN_REVIEW"
    DONE = "DONE"
    BLOCKED = "BLOCKED"


class TaskPriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class BugSeverityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class BugStatusEnum(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    WONT_FIX = "WONT_FIX"


class AttendanceStatusEnum(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    HALF_DAY = "HALF_DAY"
    WORK_FROM_HOME = "WORK_FROM_HOME"
    ON_LEAVE = "ON_LEAVE"


class InsightTypeEnum(str, enum.Enum):
    PROJECT_RISK = "PROJECT_RISK"
    EMPLOYEE_BURNOUT = "EMPLOYEE_BURNOUT"
    TEAM_VELOCITY = "TEAM_VELOCITY"
    ORG_HEALTH = "ORG_HEALTH"
    PROMOTION_RECOMMENDATION = "PROMOTION_RECOMMENDATION"
    KNOWLEDGE_GAP = "KNOWLEDGE_GAP"
    RESOURCE_UTILIZATION = "RESOURCE_UTILIZATION"


class NotificationTypeEnum(str, enum.Enum):
    TASK_ASSIGNED = "TASK_ASSIGNED"
    TASK_OVERDUE = "TASK_OVERDUE"
    PROJECT_DELAY = "PROJECT_DELAY"
    BURNOUT_WARNING = "BURNOUT_WARNING"
    DEADLINE_REMINDER = "DEADLINE_REMINDER"
    HIGH_RISK_ALERT = "HIGH_RISK_ALERT"
    KNOWLEDGE_RECOMMENDATION = "KNOWLEDGE_RECOMMENDATION"
    PROMOTION_SUGGESTION = "PROMOTION_SUGGESTION"
    GENERAL = "GENERAL"


# ─────────────────────────── Models ────────────────────────────

class Organization(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    industry: Mapped[Optional[str]] = mapped_column(String(100))
    description: Mapped[Optional[str]] = mapped_column(Text)
    headcount: Mapped[int] = mapped_column(Integer, default=0)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500))
    website: Mapped[Optional[str]] = mapped_column(String(200))
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    departments: Mapped[List["Department"]] = relationship(
        "Department", back_populates="organization", lazy="select"
    )
    health_snapshots: Mapped[List["HealthScoreSnapshot"]] = relationship(
        "HealthScoreSnapshot", back_populates="organization", lazy="select"
    )


class Department(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    head_employee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    organization: Mapped["Organization"] = relationship("Organization", back_populates="departments")
    teams: Mapped[List["Team"]] = relationship("Team", back_populates="department", lazy="select")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="department", lazy="select")
    employees: Mapped[List["Employee"]] = relationship(
        "Employee", back_populates="department",
        foreign_keys="Employee.department_id", lazy="select"
    )


class Team(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    team_lead_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"))
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    department: Mapped["Department"] = relationship("Department", back_populates="teams")
    employees: Mapped[List["Employee"]] = relationship(
        "Employee", back_populates="team",
        foreign_keys="Employee.team_id", lazy="select"
    )


class Employee(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(500), nullable=False)
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.EMPLOYEE, nullable=False)
    team_id: Mapped[Optional[int]] = mapped_column(ForeignKey("teams.id"))
    department_id: Mapped[Optional[int]] = mapped_column(ForeignKey("departments.id"))
    organization_id: Mapped[Optional[int]] = mapped_column(ForeignKey("organizations.id"))
    manager_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"))
    position: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500))
    join_date: Mapped[Optional[date]] = mapped_column(Date)
    salary: Mapped[Optional[float]] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    team: Mapped[Optional["Team"]] = relationship(
        "Team", back_populates="employees", foreign_keys=[team_id]
    )
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="employees", foreign_keys=[department_id]
    )
    assigned_tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="assignee", foreign_keys="Task.assignee_id"
    )
    attendance_records: Mapped[List["Attendance"]] = relationship(
        "Attendance", back_populates="employee"
    )
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="uploader"
    )
    daily_reports: Mapped[List["DailyReport"]] = relationship(
        "DailyReport", back_populates="employee"
    )
    notifications: Mapped[List["Notification"]] = relationship(
        "Notification", back_populates="recipient"
    )
    bugs_reported: Mapped[List["Bug"]] = relationship(
        "Bug", back_populates="reporter", foreign_keys="Bug.reporter_id"
    )


class Project(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    manager_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"))
    status: Mapped[ProjectStatusEnum] = mapped_column(
        Enum(ProjectStatusEnum), default=ProjectStatusEnum.PLANNING
    )
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    completion_pct: Mapped[float] = mapped_column(Float, default=0.0)
    budget: Mapped[Optional[float]] = mapped_column(Float)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM")
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    department: Mapped["Department"] = relationship("Department", back_populates="projects")
    manager: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[manager_id])
    sprints: Mapped[List["Sprint"]] = relationship("Sprint", back_populates="project")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="project")
    bugs: Mapped[List["Bug"]] = relationship("Bug", back_populates="project")
    documents: Mapped[List["Document"]] = relationship("Document", back_populates="project")
    meetings: Mapped[List["Meeting"]] = relationship("Meeting", back_populates="project")


class Sprint(Base, TimestampMixin):
    __tablename__ = "sprints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    goal: Mapped[Optional[str]] = mapped_column(Text)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PLANNED")
    velocity: Mapped[Optional[float]] = mapped_column(Float)
    capacity: Mapped[Optional[int]] = mapped_column(Integer)
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    project: Mapped["Project"] = relationship("Project", back_populates="sprints")
    tasks: Mapped[List["Task"]] = relationship("Task", back_populates="sprint")


class Task(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    sprint_id: Mapped[Optional[int]] = mapped_column(ForeignKey("sprints.id"))
    assignee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"))
    created_by: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[TaskStatusEnum] = mapped_column(
        Enum(TaskStatusEnum), default=TaskStatusEnum.TODO
    )
    priority: Mapped[TaskPriorityEnum] = mapped_column(
        Enum(TaskPriorityEnum), default=TaskPriorityEnum.MEDIUM
    )
    story_points: Mapped[Optional[int]] = mapped_column(Integer)
    estimated_hours: Mapped[Optional[float]] = mapped_column(Float)
    actual_hours: Mapped[Optional[float]] = mapped_column(Float)
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    progress_pct: Mapped[float] = mapped_column(Float, default=0.0)

    project: Mapped["Project"] = relationship("Project", back_populates="tasks")
    sprint: Mapped[Optional["Sprint"]] = relationship("Sprint", back_populates="tasks")
    assignee: Mapped[Optional["Employee"]] = relationship(
        "Employee", back_populates="assigned_tasks", foreign_keys=[assignee_id]
    )


class Bug(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "bugs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    reporter_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    assignee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"))
    severity: Mapped[BugSeverityEnum] = mapped_column(
        Enum(BugSeverityEnum), default=BugSeverityEnum.MEDIUM
    )
    status: Mapped[BugStatusEnum] = mapped_column(
        Enum(BugStatusEnum), default=BugStatusEnum.OPEN
    )
    steps_to_reproduce: Mapped[Optional[str]] = mapped_column(Text)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    project: Mapped["Project"] = relationship("Project", back_populates="bugs")
    reporter: Mapped["Employee"] = relationship("Employee", foreign_keys=[reporter_id], back_populates="bugs_reported")
    assignee: Mapped[Optional["Employee"]] = relationship("Employee", foreign_keys=[assignee_id])


class Meeting(Base, TimestampMixin):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projects.id"))
    organizer_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_mins: Mapped[int] = mapped_column(Integer, default=60)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    agenda: Mapped[Optional[str]] = mapped_column(Text)
    meeting_type: Mapped[str] = mapped_column(String(50), default="GENERAL")
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="meetings")
    organizer: Mapped["Employee"] = relationship("Employee", foreign_keys=[organizer_id])


class Attendance(Base, TimestampMixin):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    check_in: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    check_out: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    status: Mapped[AttendanceStatusEnum] = mapped_column(
        Enum(AttendanceStatusEnum), default=AttendanceStatusEnum.PRESENT
    )
    working_hours: Mapped[Optional[float]] = mapped_column(Float)
    overtime_hours: Mapped[Optional[float]] = mapped_column(Float, default=0.0)
    notes: Mapped[Optional[str]] = mapped_column(String(500))

    employee: Mapped["Employee"] = relationship("Employee", back_populates="attendance_records")


class Document(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(300), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50))
    file_size: Mapped[Optional[int]] = mapped_column(Integer)
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projects.id"))
    extracted_text: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    tags: Mapped[Optional[list]] = mapped_column(JSON)
    es_doc_id: Mapped[Optional[str]] = mapped_column(String(200))  # Elasticsearch doc ID
    created_by: Mapped[Optional[int]] = mapped_column(Integer)

    uploader: Mapped["Employee"] = relationship("Employee", back_populates="documents")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="documents")


class DailyReport(Base, TimestampMixin):
    __tablename__ = "daily_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    project_id: Mapped[Optional[int]] = mapped_column(ForeignKey("projects.id"))
    date: Mapped[date] = mapped_column(Date, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    blockers: Mapped[Optional[str]] = mapped_column(Text)
    tomorrow_plan: Mapped[Optional[str]] = mapped_column(Text)
    mood_score: Mapped[Optional[int]] = mapped_column(Integer)  # 1-5
    hours_worked: Mapped[Optional[float]] = mapped_column(Float)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="daily_reports")
    project: Mapped[Optional["Project"]] = relationship("Project")


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recipient_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False)
    type: Mapped[NotificationTypeEnum] = mapped_column(Enum(NotificationTypeEnum))
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)

    recipient: Mapped["Employee"] = relationship("Employee", back_populates="notifications")


class AiInsight(Base, TimestampMixin):
    __tablename__ = "ai_insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    type: Mapped[InsightTypeEnum] = mapped_column(Enum(InsightTypeEnum), nullable=False)
    subject_entity: Mapped[str] = mapped_column(String(100), nullable=False)  # "project", "employee", etc
    subject_id: Mapped[Optional[int]] = mapped_column(Integer)
    subject_name: Mapped[Optional[str]] = mapped_column(String(200))
    score: Mapped[Optional[float]] = mapped_column(Float)
    verdict: Mapped[Optional[str]] = mapped_column(String(100))  # "HIGH RISK", "BURNOUT DETECTED", etc
    evidence_json: Mapped[Optional[dict]] = mapped_column(JSON)
    recommendation: Mapped[Optional[str]] = mapped_column(Text)
    raw_analysis: Mapped[Optional[str]] = mapped_column(Text)  # full LLM response
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)


class HealthScoreSnapshot(Base, TimestampMixin):
    __tablename__ = "health_score_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id"), nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Overall
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)

    # Sub-scores
    project_score: Mapped[float] = mapped_column(Float, default=0.0)
    employee_score: Mapped[float] = mapped_column(Float, default=0.0)
    knowledge_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    task_score: Mapped[float] = mapped_column(Float, default=0.0)
    resource_score: Mapped[float] = mapped_column(Float, default=0.0)
    deadline_score: Mapped[float] = mapped_column(Float, default=0.0)

    # AI explanation
    explanation_text: Mapped[Optional[str]] = mapped_column(Text)
    recommendations: Mapped[Optional[list]] = mapped_column(JSON)
    score_breakdown: Mapped[Optional[dict]] = mapped_column(JSON)

    organization: Mapped["Organization"] = relationship(
        "Organization", back_populates="health_snapshots"
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employees.id"))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer)
    changes_json: Mapped[Optional[dict]] = mapped_column(JSON)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50))
    user_agent: Mapped[Optional[str]] = mapped_column(String(300))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
