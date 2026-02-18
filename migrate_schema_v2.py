import sqlite3
import traceback

DB_FILE = "project_smore_local.db"

def migrate():
    print(f"Connecting to {DB_FILE}...")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Get current columns
    cursor.execute("PRAGMA table_info(player_submissions)")
    columns = cursor.fetchall()
    existing_cols = {c[1] for c in columns}
    print("Existing columns:", existing_cols)

    cursor.execute("PRAGMA foreign_keys=OFF")
    
    # Start transaction
    cursor.execute("BEGIN TRANSACTION")

    try:
        # Create new table with updated schema
        create_sql = """
        CREATE TABLE player_submissions_new (
            id CHAR(32) NOT NULL, 
            timestamp DATETIME, 
            player_id VARCHAR NOT NULL, 
            instrument VARCHAR(10) NOT NULL, 
            genre VARCHAR(9) NOT NULL, 
            sub_genre VARCHAR, 
            skill_level VARCHAR(12) NOT NULL, 
            player_hours VARCHAR(9) NOT NULL, 
            mouthpiece_id CHAR(32) NOT NULL, 
            tip_opening_id CHAR(32) NOT NULL, 
            reed_id CHAR(32) NOT NULL, 
            suitability_rating INTEGER NOT NULL, 
            resistance_feel INTEGER, 
            brightness_feel INTEGER, 
            min_dynamic INTEGER, 
            max_dynamic INTEGER, 
            strength_rating INTEGER NOT NULL, 
            is_mouthpiece_modified BOOLEAN DEFAULT 0, 
            is_reed_modified BOOLEAN DEFAULT 0, 
            modification_details TEXT, 
            mouthpiece_man_details TEXT,
            reed_man_details TEXT,
            mouthpiece_mod_details TEXT,
            reed_mod_details TEXT,
            comments TEXT, 
            PRIMARY KEY (id), 
            FOREIGN KEY(mouthpiece_id) REFERENCES ref_mouthpieces (id), 
            FOREIGN KEY(tip_opening_id) REFERENCES ref_tip_openings (id), 
            FOREIGN KEY(reed_id) REFERENCES ref_reeds (id)
        );
        """
        cursor.execute(create_sql)
        
        # Determine columns to copy
        # We need to intersect existing columns with new schema columns
        # Note: 'modifications' in old table is not in new table, so it must be excluded.
        
        target_cols = [
            'id', 'timestamp', 'player_id', 'instrument', 'genre', 'sub_genre', 
            'skill_level', 'player_hours', 'mouthpiece_id', 'tip_opening_id', 'reed_id', 
            'suitability_rating', 'resistance_feel', 'brightness_feel', 'min_dynamic', 
            'max_dynamic', 'strength_rating', 'modification_details', 'comments',
            # New columns if they exist in old table (from previous migrations)
            'mouthpiece_man_details', 'reed_man_details', 'mouthpiece_mod_details', 'reed_mod_details',
            'is_mouthpiece_modified', 'is_reed_modified' 
        ]
        
        # Only copy columns that exist in BOTH (to be safe against different DB states)
        cols_to_copy = [c for c in target_cols if c in existing_cols]
        
        if cols_to_copy:
            cols_str = ", ".join(cols_to_copy)
            print(f"Copying data for columns: {cols_str}")
            cursor.execute(f"INSERT INTO player_submissions_new ({cols_str}) SELECT {cols_str} FROM player_submissions")
        else:
            print("Warning: No columns to copy!")
        
        # Drop old table
        cursor.execute("DROP TABLE player_submissions")
        
        # Rename new table
        cursor.execute("ALTER TABLE player_submissions_new RENAME TO player_submissions")
        
        conn.commit()
        print("Migration successful.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        traceback.print_exc()
        raise e
    finally:
        cursor.execute("PRAGMA foreign_keys=ON")
        conn.close()

if __name__ == "__main__":
    migrate()
