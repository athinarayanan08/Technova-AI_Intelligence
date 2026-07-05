import sqlite3
from datetime import date, timedelta, datetime

def assign_tasks_to_both():
    conn = sqlite3.connect("ai_org.db")
    cursor = conn.cursor()
    try:
        # Clear existing tasks for admin and manager first to ensure no duplicates and make it clean
        cursor.execute("DELETE FROM tasks WHERE assignee_id IN (1, 2)")
        conn.commit()

        # Find project and sprint
        cursor.execute("SELECT id FROM projects LIMIT 2")
        projects = cursor.fetchall()
        if not projects:
            print("Error: No projects found to link tasks.")
            return
        project_alpha_id = projects[0][0]
        project_beta_id = projects[1][0] if len(projects) > 1 else projects[0][0]

        cursor.execute("SELECT id FROM sprints LIMIT 1")
        sprint = cursor.fetchone()
        sprint_id = sprint[0] if sprint else None

        # Sample tasks for Admin (CTO - ID 1)
        admin_tasks = [
            ("Review organization-wide security compliance", "Ensure ISO 27001 audit criteria are fully documented", project_alpha_id, "TODO", "CRITICAL", 8, 0),
            ("Evaluate Groq API pipeline rate-limits", "Check token usage and configure fallback triggers", project_beta_id, "IN_PROGRESS", "HIGH", 5, 40),
            ("Conduct infrastructure review with DevOps leads", "Assess multi-region clustering and container configs", project_alpha_id, "IN_REVIEW", "MEDIUM", 5, 80),
            ("Finalize technology stack roadmap", "Publish core stack guidelines for next fiscal year", project_beta_id, "DONE", "LOW", 3, 100)
        ]

        # Sample tasks for Manager (Rajan Mehta - ID 2)
        manager_tasks = [
            ("Prepare Q3 engineering budget allocations", "Determine server costs and contractor resources", project_alpha_id, "IN_PROGRESS", "HIGH", 5, 60),
            ("Conduct bi-weekly department alignment brief", "Review roadmaps and cross-functional team milestones", project_beta_id, "IN_REVIEW", "MEDIUM", 3, 90),
            ("Formulate strategic hiring plan for DevOps squad", "Draft job descriptions for Senior DevOps position", project_alpha_id, "TODO", "CRITICAL", 8, 0),
            ("Finalize architecture patterns document", "Publish code design specifications on Wiki", project_beta_id, "DONE", "LOW", 2, 100)
        ]

        today = date.today()
        created_at = datetime.utcnow().isoformat()

        # Insert Admin tasks
        for title, desc, proj_id, status, priority, points, progress in admin_tasks:
            due_date = (today + timedelta(days=7)).isoformat()
            cursor.execute(
                """
                INSERT INTO tasks 
                (title, description, project_id, sprint_id, assignee_id, status, priority, story_points, due_date, progress_pct, created_by, created_at, is_deleted)
                VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 1, ?, 0)
                """,
                (title, desc, proj_id, sprint_id, status, priority, points, due_date, progress, created_at)
            )

        # Insert Manager tasks
        for title, desc, proj_id, status, priority, points, progress in manager_tasks:
            due_date = (today + timedelta(days=7)).isoformat()
            cursor.execute(
                """
                INSERT INTO tasks 
                (title, description, project_id, sprint_id, assignee_id, status, priority, story_points, due_date, progress_pct, created_by, created_at, is_deleted)
                VALUES (?, ?, ?, ?, 2, ?, ?, ?, ?, ?, 2, ?, 0)
                """,
                (title, desc, proj_id, sprint_id, status, priority, points, due_date, progress, created_at)
            )
        
        conn.commit()
        print("Successfully assigned 4 tasks each to Admin (Arvind) and Manager (Rajan)!")
    except Exception as e:
        print("Error during execution:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    assign_tasks_to_both()
