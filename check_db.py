import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
sys.path.append(backend_dir)

from db import engine
from sqlalchemy import inspect

def check_schema():
    inspector = inspect(engine)
    print("=== PostgreSQL Connected Tables ===")
    for table in inspector.get_table_names():
        cols = [c["name"] for c in inspector.get_columns(table)]
        print(f"Table: {table}")
        print(f"  Columns: {', '.join(cols)}")

if __name__ == "__main__":
    check_schema()
