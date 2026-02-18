import sqlalchemy
from sqlalchemy import create_engine, text

# Active URL from .env
# Using correct URL from .env file:
DATABASE_URL = "postgresql://postgres.wqqgswpointoedwqjykv:DJuFZcgvooXDIWXd@aws-1-us-west-1.pooler.supabase.com:6543/postgres"

def fix_enum():
    try:
        # Create engine with isolation_level="AUTOCOMMIT" to allow ALTER TYPE inside transaction block if supported
        # But actually ALTER TYPE ... ADD VALUE cannot be in a transaction block. 
        # So we use execution_options({"isolation_level": "AUTOCOMMIT"})
        engine = create_engine(DATABASE_URL).execution_options(isolation_level="AUTOCOMMIT")
        
        with engine.connect() as conn:
            print("Connected to database.")
            
            # 1. Use raw SQL to alter the enum type directly.
            # We don't need extensive inspection if we just want to patch it.
            # But let's check if the type exists first to be safe.
            
            # Attempt to add 'High'
            print("Attempting to add 'High' to enum 'baffletype'...")
            try:
                conn.execute(text("ALTER TYPE baffletype ADD VALUE IF NOT EXISTS 'High'"))
                print("Success: Added 'High' (or already existed).")
            except Exception as e:
                # If IF NOT EXISTS is not supported (Postgres < 12), catch error
                if "already exists" in str(e):
                    print("Info: 'High' already exists.")
                else:
                    # Fallback for older Postgres without IF NOT EXISTS syntax for ADD VALUE
                    try: 
                        conn.execute(text("ALTER TYPE baffletype ADD VALUE 'High'"))
                        print("Success: Added 'High'.")
                    except Exception as e2:
                        print(f"Error adding 'High': {e2}")

            # Attempt to add 'Low'
            print("Attempting to add 'Low' to enum 'baffletype'...")
            try:
                conn.execute(text("ALTER TYPE baffletype ADD VALUE IF NOT EXISTS 'Low'"))
                print("Success: Added 'Low' (or already existed).")
            except Exception as e:
                try: 
                    conn.execute(text("ALTER TYPE baffletype ADD VALUE 'Low'"))
                    print("Success: Added 'Low'.")
                except Exception as e2:
                    print(f"Error adding 'Low': {e2}")

    except Exception as e:
        print(f"Critical Error: {e}")

if __name__ == "__main__":
    fix_enum()
