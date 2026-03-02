import json
import os
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import SessionLocal
from backend.models import Mouthpiece, TipOpening, Reed, PlayerSubmission

from decimal import Decimal

# Helper to serialize SQLAlchemy objects
def to_dict(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

def serialize_uuid(obj):
    if isinstance(obj, dict):
        return {k: serialize_uuid(v) for k, v in obj.items()}
    if hasattr(obj, '__class__') and obj.__class__.__name__ == 'UUID':
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
    if hasattr(obj, 'isoformat'):
        return obj.isoformat()
    if isinstance(obj, list):
        return [serialize_uuid(i) for i in obj]
    return obj

def backup_data():
    db: Session = SessionLocal()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.join("backups", f"backup_{timestamp}")
    os.makedirs(backup_dir, exist_ok=True)
    
    print(f"Starting backup to {backup_dir}...")

    # 1. Reference Data (Public)
    mouthpieces = [to_dict(m) for m in db.query(Mouthpiece).all()]
    tip_openings = [to_dict(t) for t in db.query(TipOpening).all()]
    reeds = [to_dict(r) for r in db.query(Reed).all()]

    # 2. User Data (Private)
    submissions = [to_dict(s) for s in db.query(PlayerSubmission).all()]

    # Save Files
    with open(os.path.join(backup_dir, "ref_mouthpieces.json"), "w") as f:
        json.dump(serialize_uuid(mouthpieces), f, indent=2)
    
    with open(os.path.join(backup_dir, "ref_tip_openings.json"), "w") as f:
        json.dump(serialize_uuid(tip_openings), f, indent=2)
        
    with open(os.path.join(backup_dir, "ref_reeds.json"), "w") as f:
        json.dump(serialize_uuid(reeds), f, indent=2)

    with open(os.path.join(backup_dir, "player_submissions_PRIVATE.json"), "w") as f:
        json.dump(serialize_uuid(submissions), f, indent=2)

    print(f"Backup complete. {len(submissions)} submissions archived.")
    
    # Also update the 'committed' seeds in data/seeds
    seed_dir = os.path.join("data", "seeds")
    os.makedirs(seed_dir, exist_ok=True)
    
    print(f"Updating committed seeds in {seed_dir}...")
    with open(os.path.join(seed_dir, "mouthpieces.json"), "w") as f:
        json.dump(serialize_uuid(mouthpieces), f, indent=2)
    with open(os.path.join(seed_dir, "tip_openings.json"), "w") as f:
        json.dump(serialize_uuid(tip_openings), f, indent=2)
    with open(os.path.join(seed_dir, "reeds.json"), "w") as f:
        json.dump(serialize_uuid(reeds), f, indent=2)
        
    print("Seeds updated.")
    db.close()

if __name__ == "__main__":
    backup_data()
