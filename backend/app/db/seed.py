"""
TechNova Solutions — Demo Seed Data
=====================================
150 employees, 12 projects, 8 teams, 3 managers
Pre-loaded with compelling AI insight story for demo/viva.
"""
import random
from datetime import date, timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.models import (
    Organization, Department, Team, Employee, Project, Sprint, Task, Bug,
    Attendance, DailyReport, AiInsight, HealthScoreSnapshot,
    RoleEnum, ProjectStatusEnum, TaskStatusEnum, TaskPriorityEnum,
    BugSeverityEnum, BugStatusEnum, AttendanceStatusEnum, InsightTypeEnum
)

random.seed(42)


async def seed_demo_data():
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing = await db.scalar(select(Organization).limit(1))
        if existing:
            return

        # ─── Organization ───
        org = Organization(
            name="TechNova Solutions",
            industry="Software & Technology",
            description="Leading enterprise software solutions provider",
            headcount=150,
            website="https://technova.io",
        )
        db.add(org)
        await db.flush()

        # ─── Departments ───
        dept_names = [
            "Engineering", "Product", "QA & Testing", "DevOps",
            "Data Science", "Design", "HR", "Finance"
        ]
        departments = []
        for name in dept_names:
            d = Department(name=name, organization_id=org.id)
            db.add(d)
            departments.append(d)
        await db.flush()

        # ─── Admin ───
        admin = Employee(
            name="Arvind Kumar",
            email="admin@technova.com",
            password_hash=get_password_hash("Admin@123"),
            role=RoleEnum.ADMIN,
            organization_id=org.id,
            department_id=departments[0].id,
            position="CTO",
            join_date=date(2020, 1, 15),
        )
        db.add(admin)
        await db.flush()

        # ─── Managers ───
        managers_data = [
            ("Rajan Mehta", "rajan@technova.com", departments[0].id, "Engineering Manager"),
            ("Sunita Rao", "sunita@technova.com", departments[1].id, "Product Manager"),
            ("Vikram Singh", "vikram@technova.com", departments[2].id, "QA Manager"),
        ]
        managers = []
        for name, email, dept_id, pos in managers_data:
            m = Employee(
                name=name, email=email,
                password_hash=get_password_hash("Manager@123"),
                role=RoleEnum.MANAGER,
                organization_id=org.id,
                department_id=dept_id,
                position=pos,
                join_date=date(2021, 3, 1),
            )
            db.add(m)
            managers.append(m)
        await db.flush()

        # ─── Teams ───
        team_data = [
            ("Alpha Squad", departments[0].id),
            ("Beta Team", departments[0].id),
            ("Gamma Force", departments[1].id),
            ("Delta Unit", departments[2].id),
            ("Epsilon Core", departments[3].id),
            ("Zeta Labs", departments[4].id),
            ("Eta Design", departments[5].id),
            ("Theta Ops", departments[6].id),
        ]
        teams = []
        for name, dept_id in team_data:
            t = Team(name=name, department_id=dept_id)
            db.add(t)
            teams.append(t)
        await db.flush()

        # ─── Team Leads ───
        lead_names = [
            "Priya Sharma", "Karthik Nair", "Meena Iyer",
            "Rajesh Patel", "Ananya Krishnan", "Suresh Babu",
            "Kavitha Reddy", "Deepak Joshi"
        ]
        leads = []
        for i, name in enumerate(lead_names):
            lead = Employee(
                name=name,
                email=f"{name.lower().replace(' ', '.')}@technova.com",
                password_hash=get_password_hash("Lead@123"),
                role=RoleEnum.TEAM_LEAD,
                organization_id=org.id,
                department_id=teams[i].department_id,
                team_id=teams[i].id,
                position="Team Lead",
                join_date=date(2022, 1, 10),
            )
            db.add(lead)
            leads.append(lead)
        await db.flush()

        # Update team leads
        for i, team in enumerate(teams):
            team.team_lead_id = leads[i].id

        first_names = [
            "Aarav", "Aditi", "Amit", "Anjali", "Arjun", "Deepika", "Gaurav", "Harish", 
            "Ishaan", "Jyoti", "Karan", "Kiran", "Kunal", "Madhav", "Manish", "Neha", 
            "Nikhil", "Pooja", "Pranav", "Rahul", "Rohan", "Sanjay", "Shalini", "Siddharth", 
            "Sneha", "Vikram", "Abhishek", "Aishwarya", "Aniket", "Ankita", "Avinash", 
            "Bhavana", "Chethan", "Deepak", "Ganesh", "Gayatri", "Hari", "Karthik", 
            "Kavitha", "Manoj", "Meera", "Nisha", "Pradeep", "Priya", "Rajesh", "Ritu", 
            "Sandeep", "Sarita", "Satish", "Shruti", "Suresh", "Swati", "Tarun", "Varun", 
            "Vijay", "Vinay", "Balaji", "Chandra", "Divya", "Hema", "Indira", "Jai", 
            "Lakshmi", "Nithya", "Padma", "Ramesh", "Santhosh", "Tulasi", "Uma", "Venkat"
        ]
        last_names = [
            "Sharma", "Verma", "Gupta", "Nair", "Pillai", "Iyer", "Iyengar", "Reddy", 
            "Rao", "Patel", "Mehta", "Singh", "Joshi", "Kumar", "Sen", "Das", "Roy", 
            "Choudhury", "Banerjee", "Chatterjee", "Mishra", "Pandey", "Trivedi", "Desai", 
            "Kulkarni", "Patil", "Shinde", "Menon", "Shetty", "Bhat", "Hegde", "Rai", 
            "Prasad", "Sinha", "Dubey", "Murthy", "Krishnan", "Rajan"
        ]

        generated_names = set()
        while len(generated_names) < 139:
            fn = random.choice(first_names)
            ln = random.choice(last_names)
            name = f"{fn} {ln}"
            if name != "Adhi Rajan" and name != "Priya Sharma" and name not in generated_names:
                generated_names.add(name)
        
        name_list = list(generated_names)

        employees = []
        for i in range(139):
            name = name_list[i]
            parts = name.split(" ")
            fname, lname = parts[0], parts[1]
            email = f"{fname.lower()}.{lname.lower()}{i}@technova.com"
            team = teams[i % len(teams)]
            emp = Employee(
                name=name,
                email=email,
                password_hash=get_password_hash("Employee@123"),
                role=RoleEnum.EMPLOYEE,
                organization_id=org.id,
                department_id=team.department_id,
                team_id=team.id,
                position=random.choice(["Software Engineer", "Senior Engineer", "Junior Developer", "QA Engineer", "Designer"]),
                join_date=date(2022, random.randint(1, 12), random.randint(1, 28)),
                salary=random.uniform(600000, 1800000),
            )
            db.add(emp)
            employees.append(emp)

        # Special employee: Adhi (burnout candidate)
        adhi = Employee(
            name="Adhi Rajan",
            email="adhi.rajan@technova.com",
            password_hash=get_password_hash("Employee@123"),
            role=RoleEnum.EMPLOYEE,
            organization_id=org.id,
            department_id=departments[0].id,
            team_id=teams[0].id,
            position="Senior Software Engineer",
            join_date=date(2022, 6, 1),
        )
        db.add(adhi)

        await db.flush()
        employees.append(adhi)

        # ─── Projects ───
        project_data = [
            ("Project Alpha", ProjectStatusEnum.ACTIVE, 72, date(2025, 1, 15), date(2026, 7, 9), departments[0].id, "CRITICAL"),
            ("Project Beta", ProjectStatusEnum.ACTIVE, 45, date(2025, 3, 1), date(2026, 9, 30), departments[0].id, "HIGH"),
            ("Phoenix Platform", ProjectStatusEnum.ACTIVE, 88, date(2024, 10, 1), date(2026, 8, 31), departments[1].id, "MEDIUM"),
            ("DataStream Analytics", ProjectStatusEnum.ACTIVE, 60, date(2025, 2, 15), date(2026, 10, 15), departments[4].id, "HIGH"),
            ("CloudMigrate Pro", ProjectStatusEnum.ACTIVE, 35, date(2025, 5, 1), date(2026, 12, 31), departments[3].id, "MEDIUM"),
            ("UX Overhaul 2025", ProjectStatusEnum.COMPLETED, 100, date(2024, 8, 1), date(2025, 12, 31), departments[5].id, "LOW"),
            ("AI Chatbot Initiative", ProjectStatusEnum.ACTIVE, 55, date(2025, 4, 1), date(2026, 11, 30), departments[4].id, "HIGH"),
            ("Security Audit 2025", ProjectStatusEnum.COMPLETED, 100, date(2025, 1, 1), date(2025, 6, 30), departments[3].id, "CRITICAL"),
            ("Mobile App v3", ProjectStatusEnum.ACTIVE, 40, date(2025, 6, 1), date(2026, 12, 31), departments[0].id, "MEDIUM"),
            ("HR Portal Revamp", ProjectStatusEnum.ON_HOLD, 25, date(2025, 5, 15), date(2026, 9, 30), departments[6].id, "LOW"),
            ("Performance Dashboard", ProjectStatusEnum.ACTIVE, 78, date(2025, 3, 1), date(2026, 8, 31), departments[4].id, "MEDIUM"),
            ("Customer Feedback System", ProjectStatusEnum.PLANNING, 10, date(2026, 7, 1), date(2026, 12, 31), departments[1].id, "MEDIUM"),
        ]

        projects = []
        for name, status, pct, start, end, dept_id, priority in project_data:
            p = Project(
                name=name,
                description=f"Strategic initiative: {name}",
                department_id=dept_id,
                manager_id=managers[0].id,
                status=status,
                completion_pct=pct,
                start_date=start,
                end_date=end,
                priority=priority,
                budget=random.uniform(500000, 5000000),
            )
            db.add(p)
            projects.append(p)
        await db.flush()

        # ─── Sprints for Project Alpha ───
        alpha = projects[0]
        sprints = []
        for i in range(1, 6):
            s = Sprint(
                project_id=alpha.id,
                name=f"Sprint {i}",
                goal=f"Sprint {i} deliverables for Project Alpha",
                start_date=date(2025, 1, 15) + timedelta(weeks=(i-1)*2),
                end_date=date(2025, 1, 15) + timedelta(weeks=i*2 - 1),
                status="COMPLETED" if i < 4 else "ACTIVE",
                velocity=random.uniform(35, 55),
                capacity=60,
            )
            db.add(s)
            sprints.append(s)
        await db.flush()

        # ─── Tasks for Project Alpha ───
        task_titles = [
            "Implement user authentication module",
            "Design database schema v2",
            "API integration with payment gateway",
            "Frontend dashboard components",
            "Unit test coverage for auth service",
            "Performance optimization for query engine",
            "Docker containerization setup",
            "CI/CD pipeline configuration",
            "Security vulnerability assessment",
            "Load testing and benchmarking",
            "Documentation update",
            "Code review and refactoring",
            "Deployment to staging environment",
            "UAT test cases preparation",
            "Bug fixes from QA sprint 3",
            "Feature: export to PDF",
            "API rate limiting implementation",
            "Database indexing optimization",
            "Email notification system",
            "Final integration testing",
        ]

        for i, title in enumerate(task_titles):
            status_val = TaskStatusEnum.DONE if i < 14 else TaskStatusEnum.IN_PROGRESS if i < 17 else TaskStatusEnum.TODO
            task = Task(
                title=title,
                description=f"Task: {title} for Project Alpha",
                project_id=alpha.id,
                sprint_id=sprints[min(i // 4, 4)].id,
                assignee_id=employees[i % len(employees)].id,
                status=status_val,
                priority=random.choice(list(TaskPriorityEnum)),
                story_points=random.choice([1, 2, 3, 5, 8]),
                due_date=date(2026, 7, 9) - timedelta(days=random.randint(0, 30)),
                progress_pct=100 if status_val == TaskStatusEnum.DONE else random.randint(20, 80),
                completed_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30)) if status_val == TaskStatusEnum.DONE else None,
                created_by=managers[0].id,
            )
            db.add(task)

        # ─── Tasks for Priya Sharma (Team Lead) ───
        priya_tasks = [
            ("Develop system architecture blueprint", TaskStatusEnum.DONE, 100),
            ("Review backend code for OAuth2 integrations", TaskStatusEnum.IN_REVIEW, 90),
            ("Optimize database query performance", TaskStatusEnum.IN_PROGRESS, 60),
            ("Write API documentation for AI routes", TaskStatusEnum.TODO, 0),
            ("Coordinate QA deployment validation", TaskStatusEnum.TODO, 0),
        ]
        for i, (title, status_val, progress) in enumerate(priya_tasks):
            task = Task(
                title=title,
                description=f"Task: {title} assigned to Team Lead Priya Sharma",
                project_id=alpha.id,
                sprint_id=sprints[4].id, # active sprint
                assignee_id=leads[0].id,
                status=status_val,
                priority=random.choice(list(TaskPriorityEnum)),
                story_points=random.choice([2, 3, 5, 8]),
                due_date=date(2026, 7, 9) + timedelta(days=random.randint(1, 10)),
                progress_pct=progress,
                completed_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5)) if status_val == TaskStatusEnum.DONE else None,
                created_by=managers[0].id,
            )
            db.add(task)


        # ─── Tasks for Adhi Rajan (Employee) ───
        adhi_tasks = [
            ("Implement login security audit logging", TaskStatusEnum.DONE, 100),
            ("Fix state persistence on page refresh in Kanban board", TaskStatusEnum.IN_REVIEW, 90),
            ("Develop OAuth2 middleware validation tests", TaskStatusEnum.IN_PROGRESS, 45),
            ("Design UI mockups for burnout diagnostic page", TaskStatusEnum.TODO, 0),
            ("Write unit tests for daily report submission", TaskStatusEnum.TODO, 0),
        ]
        for i, (title, status_val, progress) in enumerate(adhi_tasks):
            task = Task(
                title=title,
                description=f"Task: {title} assigned to Senior Software Engineer Adhi Rajan",
                project_id=alpha.id,
                sprint_id=sprints[4].id, # active sprint
                assignee_id=adhi.id,
                status=status_val,
                priority=random.choice(list(TaskPriorityEnum)),
                story_points=random.choice([1, 2, 3, 5]),
                due_date=date(2026, 7, 9) + timedelta(days=random.randint(1, 10)),
                progress_pct=progress,
                completed_at=datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5)) if status_val == TaskStatusEnum.DONE else None,
                created_by=leads[0].id,
            )
            db.add(task)



        # ─── 18 Open Bugs for Project Alpha ───
        bug_titles = [
            "Login session expires too early",
            "Dashboard charts not rendering on Safari",
            "Payment API timeout on high load",
            "User data export missing fields",
            "Notification emails going to spam",
            "Search results pagination broken",
            "File upload limit not enforced",
            "Mobile responsive layout broken on iOS",
            "SQL injection vulnerability in search",
            "Race condition in concurrent task update",
            "Password reset link expiry not working",
            "Report generation crashes on large dataset",
            "API returns 500 on empty input",
            "Date picker shows wrong timezone",
            "CSV export encoding issue",
            "Memory leak in background job runner",
            "Auth token not invalidated on logout",
            "Admin panel accessible without MFA",
        ]
        severities = [BugSeverityEnum.CRITICAL] * 4 + [BugSeverityEnum.HIGH] * 7 + [BugSeverityEnum.MEDIUM] * 7
        for i, title in enumerate(bug_titles):
            bug = Bug(
                title=title,
                description=f"Bug report: {title}",
                project_id=alpha.id,
                reporter_id=employees[i % len(employees)].id,
                severity=severities[i],
                status=BugStatusEnum.OPEN,
                created_by=employees[i % len(employees)].id,
            )
            db.add(bug)

        # ─── Attendance for Adhi (burnout pattern) ───
        for i in range(60):
            day = date.today() - timedelta(days=i)
            if day.weekday() < 5:  # weekdays only
                check_in = datetime(day.year, day.month, day.day, 8, 30, tzinfo=timezone.utc)
                check_out = datetime(day.year, day.month, day.day, 21, 0, tzinfo=timezone.utc)
                att = Attendance(
                    employee_id=adhi.id,
                    date=day,
                    check_in=check_in,
                    check_out=check_out,
                    status=AttendanceStatusEnum.PRESENT,
                    working_hours=12.5,
                    overtime_hours=4.5,
                )
                db.add(att)

        # ─── Daily reports for Adhi ───
        for i in range(30):
            day = date.today() - timedelta(days=i)
            report = DailyReport(
                employee_id=adhi.id,
                date=day,
                content="Completed assigned tasks. Worked on critical bug fixes for Project Alpha.",
                blockers="Waiting for QA sign-off on payment module.",
                hours_worked=12.5,
                mood_score=2 if i % 5 != 0 else 3,
            )
            db.add(report)

        # ─── Priya (promotion candidate) ───
        priya = leads[0]  # Priya Sharma

        # ─── Seed Health Score Snapshot ───
        snapshot = HealthScoreSnapshot(
            organization_id=org.id,
            overall_score=89.0,
            project_score=84.0,
            employee_score=78.0,
            knowledge_score=86.0,
            risk_score=11.0,
            task_score=91.0,
            resource_score=83.0,
            deadline_score=72.0,
            explanation_text="Organization health is strong at 89/100. Project Alpha remains HIGH RISK due to 18 open bugs and 5 days to deadline. Employee Adhi shows burnout indicators (avg 12.5h/day, 0 leave in 60 days). Team Priya Sharma leads in velocity and delivery — promotion recommended.",
            recommendations=[
                "Assign 2 additional QA engineers to Project Alpha immediately",
                "Schedule mandatory leave for Adhi Rajan within 7 days",
                "Recognize Priya Sharma's performance in next board meeting"
            ],
        )
        db.add(snapshot)

        # ─── Pre-seeded AI Insights ───
        insights = [
            AiInsight(
                type=InsightTypeEnum.PROJECT_RISK,
                subject_entity="project",
                subject_id=1,
                subject_name="Project Alpha",
                score=75,
                verdict="HIGH RISK",
                evidence_json={
                    "completion_pct": 72,
                    "days_to_deadline": 5,
                    "open_bugs": 18,
                    "critical_bugs": 4,
                    "overdue_tasks": 3,
                    "total_tasks": 20,
                    "completed_tasks": 14,
                },
                recommendation="Assign 2 additional QA engineers to Project Alpha. Consider a 1-week deadline extension. Prioritize the 4 CRITICAL severity bugs immediately — SQL injection and auth token issues pose security risks.",
                is_current=True,
            ),
            AiInsight(
                type=InsightTypeEnum.EMPLOYEE_BURNOUT,
                subject_entity="employee",
                subject_id=adhi.id,
                subject_name="Adhi Rajan",
                score=82,
                verdict="BURNOUT DETECTED",
                evidence_json={
                    "avg_overtime_hours_daily": 4.5,
                    "avg_mood_score": 2.1,
                    "leave_days_last_30": 0,
                    "task_completion_rate": 94,
                    "absent_days_last_30": 0,
                },
                recommendation="Immediately redistribute 30% of Adhi's tasks. Schedule mandatory leave for next week. Arrange a confidential 1-on-1 with their manager. Monitor mood scores weekly.",
                is_current=True,
            ),
            AiInsight(
                type=InsightTypeEnum.PROMOTION_RECOMMENDATION,
                subject_entity="employee",
                subject_id=priya.id,
                subject_name="Priya Sharma",
                score=95,
                verdict="STRONGLY RECOMMENDED",
                evidence_json={
                    "task_completion_rate": 98,
                    "avg_sprint_velocity": 52,
                    "leave_days_last_90": 3,
                    "bugs_introduced": 0,
                    "team_satisfaction_rating": 4.8,
                    "on_time_delivery_rate": 100,
                },
                recommendation="Priya Sharma demonstrates exceptional performance: 98% task completion, 100% on-time delivery, and highest team satisfaction (4.8/5). Recommend promotion to Senior Team Lead with salary adjustment.",
                is_current=True,
            ),
        ]
        for insight in insights:
            db.add(insight)

        await db.commit()
        print("[SEED] TechNova Solutions demo data seeded successfully!")
