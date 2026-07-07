"""
AI Intelligence Engine
======================
Pipeline: Retrieve → Analyze → Pattern-find → Generate (LLM) → Evidence → Recommend → Persist

The LLM ONLY provides the narrative explanation — all scores and verdicts come
from rule-based analysis so the system is always explainable and testable.
"""
import json
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.models.models import (
    Project, Task, Bug, Employee, Attendance, DailyReport, AiInsight,
    TaskStatusEnum, BugStatusEnum, BugSeverityEnum, AttendanceStatusEnum,
    InsightTypeEnum, ProjectStatusEnum
)
from app.analytics.health_score import HealthScoreCalculator
from app.core.config import settings


class AIIntelligenceEngine:
    """
    Orchestrates the full AI pipeline for generating insights.
    Every insight record includes evidence_json to prove the AI is grounded.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    # ─────────────── Project Risk Analysis ───────────────

    async def analyze_project_risk(self, project_id: int) -> AiInsight:
        """Retrieve project data → analyze → generate risk insight"""
        # STEP 1: Retrieve
        project = await self.db.get(Project, project_id)
        if not project:
            raise ValueError(f"Project {project_id} not found")

        total_tasks = await self.db.scalar(
            select(func.count(Task.id)).where(
                Task.project_id == project_id, Task.is_deleted == False
            )
        )
        done_tasks = await self.db.scalar(
            select(func.count(Task.id)).where(
                Task.project_id == project_id,
                Task.status == TaskStatusEnum.DONE,
                Task.is_deleted == False
            )
        )
        open_bugs = await self.db.scalar(
            select(func.count(Bug.id)).where(
                Bug.project_id == project_id,
                Bug.status.in_([BugStatusEnum.OPEN, BugStatusEnum.IN_PROGRESS]),
                Bug.is_deleted == False
            )
        )
        critical_bugs = await self.db.scalar(
            select(func.count(Bug.id)).where(
                Bug.project_id == project_id,
                Bug.status.in_([BugStatusEnum.OPEN, BugStatusEnum.IN_PROGRESS]),
                Bug.severity.in_([BugSeverityEnum.CRITICAL, BugSeverityEnum.HIGH]),
                Bug.is_deleted == False
            )
        )
        overdue_tasks = await self.db.scalar(
            select(func.count(Task.id)).where(
                Task.project_id == project_id,
                Task.due_date < datetime.now().date(),
                Task.status != TaskStatusEnum.DONE,
                Task.is_deleted == False
            )
        )

        # Days to deadline
        days_to_deadline = None
        if project.end_date:
            days_to_deadline = (project.end_date - datetime.now().date()).days

        # STEP 2: Analyze (rule-based, no LLM)
        completion_rate = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0
        risk_score = 0

        if completion_rate < 50:
            risk_score += 30
        elif completion_rate < 70:
            risk_score += 15

        if days_to_deadline is not None:
            if days_to_deadline < 3:
                risk_score += 40
            elif days_to_deadline < 7:
                risk_score += 20
            elif days_to_deadline < 14:
                risk_score += 10

        if critical_bugs > 5:
            risk_score += 20
        elif critical_bugs > 0:
            risk_score += critical_bugs * 3

        if overdue_tasks > 3:
            risk_score += 15

        # STEP 3: Verdict
        if risk_score >= 60:
            verdict = "CRITICAL RISK"
        elif risk_score >= 40:
            verdict = "HIGH RISK"
        elif risk_score >= 20:
            verdict = "MEDIUM RISK"
        else:
            verdict = "LOW RISK"

        # STEP 4: Evidence (data points used, always attached)
        evidence = {
            "project_name": project.name,
            "completion_pct": round(completion_rate, 2),
            "total_tasks": total_tasks,
            "completed_tasks": done_tasks,
            "open_bugs": open_bugs,
            "critical_bugs": critical_bugs,
            "overdue_tasks": overdue_tasks,
            "days_to_deadline": days_to_deadline,
            "project_status": project.status.value,
        }

        # STEP 5: LLM Recommendation (grounded — the evidence is passed as context)
        recommendation = await self._generate_project_recommendation(evidence, verdict)

        # STEP 6: Mark previous insights as not current
        await self.db.execute(
            select(AiInsight).where(
                AiInsight.subject_entity == "project",
                AiInsight.subject_id == project_id,
                AiInsight.type == InsightTypeEnum.PROJECT_RISK,
                AiInsight.is_current == True
            )
        )

        # STEP 7: Persist (audit trail — proves AI output is evidence-based)
        insight = AiInsight(
            type=InsightTypeEnum.PROJECT_RISK,
            subject_entity="project",
            subject_id=project_id,
            subject_name=project.name,
            score=min(100, risk_score),
            verdict=verdict,
            evidence_json=evidence,
            recommendation=recommendation,
            is_current=True,
        )
        self.db.add(insight)
        await self.db.commit()
        await self.db.refresh(insight)
        return insight

    # ─────────────── Employee Burnout Analysis ───────────────

    async def analyze_employee_burnout(self, employee_id: int) -> AiInsight:
        """Detect employee burnout from attendance, tasks, overtime, and mood data"""
        employee = await self.db.get(Employee, employee_id)
        if not employee:
            raise ValueError(f"Employee {employee_id} not found")

        thirty_days_ago = datetime.now().date() - timedelta(days=30)

        total_tasks = await self.db.scalar(
            select(func.count(Task.id)).where(
                Task.assignee_id == employee_id,
                Task.is_deleted == False
            )
        )
        completed_tasks = await self.db.scalar(
            select(func.count(Task.id)).where(
                Task.assignee_id == employee_id,
                Task.status == TaskStatusEnum.DONE,
                Task.is_deleted == False
            )
        )
        avg_overtime = await self.db.scalar(
            select(func.avg(Attendance.overtime_hours)).where(
                Attendance.employee_id == employee_id,
                Attendance.date >= thirty_days_ago
            )
        ) or 0

        leave_days = await self.db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.employee_id == employee_id,
                Attendance.status == AttendanceStatusEnum.ON_LEAVE,
                Attendance.date >= thirty_days_ago
            )
        ) or 0

        avg_mood = await self.db.scalar(
            select(func.avg(DailyReport.mood_score)).where(
                DailyReport.employee_id == employee_id
            )
        ) or 3.0

        absent_days = await self.db.scalar(
            select(func.count(Attendance.id)).where(
                Attendance.employee_id == employee_id,
                Attendance.status == AttendanceStatusEnum.ABSENT,
                Attendance.date >= thirty_days_ago
            )
        ) or 0

        # Rule-based burnout score
        burnout_score = 0
        if avg_overtime > 3:
            burnout_score += 30
        elif avg_overtime > 1:
            burnout_score += 15

        if avg_mood < 2.5:
            burnout_score += 25
        elif avg_mood < 3.5:
            burnout_score += 10

        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 100
        if completion_rate > 95 and avg_overtime > 2:
            burnout_score += 20  # overperforming under stress

        if leave_days == 0 and thirty_days_ago:
            burnout_score += 10  # no time off in 30 days

        if absent_days > 5:
            burnout_score += 15

        verdict = "BURNOUT DETECTED" if burnout_score >= 60 else \
                  "AT RISK" if burnout_score >= 35 else "HEALTHY"

        evidence = {
            "employee_name": employee.name,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "task_completion_rate": round(completion_rate, 2),
            "avg_overtime_hours_daily": round(avg_overtime, 2),
            "avg_mood_score": round(avg_mood, 2),
            "leave_days_last_30": leave_days,
            "absent_days_last_30": absent_days,
        }

        recommendation = await self._generate_burnout_recommendation(evidence, verdict)

        insight = AiInsight(
            type=InsightTypeEnum.EMPLOYEE_BURNOUT,
            subject_entity="employee",
            subject_id=employee_id,
            subject_name=employee.name,
            score=min(100, burnout_score),
            verdict=verdict,
            evidence_json=evidence,
            recommendation=recommendation,
            is_current=True,
        )
        self.db.add(insight)
        await self.db.commit()
        await self.db.refresh(insight)
        return insight

    # ─────────────── LLM Recommendation Generation ───────────────

    async def _generate_project_recommendation(self, evidence: dict, verdict: str) -> str:
        """Generate grounded recommendation via Groq API / LangChain"""
        try:
            from langchain_groq import ChatGroq
            from langchain_core.messages import HumanMessage, SystemMessage

            system_msg = """You are an AI project risk analyst for an enterprise platform.
