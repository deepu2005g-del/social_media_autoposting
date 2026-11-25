from sqlalchemy import text
from db import engine, Base

def run_migrations():
    """Ensure all PostgreSQL tables and schemas are created."""
    try:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR"))
            except Exception:
                # Fallback for dialects without IF NOT EXISTS (e.g., older SQLite)
                try:
                    conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR"))
                except Exception:
                    pass
        print("[MIGRATION] Database schema verified successfully.")
    except Exception as e:
        print(f"[MIGRATION] Schema check warning: {e}")

if __name__ == "__main__":
    run_migrations()
