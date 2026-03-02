import json
import os
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import SessionLocal, engine
from backend.models import Mouthpiece, TipOpening, Reed

# Assuming models.py Enums match the string values in JSON, or SQLAlchemy handles coercoin.
# If strict enum matching is needed, we might need to map strings to Enum objects.
# For now, relying on SQLAlchemy's ability to handle string-to-enum if configured, 
# or we just ensure the JSON has valid values.

def load_seeds():
    db: Session = SessionLocal()
    seed_dir = os.path.join("data", "seeds")
    
    if not os.path.exists(seed_dir):
        print(f"No seed directory found at {seed_dir}")
        return

    print("Loading seeds from JSON...")

    # Load Reeds
    try:
        with open(os.path.join(seed_dir, "reeds.json"), "r") as f:
            reeds_data = json.load(f)
            for item in reeds_data:
                # Check exist
                exists = db.query(Reed).filter(Reed.id == item["id"]).first()
                if not exists:
                    db.add(Reed(**item))
            db.commit()
            print(f"Processed {len(reeds_data)} reeds.")
    except FileNotFoundError:
        print("reeds.json not found.")

    # Load Mouthpieces
    try:
        with open(os.path.join(seed_dir, "mouthpieces.json"), "r") as f:
            mpc_data = json.load(f)
            for item in mpc_data:
                exists = db.query(Mouthpiece).filter(Mouthpiece.id == item["id"]).first()
                if not exists:
                    db.add(Mouthpiece(**item))
            db.commit()
            print(f"Processed {len(mpc_data)} mouthpieces.")
    except FileNotFoundError:
        print("mouthpieces.json not found.")

    # Load Tips (depend on mouthpieces)
    try:
        with open(os.path.join(seed_dir, "tip_openings.json"), "r") as f:
            tips_data = json.load(f)
            for item in tips_data:
                exists = db.query(TipOpening).filter(TipOpening.id == item["id"]).first()
                if not exists:
                    db.add(TipOpening(**item))
            db.commit()
            print(f"Processed {len(tips_data)} tip openings.")
    except FileNotFoundError:
        print("tip_openings.json not found.")
        
    db.close()

if __name__ == "__main__":
    load_seeds()
