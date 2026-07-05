import sqlite3

def get_employee_ids():
    conn = sqlite3.connect("ai_org.db")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, name, email, role FROM employees WHERE email IN ('admin@technova.com', 'rajan@technova.com')")
        for row in cursor.fetchall():
            print(row)
    except Exception as e:
        print("Error:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    get_employee_ids()
