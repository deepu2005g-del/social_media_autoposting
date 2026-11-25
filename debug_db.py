import sys
import os
import json

backend_dir = os.path.join(os.path.dirname(__file__), "backend")
sys.path.append(backend_dir)

from db import SessionLocal
from models import User, LinkedInUser, TwitterUser

def debug_db():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        li_users = db.query(LinkedInUser).all()
        tw_users = db.query(TwitterUser).all()
        
        data = {
            "users": [{"id": u.id, "email": u.email} for u in users],
            "linkedin_connected": [{"id": l.id, "user_id": l.user_id, "li_id": l.linkedin_id} for l in li_users],
            "twitter_connected": [{"id": t.id, "user_id": t.user_id, "screen": t.screen_name} for t in tw_users]
        }
        print(json.dumps(data, indent=2))
    finally:
        db.close()

if __name__ == "__main__":
    debug_db()
