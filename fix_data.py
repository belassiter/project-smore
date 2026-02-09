import sys
import os

# Ensure backend package can be imported
sys.path.append(os.getcwd())

from backend.database import SessionLocal
from backend.models import Mouthpiece, TipOpening, InstrumentType, FacingLength
from sqlalchemy import select

def fix_selmer_concept():
    db = SessionLocal()
    try:
        print("Searching for Selmer Concept...")
        concept = db.execute(select(Mouthpiece).where(Mouthpiece.manufacturer == "Selmer Paris", Mouthpiece.model == "Concept")).scalar_one_or_none()
        
        if not concept:
            print("Selmer Concept not found.")
            return

        print(f"Found Concept ID: {concept.id}")
        
        # Get its tip openings
        tos = db.execute(select(TipOpening).where(TipOpening.mouthpiece_id == concept.id)).scalars().all()
        print(f"Found {len(tos)} tip openings.")
        
        for t in tos:
            print(f"  ID: {t.id}, Label: {t.label}, Opening: {t.opening_inch}")
            if t.label is None:
                print("    -> Label is None. Fixing...")
                # Selmer Concept for Alto is typically "Concept" model, one facing.
                # Opening is around 1.48mm (0.058")
                t.label = "Standard"
                if t.opening_inch is None:
                    t.opening_inch = 0.058
                if t.facing_length is None:
                    t.facing_length = FacingLength.MEDIUM
                # Also ensure instrument is set if missing
                if t.instrument is None:
                    t.instrument = InstrumentType.ALTO
                
                db.add(t)
        
        db.commit()
        print("Fix applied.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_selmer_concept()
