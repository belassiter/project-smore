# Project Specification: The Saxophone Mouthpiece-Reed Recommender

## 1. Project Overview
**Mission:** Create a comprehensive, crowdsourced dataset of saxophone mouthpiece and reed combinations to build a "Reed Recommender" engine and provide structured data for academic acoustical research.

**Core Value Propositions:**
1.  **The Survey ("The Wizard"):** A structured, multi-step data collection tool to gather "real-world" player setups (Subjective feedback + Objective gear data).
2.  **The Recommender:** A tool that suggests reeds based on mouthpiece geometry and other user preferences (e.g., "If you play a Meyer 5M, 40% of users prefer a Vandoren Java 2.5").
3.  **The Data Explorer:** A public interface for researchers to analyze trends (e.g., Tip Opening vs. Reed Strength correlations).

---

## 2. Technical Architecture

### The "Split Stack"
* **Frontend:** React (Vite + Tailwind CSS + TypeScript).
    * *Hosting:* Static HTML/JS.
    * *Ui Library:* Lucide React (Icons), Recharts (Data Viz).
* **Backend API:** FastAPI (Python).
    * *Role:* Handles logic, statistical correlations, and database transactions.
* **Database:** Supabase (PostgreSQL).
    * *Role:* Relational data storage, Row-Level Security (RLS).
    * *Migration Tool:* Alembic.
* **Testing:**
    * *Frontend:* Vitest.
    * *Backend:* Pytest.

### CI/CD & DevOps
*   **Trigger:** Push to `main` branch.
*   **Tasks:** Linting (ESLint), Testing (Vitest, Pytest), Building.

---

## 3. Database Schema (PostgreSQL/Supabase)

### A. Reference Tables (Static Data)
* **`ref_mouthpieces`** (RLS Enabled, Public Read)
    * `id` (UUID, PK)
    * `manufacturer` (String)
    * `model` (String)
    * `variant` (String, nullable)
    * `material` (Enum: HR, Metal, Plastic, Wood)
    * `baffle_type` (Enum: Straight, Rollover, Step, Concave, High, Low)
    * `chamber_size` (Enum: Small, Medium, Medium-Large, Large)
    * `manufacturing_method` (Enum: CNC, Hand-finished, Cast)
    * `data_source` (String, nullable)

* **`ref_tip_openings`** (RLS Enabled, Public Read)
    * `id` (UUID, PK)
    * `mouthpiece_id` (FK -> ref_mouthpieces)
    * `label` (String) - e.g., "7", "C*", "6"
    * `opening_inch` (Decimal) - e.g., 0.105 (note: convert to mm in UI)
    * `facing_length` (Enum: Short, Medium, Long)
    * `instrument` (Enum: Sopranino...Contrabass)
    * `data_source` (String, nullable)

* **`ref_reeds`** (RLS Enabled, Public Read)
    * `id` (UUID, PK)
    * `manufacturer` (String)
    * `model` (String) - e.g., "Java Green"
    * `cut` (Enum: Filed, Unfiled)
    * `material` (Enum: Cane, Synthetic, Coated)
    * `strength_label` (String) - e.g., "2.5", "Medium", "3H"
    * `data_source` (String, nullable)

### B. Submission Tables (User Data)
* **`player_submissions`** (RLS Enabled, Public Read/Insert)
    * `id` (UUID, PK)
    * `timestamp` (DateTime)
    * `player_id` (String/Hash) - Anonymous identifier for spam prevention.
    
    **Setup Context:**
    * `instrument` (Enum: Sopranino...Contrabass)
    * `genre` (Enum: Jazz, Classical, Pop, Funk, Other)
    * `sub_genre` (String, nullable)
    * `skill_level` (Enum: Beginner, Intermediate, Enthusiast, Semi-Pro, Pro)
    * `player_hours` (Enum: Low, Medium, High, Very High)
    
    **Gear Links:**
    * `mouthpiece_id` (FK -> ref_mouthpieces)
    * `tip_opening_id` (FK -> ref_tip_openings)
    * `reed_id` (FK -> ref_reeds)
    
    **"Not Listed" Support:**
    * `mouthpiece_man_details` (Text, nullable) - Manual entry if MP not found.
    * `reed_man_details` (Text, nullable) - Manual entry if Reed not found.

    **Subjective Results:**
    * `suitability_rating` (1-5 Integer) - "How well does this work for you?"
    * `resistance_feel` (-5 to +5 Integer, Nullable) - Free-blowing vs. Resistant (Optional)
    * `brightness_feel` (-5 to +5 Integer, Nullable) - Dark vs. Bright (Optional)
    * `min_dynamic` (1-8 Int, Nullable) - Softest comfortable volume (Optional)
    * `max_dynamic` (1-8 Int, Nullable) - Loudest comfortable volume (Optional)
    * `strength_rating` (-5 to +5 Integer) - Too Soft vs Too Hard
    
    **Modifications:**
    * `is_mouthpiece_modified` (Boolean)
    * `mouthpiece_mod_details` (Text, nullable)
    * `is_reed_modified` (Boolean)
    * `reed_mod_details` (Text, nullable)
    
    * `comments` (Text)