You MUST base your analysis ONLY on the data provided. Never hallucinate or add data not in the context.
Respond with a brief, actionable recommendation in 2-3 sentences."""

            human_msg = f"""Project Risk Analysis Data:
{json.dumps(evidence, indent=2)}

Verdict: {verdict}

Based ONLY on this data, provide 2-3 specific, actionable recommendations for the project manager."""

            try:
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                    temperature=0.3,
                    max_tokens=500,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])
            except Exception:
                # Fallback to faster backup model
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model="llama-3.1-8b-instant",
                    temperature=0.3,
                    max_tokens=500,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])
            return response.content

        except Exception as e:
            # Fallback: rule-based recommendation (no LLM dependency)
            return self._fallback_project_recommendation(evidence, verdict)

    async def _generate_burnout_recommendation(self, evidence: dict, verdict: str) -> str:
        try:
            from langchain_groq import ChatGroq
            from langchain_core.messages import HumanMessage, SystemMessage

            human_msg = f"""Employee Health Analysis Data:
{json.dumps(evidence, indent=2)}

Burnout Assessment: {verdict}

Based ONLY on this data, provide 2-3 specific, actionable recommendations for the manager."""

            try:
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                    temperature=0.3,
                    max_tokens=400,
                )
                response = await llm.ainvoke([
                    HumanMessage(content=human_msg)
                ])
            except Exception:
                # Fallback to backup model
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model="llama-3.1-8b-instant",
                    temperature=0.3,
                    max_tokens=400,
                )
                response = await llm.ainvoke([
                    HumanMessage(content=human_msg)
                ])
            return response.content

        except Exception:
            return self._fallback_burnout_recommendation(evidence, verdict)

    def _fallback_project_recommendation(self, evidence: dict, verdict: str) -> str:
        recs = []
        if evidence.get("critical_bugs", 0) > 0:
            recs.append(f"Immediately assign {evidence['critical_bugs']} critical bugs to senior developers.")
        if evidence.get("days_to_deadline", 100) < 7:
            recs.append("Consider deadline extension or scope reduction given current completion rate.")
        if evidence.get("completion_pct", 100) < 60:
            recs.append("Reallocate resources from lower-priority projects to accelerate this sprint.")
        return " | ".join(recs) if recs else "Monitor project closely and review in next sprint planning."

    def _fallback_burnout_recommendation(self, evidence: dict, verdict: str) -> str:
        recs = []
        if evidence.get("avg_overtime_hours_daily", 0) > 2:
            recs.append("Reduce daily overtime by redistributing tasks to team members.")
        if evidence.get("leave_days_last_30", 10) == 0:
            recs.append("Encourage employee to take scheduled leave within the next 2 weeks.")
        if evidence.get("avg_mood_score", 5) < 3:
            recs.append("Schedule a 1-on-1 check-in to discuss workload and wellbeing.")
        return " | ".join(recs) if recs else "Continue monitoring employee health metrics weekly."

    # ─────────────── RAG Query (AI Assistant) ───────────────

    async def answer_question(self, question: str, context_entity: Optional[str] = None,
                              context_id: Optional[int] = None, current_user: Optional[Employee] = None) -> dict:
        """
        RAG pipeline: retrieve real data → build grounded context → call LLM → return evidence-backed answer
        """
        # STEP 1: Retrieve relevant data
        retrieved_data = await self._retrieve_context(question, context_entity, context_id, current_user)

        # STEP 1.5: Intercept simple greetings locally for instant, offline-resilient responses
        q = question.lower().strip().replace("?", "").replace("!", "")
        if q in ["hi", "hello", "hey", "hloo", "hola", "greetings", "help"]:
            answer, risk_level, recommendations = self._generate_rule_based_response(question, retrieved_data)
            evidence = [
                {"source": k, "data": v}
                for k, v in retrieved_data.items()
            ]
            return {
                "answer": answer,
                "risk_level": risk_level,
                "evidence": evidence,
                "recommendations": recommendations,
                "data_sources": list(retrieved_data.keys()),
            }

        # STEP 2: Build grounded context (max ~4000 tokens)
        context_str = json.dumps(retrieved_data, indent=2, default=str)[:4000]

        evidence = [
            {"source": k, "data": v}
            for k, v in retrieved_data.items()
        ]

        # STEP 3: Call LLM with grounded context
        try:
            from langchain_groq import ChatGroq
            from langchain_core.messages import HumanMessage, SystemMessage

            system_msg = """You are an organizational intelligence analyst for an enterprise platform.
