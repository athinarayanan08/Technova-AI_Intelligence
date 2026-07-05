from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from app.models.models import (
    Task, Project, Attendance, Bug, Document, Employee,
    Sprint, DailyReport, HealthScoreSnapshot, AttendanceStatusEnum,
    TaskStatusEnum, BugStatusEnum, BugSeverityEnum
)


class HealthScoreWeights:
    """Configurable weights for health score sub-scores. Sum must = 1.0"""
    PROJECT_COMPLETION = 0.20
    EMPLOYEE_PRODUCTIVITY = 0.20
    KNOWLEDGE_SHARING = 0.10
    TASK_COMPLETION = 0.20
    CUSTOMER_ISSUES = 0.15
    RESOURCE_UTILIZATION = 0.10
    DEADLINE_COMPLIANCE = 0.05


class HealthScoreCalculator:
    """
    Standalone, LLM-free health score calculator.
    The LLM only EXPLAINS the score — it never COMPUTES it.
    This class is fully unit-testable without any external dependencies.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def compute(self, organization_id: int) -> dict:
        """
        Compute the full health score for an organization.
        Returns a dict with all sub-scores, overall score, and raw data evidence.
        """
        project_score, project_evidence = await self._compute_project_score(organization_id)
        employee_score, employee_evidence = await self._compute_employee_score(organization_id)
        knowledge_score, knowledge_evidence = await self._compute_knowledge_score(organization_id)
        task_score, task_evidence = await self._compute_task_score(organization_id)
        customer_score, customer_evidence = await self._compute_customer_score(organization_id)
        resource_score, resource_evidence = await self._compute_resource_score(organization_id)
        deadline_score, deadline_evidence = await self._compute_deadline_score(organization_id)

        # Weighted overall score
        overall = (
            project_score * HealthScoreWeights.PROJECT_COMPLETION +
            employee_score * HealthScoreWeights.EMPLOYEE_PRODUCTIVITY +
            knowledge_score * HealthScoreWeights.KNOWLEDGE_SHARING +
            task_score * HealthScoreWeights.TASK_COMPLETION +
            customer_score * HealthScoreWeights.CUSTOMER_ISSUES +
            resource_score * HealthScoreWeights.RESOURCE_UTILIZATION +
            deadline_score * HealthScoreWeights.DEADLINE_COMPLIANCE
        )

        return {
            "overall_score": round(overall, 2),
            "project_score": round(project_score, 2),
            "employee_score": round(employee_score, 2),
            "knowledge_score": round(knowledge_score, 2),
            "task_score": round(task_score, 2),
            "resource_score": round(resource_score, 2),
            "deadline_score": round(deadline_score, 2),
            "risk_score": round(100 - overall, 2),  # inverse of health
            "score_breakdown": {
                "project": {"score": project_score, "weight": HealthScoreWeights.PROJECT_COMPLETION, "evidence": project_evidence},
                "employee": {"score": employee_score, "weight": HealthScoreWeights.EMPLOYEE_PRODUCTIVITY, "evidence": employee_evidence},
                "knowledge": {"score": knowledge_score, "weight": HealthScoreWeights.KNOWLEDGE_SHARING, "evidence": knowledge_evidence},
                "task": {"score": task_score, "weight": HealthScoreWeights.TASK_COMPLETION, "evidence": task_evidence},
                "customer": {"score": customer_score, "weight": HealthScoreWeights.CUSTOMER_ISSUES, "evidence": customer_evidence},
                "resource": {"score": resource_score, "weight": HealthScoreWeights.RESOURCE_UTILIZATION, "evidence": resource_evidence},
                "deadline": {"score": deadline_score, "weight": HealthScoreWeights.DEADLINE_COMPLIANCE, "evidence": deadline_evidence},
            }
        }

    async def _compute_project_score(self, org_id: int):
        """Average completion % across all active projects"""
        result = await self.db.execute(
            select(func.avg(Project.completion_pct))
            .join(Project.department)
            .where(and_(
                Project.department.has(organization_id=org_id),
                Project.is_deleted == False
            ))
        )
        avg_completion = result.scalar() or 0
        score = min(100, avg_completion)
        evidence = {"average_completion_pct": round(avg_completion, 2)}
        return score, evidence

    async def _compute_employee_score(self, org_id: int):
        """
        Employee health score based on:
        - Attendance rate (last 30 days)
        - Average mood score from daily reports
        - Overtime hours (negative indicator)
        """
        from datetime import timedelta, date
        thirty_days_ago = datetime.now().date() - timedelta(days=30)

        # Attendance rate
        total_records = await self.db.execute(
            select(func.count(Attendance.id))
            .join(Attendance.employee)
            .where(and_(
                Employee.organization_id == org_id,
                Attendance.date >= thirty_days_ago
            ))
        )
        present_records = await self.db.execute(
            select(func.count(Attendance.id))
            .join(Attendance.employee)
            .where(and_(
                Employee.organization_id == org_id,
                Attendance.date >= thirty_days_ago,
                Attendance.status.in_([
                    AttendanceStatusEnum.PRESENT,
                    AttendanceStatusEnum.WORK_FROM_HOME,
                    AttendanceStatusEnum.HALF_DAY
                ])
            ))
        )
        total = total_records.scalar() or 1
        present = present_records.scalar() or 0
        attendance_rate = (present / total) * 100

        # Avg mood score
        mood_result = await self.db.execute(
            select(func.avg(DailyReport.mood_score))
            .join(DailyReport.employee)
            .where(Employee.organization_id == org_id)
        )
        avg_mood = mood_result.scalar() or 3.0
        mood_score = (avg_mood / 5.0) * 100

        # Overtime penalty
        overtime_result = await self.db.execute(
            select(func.avg(Attendance.overtime_hours))
            .join(Attendance.employee)
            .where(and_(
                Employee.organization_id == org_id,
                Attendance.date >= thirty_days_ago
            ))
        )
        avg_overtime = overtime_result.scalar() or 0
        overtime_penalty = min(20, avg_overtime * 2)  # max -20 points for heavy overtime

        score = max(0, (attendance_rate * 0.5 + mood_score * 0.3 + (100 - overtime_penalty) * 0.2))
        evidence = {
            "attendance_rate": round(attendance_rate, 2),
            "avg_mood_score": round(avg_mood, 2),
            "avg_overtime_hours": round(avg_overtime, 2),
        }
        return min(100, score), evidence

    async def _compute_knowledge_score(self, org_id: int):
        """Score based on document upload frequency and search activity"""
        from datetime import timedelta
        thirty_days_ago = datetime.now().date() - timedelta(days=30)

        doc_count = await self.db.execute(
            select(func.count(Document.id))
            .join(Document.uploader)
            .where(and_(
                Employee.organization_id == org_id,
                Document.is_deleted == False
            ))
        )
        count = doc_count.scalar() or 0

        # Simple scoring: 0 docs = 0, 50+ docs = 100
        score = min(100, count * 2)
        evidence = {"total_documents": count}
        return score, evidence

    async def _compute_task_score(self, org_id: int):
        """Task completion rate across all projects"""
        total_tasks = await self.db.execute(
            select(func.count(Task.id))
            .join(Task.project)
            .join(Project.department)
            .where(and_(
                Project.department.has(organization_id=org_id),
                Task.is_deleted == False
            ))
        )
        done_tasks = await self.db.execute(
            select(func.count(Task.id))
            .join(Task.project)
            .join(Project.department)
            .where(and_(
                Project.department.has(organization_id=org_id),
                Task.is_deleted == False,
                Task.status == TaskStatusEnum.DONE
            ))
        )
        total = total_tasks.scalar() or 1
        done = done_tasks.scalar() or 0
        completion_rate = (done / total) * 100
        evidence = {"total_tasks": total, "completed_tasks": done, "completion_rate": round(completion_rate, 2)}
        return min(100, completion_rate), evidence

    async def _compute_customer_score(self, org_id: int):
        """Inverse of critical open bugs"""
        critical_open = await self.db.execute(
            select(func.count(Bug.id))
            .join(Bug.project)
            .join(Project.department)
            .where(and_(
                Project.department.has(organization_id=org_id),
                Bug.status.in_([BugStatusEnum.OPEN, BugStatusEnum.IN_PROGRESS]),
                Bug.severity.in_([BugSeverityEnum.CRITICAL, BugSeverityEnum.HIGH]),
                Bug.is_deleted == False
            ))
        )
        count = critical_open.scalar() or 0
        # Each critical bug reduces score by 5, max penalty 100
        score = max(0, 100 - (count * 5))
        evidence = {"critical_open_bugs": count}
        return score, evidence

    async def _compute_resource_score(self, org_id: int):
        """Resource utilization: assigned tasks / total capacity"""
        assigned_tasks = await self.db.execute(
            select(func.count(Task.id))
            .join(Task.project)
            .join(Project.department)
            .where(and_(
                Project.department.has(organization_id=org_id),
                Task.assignee_id.isnot(None),
                Task.status != TaskStatusEnum.DONE,
                Task.is_deleted == False
            ))
        )
        employee_count = await self.db.execute(
            select(func.count(Employee.id))
            .where(and_(
                Employee.organization_id == org_id,
                Employee.is_active == True,
                Employee.is_deleted == False
            ))
        )
        assigned = assigned_tasks.scalar() or 0
        emp_count = employee_count.scalar() or 1
        avg_tasks_per_employee = assigned / emp_count
        # Ideal: 3-7 tasks per employee. Score peaks at 5, drops off at extremes.
        if avg_tasks_per_employee < 1:
            score = 40  # underutilized
        elif avg_tasks_per_employee <= 7:
            score = 100 - abs(avg_tasks_per_employee - 5) * 10
        else:
            score = max(0, 100 - (avg_tasks_per_employee - 7) * 15)  # overloaded

        evidence = {"avg_tasks_per_employee": round(avg_tasks_per_employee, 2), "employee_count": emp_count}
        return max(0, min(100, score)), evidence

    async def _compute_deadline_score(self, org_id: int):
        """Percentage of tasks completed on or before due date"""
        overdue_tasks = await self.db.execute(
            select(func.count(Task.id))
            .join(Task.project)
            .join(Project.department)
            .where(and_(
                Project.department.has(organization_id=org_id),
                Task.due_date < datetime.now().date(),
                Task.status != TaskStatusEnum.DONE,
                Task.is_deleted == False
            ))
        )
        total_due = await self.db.execute(
            select(func.count(Task.id))
            .join(Task.project)
            .join(Project.department)
            .where(and_(
                Project.department.has(organization_id=org_id),
                Task.due_date.isnot(None),
                Task.is_deleted == False
            ))
        )
        overdue = overdue_tasks.scalar() or 0
        total = total_due.scalar() or 1
        on_time_rate = max(0, 100 - (overdue / total) * 100)
        evidence = {"overdue_tasks": overdue, "tasks_with_due_date": total}
        return min(100, on_time_rate), evidence
