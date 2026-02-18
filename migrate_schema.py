import sqlite3

DB_FILE = "project_smore_local.db"

def migrate():
    print(f"Connecting to {DB_FILE}...")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Get current columns
    cursor.execute("PRAGMA table_info(player_submissions)")
    columns = cursor.fetchall()
    col_names = [c[1] for c in columns]
    
    print("Current columns:", col_names)

    # Disable foreign keys
    cursor.execute("PRAGMA foreign_keys=OFF")
    
    # Start transaction
    cursor.execute("BEGIN TRANSACTION")

    try:
        # Create new table with updated schema (nullable fields and new columns included if missing)
        # Note: We are using the definition from models.py essentially, but manually here for simplicity
        # The key changes: 
        # resistance_feel INTEGER NULL
        # brightness_feel INTEGER NULL
        # min_dynamic INTEGER NULL
        # max_dynamic INTEGER NULL
        # + new text columns
        
        create_sql = """
        CREATE TABLE player_submissions_new (
            id CHAR(32) NOT NULL, 
            timestamp DATETIME, 
            player_id VARCHAR NOT NULL, 
            instrument VARCHAR(5) NOT NULL, 
            genre VARCHAR(10) NOT NULL, 
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
            is_mouthpiece_modified BOOLEAN, 
            is_reed_modified BOOLEAN, 
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
        
        # Prepare columns for copy
        # We need to map old columns to new table.
        # Check if new columns exist in old table.
        common_cols = []
        for col in col_names:
            if col in [
                'id', 'timestamp', 'player_id', 'instrument', 'genre', 'sub_genre', 
                'skill_level', 'player_hours', 'mouthpiece_id', 'tip_opening_id', 'reed_id', 
                'suitability_rating', 'resistance_feel', 'brightness_feel', 'min_dynamic', 
                'max_dynamic', 'strength_rating', 'is_mouthpiece_modified', 'is_reed_modified', 
                'modification_details', 'comments',
                'mouthpiece_man_details', 'reed_man_details', 'mouthpiece_mod_details', 'reed_mod_details'
            ]:
                common_cols.append(col)
        
        cols_str = ", ".join(common_cols)
        print(f"Copying data for columns: {cols_str}")
        
        cursor.execute(f"INSERT INTO player_submissions_new ({cols_str}) SELECT {cols_str} FROM player_submissions")
        
        # Drop old table
        cursor.execute("DROP TABLE player_submissions")
        
        # Rename new table
        cursor.execute("ALTER TABLE player_submissions_new RENAME TO player_submissions")
        
        conn.commit()
        print("Migration successful.")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise e
    finally:
        cursor.execute("PRAGMA foreign_keys=ON")
        conn.close()

if __name__ == "__main__":
    migrate()