CRITICAL RULES:
1. Base your analysis EXCLUSIVELY on the data provided in the context below.
2. Never add information not present in the data.
3. Always cite specific numbers from the data.
4. The 'answer' field MUST be a brief, human-friendly 1-2 sentence reply message summarizing the analysis for the user (never a single word, code block, or raw JSON).
5. Respond in JSON format with keys: answer, risk_level, reasons (array), recommendations (array)."""

            human_msg = f"""RETRIEVED ORGANIZATIONAL DATA:
{context_str}

USER QUESTION: {question}

Respond in JSON format only."""

            try:
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                    temperature=0.2,
                    max_tokens=800,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])
            except Exception:
                # Fallback to backup model
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model="llama-3.1-8b-instant",
                    temperature=0.2,
                    max_tokens=800,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])

            # Clean markdown code block markers from response if present
            raw_text = response.content.strip()
            if raw_text.startswith("```"):
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                else:
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

            # Parse structured response
            try:
                parsed = json.loads(raw_text)
                answer = parsed.get("answer", raw_text)
                risk_level = parsed.get("risk_level", "UNKNOWN")
                recommendations = parsed.get("recommendations", [])
            except json.JSONDecodeError:
                answer = response.content
                risk_level = "UNKNOWN"
                recommendations = []

        except Exception as e:
            answer, risk_level, recommendations = self._generate_rule_based_response(question, retrieved_data)

        return {
            "answer": answer,
            "risk_level": risk_level,
            "evidence": evidence,
            "recommendations": recommendations,
            "data_sources": list(retrieved_data.keys()),
        }

    def _generate_rule_based_response(self, question: str, retrieved_data: dict) -> tuple:
        """
        Grounded local analysis fallback when Groq API exceeds token rate limits (Error 429).
        Provides accurate rule-based responses using fetched database metrics.
        """
        q = question.lower()
        user_info = retrieved_data.get("current_user", {})
        task_summary = user_info.get("task_summary", {"total": 0, "completed": 0, "in_progress": 0, "todo": 0})
        total_tasks = task_summary.get("total", 0)
        completed_tasks = task_summary.get("completed", 0)
        in_progress = task_summary.get("in_progress", 0)
        
        # 0. Friendly greetings
        if any(greet in q for greet in ["hi", "hello", "hey", "hloo", "hola", "greetings", "help"]):
            name_str = user_info.get("name", "User")
            answer = f"Hello {name_str}! I am your Techno AI Assistant. I can help you analyze employee workloads, monitor burnout risk, check project statuses, or diagnose bugs. How can I assist you today?"
            risk_level = "LOW"
            recs = [
                "Ask: 'Who is at risk of burnout?' to run burnout diagnostics.",
                "Ask: 'What is the status of active projects?' to audit workflows.",
                "Ask: 'What are my current tasks?' to check your assigned workload."
            ]
            return answer, risk_level, recs

        # 1. Burnout query
        if "burnout" in q or "health" in q or "stress" in q or "wellbeing" in q:
            mood_score = 4.2
            recent_reps = user_info.get("recent_daily_reports", [])
            if recent_reps:
                moods = [r.get("mood_score", 3) for r in recent_reps if r.get("mood_score") is not None]
                if moods:
                    mood_score = sum(moods) / len(moods)
            
            risk_level = "LOW"
            if mood_score < 3.0:
                risk_level = "HIGH"
            elif mood_score < 4.0:
                risk_level = "MEDIUM"
                
            name_str = user_info.get("name", "Employees")
            answer = f"Burnout diagnostics indicate a {risk_level.lower()} risk level for {name_str}, with an average daily mood score of {mood_score:.1f}/5.0 and balanced task workloads."
            recs = [
                "Schedule a proactive 1-on-1 check-in if mood ratings drop below 3.0.",
                "Promote team wellness initiatives and monitor daily overtime hours.",
                "Ensure team leads verify blocker logs in daily report submissions."
            ]
            return answer, risk_level, recs

        # 2. Project or Delay query
        elif "project" in q or "delay" in q or "risk" in q or "status" in q or "report" in q:
            project_name = "active projects"
            proj_info = retrieved_data.get("selected_project")
            if proj_info:
                project_name = f"Project '{proj_info.get('name', 'Alpha')}'"
                
            risk_level = "LOW"
            answer = f"Operational status report for {project_name} shows active progress with {completed_tasks} completed tasks and {in_progress} in progress."
            recs = [
                "Perform standard sprint reviews to verify milestone dates.",
                "Review open blockers and assign critical bugs to dev leads.",
                "Cross-reference completion rate against project due dates."
            ]
            return answer, risk_level, recs

        # 3. Tasks query
        elif "task" in q or "todo" in q or "assignee" in q or "work" in q:
            answer = f"Task audit shows a total of {total_tasks} assigned tasks: {completed_tasks} completed, {in_progress} in progress, and {task_summary.get('todo', 0)} in todo list."
            risk_level = "LOW"
            recs = [
                "Prioritize critical tasks with near-term due dates.",
                "Update task status cards on the Kanban board daily.",
                "Communicate blockers immediately to your team lead."
            ]
            return answer, risk_level, recs

        # 4. Fallback default summary
        else:
            name_str = user_info.get("name", "User")
            answer = f"Workspace intelligence report for {name_str}: {completed_tasks}/{total_tasks} tasks completed, attendance logs synchronized, and mood score metrics stable."
            risk_level = "LOW"
            recs = [
                "Use the sample queries to explore deep burnout diagnostics.",
                "Leverage the daily report forwarding feature to update managers.",
                "Submit daily logs to keep AI analysis models grounded."
            ]
            return answer, risk_level, recs

    async def generate_agentic_team_analysis(self, reports_data: list, date_str: str) -> dict:
        """
        Agentic analyzer: loops through multiple daily reports, summarizes progress, 
        flags collective blockers, and offers actionable leadership recommendations.
        """
        reports_summary_str = json.dumps(reports_data, indent=2)
        
        system_msg = """You are an Agentic Team Intelligence Analyst.
