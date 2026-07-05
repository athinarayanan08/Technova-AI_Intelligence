import sqlite3

def run_migration():
    conn = sqlite3.connect("ai_org.db")
    cursor = conn.cursor()
    try:
        cursor.execute("ALTER TABLE daily_reports ADD COLUMN project_id INTEGER REFERENCES projects(id);")
        conn.commit()
        print("Column project_id added successfully to daily_reports table!")
    except Exception as e:
        print("Error during migration:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
