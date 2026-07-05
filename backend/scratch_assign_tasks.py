import sqlite3
from datetime import date, timedelta, datetime

def assign_tasks_to_manager():
    conn = sqlite3.connect("ai_org.db")
    cursor = conn.cursor()
    try:
        # Find Rajan Mehta's ID
        cursor.execute("SELECT id FROM employees WHERE email='rajan@technova.com'")
        manager = cursor.fetchone()
        if not manager:
            print("Error: Manager Rajan Mehta (rajan@technova.com) not found.")
            return
        manager_id = manager[0]
        print(f"Found Manager Rajan Mehta with ID: {manager_id}")

        # Find a project to associate tasks with
        cursor.execute("SELECT id FROM projects LIMIT 2")
        projects = cursor.fetchall()
        if not projects:
            print("Error: No projects found to link tasks.")
            return
        project_alpha_id = projects[0][0]
        project_beta_id = projects[1][0] if len(projects) > 1 else projects[0][0]

        # Find a sprint to associate tasks with
        cursor.execute("SELECT id FROM sprints LIMIT 1")
        sprint = cursor.fetchone()
        sprint_id = sprint[0] if sprint else None

        # Sample tasks to insert
        tasks = [
            ("Prepare Q3 engineering budget allocations", "Determine server costs and contractor resources", project_alpha_id, "IN_PROGRESS", "HIGH", 5, 60),
            ("Conduct bi-weekly department alignment brief", "Review roadmaps and cross-functional team milestones", project_beta_id, "IN_REVIEW", "MEDIUM", 3, 90),
            ("Formulate strategic hiring plan for DevOps squad", "Draft job descriptions for Senior DevOps position", project_alpha_id, "TODO", "CRITICAL", 8, 0),
            ("Finalize architecture patterns document", "Publish code design specifications on Wiki", project_beta_id, "DONE", "LOW", 2, 100)
        ]

        today = date.today()
        created_at = datetime.utcnow().isoformat()

        for title, desc, proj_id, status, priority, points, progress in tasks:
            due_date = (today + timedelta(days=7)).isoformat()
            cursor.execute(
                """
                INSERT INTO tasks 
                (title, description, project_id, sprint_id, assignee_id, status, priority, story_points, due_date, progress_pct, created_by, created_at, is_deleted)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                """,
                (title, desc, proj_id, sprint_id, manager_id, status, priority, points, due_date, progress, manager_id, created_at)
            )
        
        conn.commit()
        print("Successfully assigned 4 operational tasks to Manager Rajan Mehta!")
    except Exception as e:
        print("Error during query execution:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    assign_tasks_to_manager()