### C. Views
* **`view_ref_tip_openings_full`**
    * `security_invoker=true`
    * Joins `ref_tip_openings` with `ref_mouthpieces` for easier querying.

---

## 4. API Endpoints (FastAPI)

### Public Routes
* `GET /api/v1/options/mouthpieces` - Returns list for dropdowns.
* `GET /api/v1/options/reeds` - Returns list for dropdowns.
* `GET /api/v1/stats/correlation` - Returns JSON for scatter plots.
* `POST /api/v1/survey/submit` - Validates and inserts a new `player_submission`.
* `GET /submissions/mouthpiece/{mouthpiece_id}` - Returns submissions for similarity scoring.

---

## 5. Frontend Features

### Survey Wizard (`SurveyWizard.tsx`)
*   **Step 1:** Player Context (Skill, Hours).
*   **Step 2:** Mouthpiece Selection (Instrument, Genre, Mfg, Model, Tip).
    *   *Smart Filtering:* Tip openings filtered by selected Instrument.
    *   *"Not Listed":* Allows manual text entry for unknown gear.
*   **Step 3:** Reed Selection (Mfg, Model, Strength).
    *   *Sorting:* Numeric sort for strengths (2.0 < 2.5 < 3.0).
*   **Step 4:** Evaluation (Ratings, Modifications).
    *   *Optional Fields:* Resistance, Brightness, Dynamics.

### Components
*   **`HelpPopover`**: Contextual help that closes on global click.
*   **`ErrorMsg`**: Standardized form validation error display.
    * **Logic:** Finds similar players in DB. Filters by success rating > 4. Adjusts strength based on "problem" input.
    * **Output:** JSON list of recommended reeds with confidence scores.

---

## 5. Frontend Structure (React)

### Pages
1.  **Landing Page:** "Find your perfect reed" (Call to Action).
2.  **Survey Wizard:** Multi-step form.
    * Step 1: Your Instrument & Genre.
    * Step 2: Your Gear (Dropdowns driven by API).
    * Step 3: Your Feedback (Sliders/Likert scales).
3.  **Results/Dashboard:**
    * "The Saxophone Mouthpiece-Reed Survey" - Global stats.
    * Interactive Scatter Plot (Recharts library).
4.  **Admin Login:** (Optional, or use Supabase Dashboard).

### Key Components
* `SetupSelector`: A dependent dropdown component (Manufacturer -> Model -> Tip Opening).
* `ScatterChart`: Recharts implementation for academic data viewing.
* `DynamicSlider`: A dual-handle range slider. Track: 8 steps. Labels: ppp, pp, p, mp, mf, f, ff, fff. (use music notation font). Output: Returns an object { min: 3, max: 7 } (p to ff).

---

## 6. Testing Strategy

* **Backend (pytest):**
    * Unit tests for Recommender logic (math verification).
    * Integration tests for API endpoints (using `TestClient`).
    * *Constraint:* Create a temporary DB for testing so as to not pollute prod data
* **Frontend (Vitest):**
    * Component tests for the `SetupSelector` (ensure dependent dropdowns update correctly).
* **E2E (Playwright):**
    * Critical Path: User lands on home -> Clicks Survey -> Fills Form -> Submits -> Sees "Thank You".