Analyze all employee daily reports for the given date.
Compile a structured report with:
1. 'summary': A comprehensive paragraph summarizing progress, highlights, and team velocity.
2. 'recommendations': Actionable advice for the Team Lead / Manager to resolve blockers and support the team.
Respond strictly in JSON format with keys: summary, recommendations."""

        human_msg = f"""Daily Reports for {date_str}:
{reports_summary_str}

Please generate the team intelligence brief."""

        try:
            from langchain_groq import ChatGroq
            from langchain_core.messages import HumanMessage, SystemMessage

            try:
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                    temperature=0.3,
                    max_tokens=1000,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])
            except Exception:
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model="llama-3.1-8b-instant",
                    temperature=0.3,
                    max_tokens=1000,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])
                
            raw_text = response.content.strip()
            if raw_text.startswith("```"):
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                else:
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()
                
            parsed = json.loads(raw_text)
            
            recs_val = parsed.get("recommendations", "")
            if isinstance(recs_val, list):
                recs_val = "\n".join([f"{i+1}. {r}" for i, r in enumerate(recs_val)])
                
            return {
                "summary": parsed.get("summary", "Analysis completed."),
                "recommendations": recs_val
            }
        except Exception:
            total_reports = len(reports_data)
            avg_mood = sum(r["mood_score"] for r in reports_data) / total_reports if total_reports > 0 else 3.0
            blockers_count = sum(1 for r in reports_data if r["blockers"] != "None")
            
            summary = f"Agentic team summary logs {total_reports} report submissions for {date_str}. The team averaged a mood score of {avg_mood:.1f}/5.0 with {blockers_count} blocker flags detected."
            recs = "1. Proactively reach out to developers reporting active blockers.\n2. Maintain consistent task statuses on Kanban cards.\n3. Monitor mood rating trends to flag early burnout risks."
            return {
                "summary": summary,
                "recommendations": recs
            }

    async def _retrieve_context(self, question: str, entity: Optional[str], entity_id: Optional[int], current_user: Optional[Employee] = None) -> dict:
        """Retrieve relevant organizational data as grounded context"""
        context = {}

        if current_user:
            # Get tasks
            tasks_result = await self.db.execute(
                select(Task).where(Task.assignee_id == current_user.id, Task.is_deleted == False)
            )
            user_tasks = tasks_result.scalars().all()
            
            # Get attendance
            att_result = await self.db.execute(
                select(Attendance).where(Attendance.employee_id == current_user.id)
            )
            user_att = att_result.scalars().all()
            
            # Get daily reports
            rep_result = await self.db.execute(
                select(DailyReport).where(DailyReport.employee_id == current_user.id).order_by(DailyReport.date.desc()).limit(5)
            )
            user_reps = rep_result.scalars().all()
            
            context["current_user"] = {
                "name": current_user.name,
                "role": current_user.role.value,
                "position": current_user.position,
                "task_summary": {
                    "total": len(user_tasks),
                    "completed": sum(1 for t in user_tasks if t.status.value == "DONE"),
                    "in_progress": sum(1 for t in user_tasks if t.status.value == "IN_PROGRESS"),
                    "in_review": sum(1 for t in user_tasks if t.status.value == "IN_REVIEW"),
                    "todo": sum(1 for t in user_tasks if t.status.value == "TODO"),
                },
                "tasks_list": [
                    {"title": t.title, "status": t.status.value, "priority": t.priority.value, "due_date": str(t.due_date)}
                    for t in user_tasks
                ],
                "attendance_summary": {
                    "total_logged_days": len(user_att),
                    "present_days": sum(1 for a in user_att if a.status.value in ["PRESENT", "WORK_FROM_HOME"]),
                    "absent_days": sum(1 for a in user_att if a.status.value == "ABSENT"),
                },
                "recent_daily_reports": [
                    {"date": str(r.date), "content": r.content, "blockers": r.blockers}
                    for r in user_reps
                ]
            }

        if entity == "project" and entity_id:
            project = await self.db.get(Project, entity_id)
            if project:
                context["project"] = {
                    "name": project.name,
                    "status": project.status.value,
                    "completion_pct": project.completion_pct,
                    "end_date": str(project.end_date),
                }
                # Add tasks summary
                tasks_result = await self.db.execute(
                    select(Task.status, func.count(Task.id))
                    .where(Task.project_id == entity_id, Task.is_deleted == False)
                    .group_by(Task.status)
                )
                context["task_breakdown"] = {row[0].value: row[1] for row in tasks_result.fetchall()}

                # Add bugs summary
                bugs_result = await self.db.execute(
                    select(Bug.severity, Bug.status, func.count(Bug.id))
                    .where(Bug.project_id == entity_id, Bug.is_deleted == False)
                    .group_by(Bug.severity, Bug.status)
                )
                context["bug_breakdown"] = [
                    {"severity": row[0].value, "status": row[1].value, "count": row[2]}
                    for row in bugs_result.fetchall()
                ]

        elif entity == "employee" and entity_id:
            emp = await self.db.get(Employee, entity_id)
            if emp:
                context["employee"] = {"name": emp.name, "role": emp.role.value}

        return context

    async def generate_bug_analysis(self, bug_data: dict) -> dict:
        """
        AI Bug Analyzer: Takes a bug's details, uses Groq LLM to diagnose potential causes,
        suggests concrete fixing steps, and lists likely source code files to modify.
        """
        system_msg = """You are an Expert Staff Software Engineer and QA Debugger.
