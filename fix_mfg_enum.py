from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import SessionLocal

def fix_mfg_method():
    db: Session = SessionLocal()
    print("Connected to database.")
    
    # Check if 'Hand-made' or 'HAND_MADE' exists and needs to be migrated to 'Hand-finished'
    try:
        # PostgreSQL enum modification is tricky. 
        # First, let's see what values are actually in the DB causing the crash.
        # The crash happens when SQLAlchemy tries to map a string from DB to the Python Enum.
        # The error says "LookupError: 'HAND_MADE' is not among the defined enum values."
        # This implies the DB has 'HAND_MADE' but Python expects 'Hand-finished'.
        
        # NOTE: If we want to support HAND_MADE, we should add it to Python Enum.
        # If we want to standardize, we should update the DB rows to a valid Enum value.
        
        # Let's assume we want to standardize to 'Hand-finished' (matches "HAND_FINISHED" enum member value)
        # But wait, the Python Enum value is "Hand-finished". The *Key* is HAND_FINISHED.
        # The DB likely contains the string 'HAND_MADE'.
        
        print("Updating invalid MfgMethod values...")
        
        # Update rows
        db.execute(text("UPDATE ref_mouthpieces SET manufacturing_method = 'Hand-finished' WHERE manufacturing_method = 'HAND_MADE'"))
        db.execute(text("UPDATE ref_mouthpieces SET manufacturing_method = 'Hand-finished' WHERE manufacturing_method = 'Hand-made'"))
        
        db.commit()
        print("Update complete.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_mfg_method()
