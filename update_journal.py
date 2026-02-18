
try:
    with open('copilot_journal.md', 'r') as f:
        content = f.read()
    
    new_entry = """## 2026-02-18 22:55
User Prompt: "Separate text fields for 'Not Listed' items and 'Modifications' (Mouthpiece/Reed). Add 'Not Listed' to Reed Strength. Make Resistance, Tone, and Dynamics optional in Evaluation. Move Modification details to be specific to the item."
Changes:
- **Database Schema**: 
    - Added `mouthpiece_man_details`, `reed_man_details`, `mouthpiece_mod_details`, `reed_mod_details` columns to `player_submissions` table via migration/update script.
    - Updated `resistance_feel`, `brightness_feel`, `min_dynamic`, `max_dynamic` columns to be `NULLABLE`.
    - Created and ran `migrate_schema_v2.py` to safely migrate the local SQLite database.
- **Backend Models**:
    - Updated `PlayerSubmission` in `backend/models.py` to include new text fields and make rating fields optional.
- **Frontend Types**:
    - Updated `PlayerSubmission` interface in `frontend/src/types.ts` to reflect the updated schema.
- **Frontend UI (`SurveyWizard.tsx`)**:
    - **Separate Details**: 
        - Mouthpiece Manufacturer/Model/Tip "Not Listed" now binds to `mouthpiece_man_details`.
        - Reed Manufacturer/Model/Strength "Not Listed" now binds to `reed_man_details`.
    - **Reed Strength**: Added "Not Listed" option to strength dropdown and a conditional text input.
    - **Modifications**:
        - Moved modification details text areas to be immediately below their respective "Is Modified" checkboxes (Mouthpiece/Reed).
        - Bound to `mouthpiece_mod_details` and `reed_mod_details` respectively.
        - Removed the generic "Modification Details" section from Step 4.
    - **Optional Ratings**:
        - Removed asterisk `*` from Resistance, Tone Color, and Dynamic Range labels.
        - Updated `validateStep` to allow these fields to be skipped/undefined.
- **Verification**:
    - `npm run lint --prefix frontend`: Passed.
    - `npm run test:frontend`: Passed.
    - `npm run test:backend`: Passed.
    - `npm run build --prefix frontend`: Passed.

"""
    
    # Insert after title
    if "# Copilot Journal" in content:
        parts = content.split("# Copilot Journal", 1)
        new_content = "# Copilot Journal\n\n" + new_entry + parts[1].lstrip()
    else:
        new_content = "# Copilot Journal\n\n" + new_entry + content

    with open('copilot_journal.md', 'w') as f:
        f.write(new_content)
        
    print("Journal updated.")

except Exception as e:
    print(f"Error: {e}")
