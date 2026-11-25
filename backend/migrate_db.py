from db import engine, Base

def run_migrations():
    """Ensure all PostgreSQL tables and schemas are created."""
    try:
        Base.metadata.create_all(bind=engine)
        print("[MIGRATION] Database schema verified successfully.")
    except Exception as e:
        print(f"[MIGRATION] Schema check warning: {e}")

if __name__ == "__main__":
    run_migrations()
