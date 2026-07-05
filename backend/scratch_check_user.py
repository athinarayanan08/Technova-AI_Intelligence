import sqlite3

def check_users():
    conn = sqlite3.connect("ai_org.db")
    cursor = conn.cursor()
    try:
        # Check if Adhi exists
        cursor.execute("SELECT name, email, role FROM employees WHERE email='adhi.rajan@technova.com'")
        adhi = cursor.fetchone()
        print("Adhi Rajan search result:", adhi)
        
        # Check all employees count
        cursor.execute("SELECT count(*) FROM employees")
        count = cursor.fetchone()
        print("Total employees count:", count[0])

        # Check tasks for Arvind (Admin - ID 1)
        cursor.execute("SELECT title, status FROM tasks WHERE assignee_id=1")
        admin_tasks = cursor.fetchall()
        print("Admin (Arvind) tasks:", admin_tasks)

        # Check tasks for Rajan (Manager - ID 2)
        cursor.execute("SELECT title, status FROM tasks WHERE assignee_id=2")
        manager_tasks = cursor.fetchall()
        print("Manager (Rajan) tasks:", manager_tasks)

        # Total tasks count
        cursor.execute("SELECT count(*) FROM tasks")
        task_count = cursor.fetchone()
        print("Total tasks in database:", task_count[0])

    except Exception as e:
        print("Error:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    check_users()