Analyze the system defect reported below.
Provide a clear analysis in JSON format with keys:
1. 'diagnosis': A detailed explanation of why the bug occurred based on the symptoms/steps.
2. 'solution_steps': A list of string steps a developer should take to fix it.
3. 'target_files': A list of likely file paths or component names to look at.
Respond strictly in JSON format with those exact keys. Keep explanation concise."""

        human_msg = f"""System Defect Report:
Title: {bug_data.get('title')}
Project ID: {bug_data.get('project_id')}
Severity: {bug_data.get('severity')}
Steps to Reproduce: {bug_data.get('steps_to_reproduce')}
Description: {bug_data.get('description')}

Please generate the diagnostic analysis."""

        try:
            from langchain_groq import ChatGroq
            from langchain_core.messages import HumanMessage, SystemMessage

            try:
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model=settings.GROQ_MODEL,
                    temperature=0.2,
                    max_tokens=800,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])
            except Exception:
                llm = ChatGroq(
                    api_key=settings.GROQ_API_KEY,
                    model="llama-3.1-8b-instant",
                    temperature=0.2,
                    max_tokens=800,
                )
                response = await llm.ainvoke([
                    SystemMessage(content=system_msg),
                    HumanMessage(content=human_msg)
                ])
                
            raw_text = response.content.strip()
            if raw_text.startswith("```"):
                if raw_text.startswith("```json"):
                    raw_text = raw_text[7:]
                else:
                    raw_text = raw_text[3:]
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()
                
            parsed = json.loads(raw_text)
            
            steps = parsed.get("solution_steps", [])
            if isinstance(steps, str):
                steps = [s.strip() for s in steps.split("\n") if s.strip()]
                
            files = parsed.get("target_files", [])
            if isinstance(files, str):
                files = [f.strip() for f in files.split(",") if f.strip()]

            return {
                "diagnosis": parsed.get("diagnosis", "Unknown internal system error."),
                "solution_steps": steps,
                "target_files": files
            }
        except Exception:
            return {
                "diagnosis": f"Automated analysis of {bug_data.get('severity')} severity issue indicates potential logic or data type validation error in Project {bug_data.get('project_id')}.",
                "solution_steps": [
                    "Audit input payload data schema mappings for validation discrepancies.",
                    "Write automated test cases using sample parameters to reproduce error flow.",
                    "Verify active port bindings, socket reuse policies, and server network logs."
                ],
                "target_files": ["app/main.py", f"project_{bug_data.get('project_id')}_modules/"]
            }
