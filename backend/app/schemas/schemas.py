from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from app.models.models import (
    RoleEnum, ProjectStatusEnum, TaskStatusEnum, TaskPriorityEnum,
    BugSeverityEnum, BugStatusEnum, AttendanceStatusEnum,
    InsightTypeEnum, NotificationTypeEnum
)


# ─────────────── Auth Schemas ───────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: RoleEnum = RoleEnum.EMPLOYEE
    organization_id: Optional[int] = None
    department_id: Optional[int] = None
    team_id: Optional[int] = None
    position: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "EmployeeResponse"


class RefreshRequest(BaseModel):
    refresh_token: str


# ─────────────── Organization Schemas ───────────────

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    industry: Optional[str] = None
    description: Optional[str] = None
    headcount: int = 0
    logo_url: Optional[str] = None
    website: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    headcount: Optional[int] = None
    logo_url: Optional[str] = None
    website: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: int
    name: str
    industry: Optional[str]
    description: Optional[str]
    headcount: int
    logo_url: Optional[str]
    website: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Department Schemas ───────────────

class DepartmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    organization_id: int
    description: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    head_employee_id: Optional[int] = None


class DepartmentResponse(BaseModel):
    id: int
    name: str
    organization_id: int
    description: Optional[str]
    head_employee_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Team Schemas ───────────────

class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    department_id: int
    team_lead_id: Optional[int] = None
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    team_lead_id: Optional[int] = None
    description: Optional[str] = None


class TeamResponse(BaseModel):
    id: int
    name: str
    department_id: int
    team_lead_id: Optional[int]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Employee Schemas ───────────────

class EmployeeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: RoleEnum = RoleEnum.EMPLOYEE
    team_id: Optional[int] = None
    department_id: Optional[int] = None
    organization_id: Optional[int] = None
    manager_id: Optional[int] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    join_date: Optional[date] = None
    salary: Optional[float] = None


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[RoleEnum] = None
    team_id: Optional[int] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    position: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None
    salary: Optional[float] = None


class EmployeeResponse(BaseModel):
    id: int
    name: str
    email: str
    role: RoleEnum
    team_id: Optional[int]
    department_id: Optional[int]
    organization_id: Optional[int]
    position: Optional[str]
    phone: Optional[str]
    avatar_url: Optional[str]
    join_date: Optional[date]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Project Schemas ───────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    department_id: int
    manager_id: Optional[int] = None
    status: ProjectStatusEnum = ProjectStatusEnum.PLANNING
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget: Optional[float] = None
    priority: str = "MEDIUM"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[int] = None
    status: Optional[ProjectStatusEnum] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    completion_pct: Optional[float] = None
    budget: Optional[float] = None
    priority: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    department_id: int
    manager_id: Optional[int]
    status: ProjectStatusEnum
    start_date: Optional[date]
    end_date: Optional[date]
    completion_pct: float
    budget: Optional[float]
    priority: str
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Sprint Schemas ───────────────

class SprintCreate(BaseModel):
    project_id: int
    name: str = Field(..., min_length=2, max_length=200)
    goal: Optional[str] = None
    start_date: date
    end_date: date
    capacity: Optional[int] = None


class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    velocity: Optional[float] = None
    capacity: Optional[int] = None


class SprintResponse(BaseModel):
    id: int
    project_id: int
    name: str
    goal: Optional[str]
    start_date: date
    end_date: date
    status: str
    velocity: Optional[float]
    capacity: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Task Schemas ───────────────

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    description: Optional[str] = None
    project_id: int
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    status: TaskStatusEnum = TaskStatusEnum.TODO
    priority: TaskPriorityEnum = TaskPriorityEnum.MEDIUM
    story_points: Optional[int] = None
    estimated_hours: Optional[float] = None
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    sprint_id: Optional[int] = None
    assignee_id: Optional[int] = None
    status: Optional[TaskStatusEnum] = None
    priority: Optional[TaskPriorityEnum] = None
    story_points: Optional[int] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_date: Optional[date] = None
    progress_pct: Optional[float] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    project_id: int
    sprint_id: Optional[int]
    assignee_id: Optional[int]
    status: TaskStatusEnum
    priority: TaskPriorityEnum
    story_points: Optional[int]
    estimated_hours: Optional[float]
    actual_hours: Optional[float]
    due_date: Optional[date]
    progress_pct: float
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Bug Schemas ───────────────

class BugCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=300)
    description: Optional[str] = None
    project_id: int
    severity: BugSeverityEnum = BugSeverityEnum.MEDIUM
    steps_to_reproduce: Optional[str] = None


class BugUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[int] = None
    severity: Optional[BugSeverityEnum] = None
    status: Optional[BugStatusEnum] = None
    steps_to_reproduce: Optional[str] = None


class BugResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    project_id: int
    reporter_id: int
    assignee_id: Optional[int]
    severity: BugSeverityEnum
    status: BugStatusEnum
    resolved_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Attendance Schemas ───────────────

class AttendanceCreate(BaseModel):
    date: date
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: AttendanceStatusEnum = AttendanceStatusEnum.PRESENT
    notes: Optional[str] = None


class AttendanceUpdate(BaseModel):
    check_in: Optional[datetime] = None
    check_out: Optional[datetime] = None
    status: Optional[AttendanceStatusEnum] = None
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    date: date
    check_in: Optional[datetime]
    check_out: Optional[datetime]
    status: AttendanceStatusEnum
    working_hours: Optional[float]
    overtime_hours: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Daily Report Schemas ───────────────

class DailyReportCreate(BaseModel):
    date: date
    content: str = Field(..., min_length=10)
    blockers: Optional[str] = None
    tomorrow_plan: Optional[str] = None
    mood_score: Optional[int] = Field(None, ge=1, le=5)
    hours_worked: Optional[float] = None
    project_id: Optional[int] = None


class DailyReportResponse(BaseModel):
    id: int
    employee_id: int
    date: date
    content: str
    blockers: Optional[str]
    tomorrow_plan: Optional[str]
    mood_score: Optional[int]
    hours_worked: Optional[float]
    project_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── Notification Schemas ───────────────

class NotificationResponse(BaseModel):
    id: int
    recipient_id: int
    type: NotificationTypeEnum
    title: str
    message: str
    is_read: bool
    entity_type: Optional[str]
    entity_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────── AI / Health Score Schemas ───────────────

class AiInsightResponse(BaseModel):
    id: int
    type: InsightTypeEnum
    subject_entity: str
    subject_id: Optional[int]
    subject_name: Optional[str]
    score: Optional[float]
    verdict: Optional[str]
    evidence_json: Optional[dict]
    recommendation: Optional[str]
    generated_at: datetime

    class Config:
        from_attributes = True


class HealthScoreResponse(BaseModel):
    id: int
    organization_id: int
    computed_at: datetime
    overall_score: float
    project_score: float
    employee_score: float
    knowledge_score: float
    risk_score: float
    task_score: float
    resource_score: float
    deadline_score: float
    explanation_text: Optional[str]
    recommendations: Optional[list]
    score_breakdown: Optional[dict]

    class Config:
        from_attributes = True


class AiAssistantRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=1000)
    context_entity: Optional[str] = None  # "project", "employee", "team"
    context_id: Optional[int] = None


class AiAssistantResponse(BaseModel):
    answer: str
    risk_level: Optional[str]
    evidence: List[dict]
    recommendations: List[str]
    data_sources: List[str]
    insight_id: Optional[int]


# ─────────────── Pagination ───────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    size: int
    pages: int
