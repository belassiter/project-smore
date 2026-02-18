from backend.database import SessionLocal, engine
from backend import models
from sqlalchemy import text

def migrate():
    # Helper to add column if not exists
    with engine.connect() as conn:
        with conn.begin():
            # Check and add mouthpiece_man_details
            try:
                conn.execute(text("ALTER TABLE player_submissions ADD COLUMN mouthpiece_man_details TEXT"))
                print("Added mouthpiece_man_details column")
            except Exception as e:
                print(f"Skipping mouthpiece_man_details (probably exists)")

            # Check and add reed_man_details  
            try:
                conn.execute(text("ALTER TABLE player_submissions ADD COLUMN reed_man_details TEXT"))
                print("Added reed_man_details column")
            except Exception as e:
                print(f"Skipping reed_man_details (probably exists)")
                
            # Check and add mouthpiece_mod_details
            try:
                conn.execute(text("ALTER TABLE player_submissions ADD COLUMN mouthpiece_mod_details TEXT"))
                print("Added mouthpiece_mod_details column")
            except Exception as e:
                 print(f"Skipping mouthpiece_mod_details (probably exists)")

            # Check and add reed_mod_details
            try:
                conn.execute(text("ALTER TABLE player_submissions ADD COLUMN reed_mod_details TEXT"))
                print("Added reed_mod_details column")
            except Exception as e:
                 print(f"Skipping reed_mod_details (probably exists)")
                 
            # Note: We probably want to keep modification_details for legacy or general use, 
            # or migrate data from it. For now, I'll strictly ADD the new columns as requested.

if __name__ == "__main__":
    migrate()
