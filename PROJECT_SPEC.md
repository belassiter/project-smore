# Project Specification: The Saxophone Mouthpiece-Reed Recommender

## 1. Project Overview
**Mission:** Create a comprehensive, crowdsourced dataset of saxophone mouthpiece and reed combinations to build a "Reed Recommender" engine and provide structured data for academic acoustical research.

**Core Value Propositions:**
1.  **The Survey:** A structured data collection tool to gather "real-world" player setups (Subjective feedback + Objective gear data).
2.  **The Recommender:** A tool that suggests reeds based on mouthpiece geometry and other user preferences (e.g., "If you play a Meyer 5M, 40% of users prefer a Vandoren Java 2.5").
3.  **The Data Explorer:** A public interface for researchers to analyze trends (e.g., Tip Opening vs. Reed Strength correlations).

---

## 2. Technical Architecture

### The "Split Stack"
* **Frontend:** React (Vite + Tailwind CSS).
    * *Hosting:* Static HTML/JS uploaded to a branded web server via FTP.
* **Backend API:** FastAPI (Python).
    * *Hosting:* Render.com (Free Tier) or Railway.
    * *Role:* Handles logic, statistical correlations, and database transactions.
* **Database:** Supabase (PostgreSQL).
    * *Role:* Relational data storage, Auth (optional), and row-level security.

### CI/CD Pipeline (GitHub Actions)
1.  **Trigger:** Push to `main` branch.
2.  **Job 1 (Test):** Runs `pytest` (Backend) and `Vitest` (Frontend).
3.  **Job 2 (Deploy Backend):** If tests pass, trigger Render deploy hook.
4.  **Job 3 (Deploy Frontend):** If tests pass, build React app and FTP `dist/` folder to the web server.

---

## 3. Database Schema (PostgreSQL/Supabase)

### A. Reference Tables (Static Data)
* **`ref_mouthpieces`**
    * `id` (UUID, PK)
    * `manufacturer` (String)
    * `model` (String)
    * `variant` (String, nullable)
    * `material` (Enum: HR, Metal, Plastic, Wood)
    * `baffle_type` (Enum: Straight, Rollover, Step, Concave)
    * `chamber_size` (Enum: Small, Medium, Medium-Large, Large)
    * `manufacturing_method` (Enum: CNC, Hand-finished, Cast)

* **`ref_tip_openings`**
    * `id` (UUID, PK)
    * `mouthpiece_id` (FK -> ref_mouthpieces)
    * `label` (String) - e.g., "7", "C*", "6"
    * `opening_inch` (Decimal) - e.g., 0.105 (note: convert to mm in UI)
    * `facing_length` (Enum: Short, Medium, Long)

* **`ref_reeds`**
    * `id` (UUID, PK)
    * `manufacturer` (String)
    * `model` (String) - e.g., "Java Green"
    * `cut` (Enum: Filed, Unfiled)
    * `material` (Enum: Cane, Synthetic, Coated)
    * `strength_label` (String) - e.g., "2.5", "Medium", "3H"

### B. Submission Tables (User Data)
* **`player_submissions`**
    * `id` (UUID, PK)
    * `timestamp` (DateTime)
    * `player_id` (String/Hash) - Anonymous identifier for spam prevention. Should identify the same user over time, but also not be personally identifying
    * **Setup Context:**
        * `instrument` (Enum: Sopranino, Soprano, Alto, Tenor, Baritone, Bass, Contrabass)
        * `genre` (Enum: Jazz, Classical, Pop, Funk...)
        * `sub_genre` (Enum: Jazz: Bebop, Hot/New Orleans, Swing-Era, Straight-ahead, Big Band, Contemporary, Fusion, Latin...)
        * `skill_level` (Enum: Beginner, Intermediate, Enthusiast, Semi-Pro, Pro)
        * `player_hours` (Enum: Low (<3 hours/week), Medium (>6 hours/week), High (>10 hours/week), Very High (>20 hours/week)
    * **Gear Links:**
        * `mouthpiece_id` (FK -> ref_mouthpieces)
        * `tip_opening_id` (FK -> ref_tip_openings)
        * `reed_id` (FK -> ref_reeds)
    * **Subjective Results:**
        * `suitability_rating` (1-5 Integer) - "How well does this work for you?"
        * `resistance_feel` (-5 to +5 Integer) - Free-blowing vs. Resistant
        * `brightness_feel` (-5 to +5 Integer) - Dark vs. Bright
        * `min_dynamic` (1-8 Int) - Softest comfortable volume.
        * *Mapping:* 1=ppp, 2=pp, 3=p, 4=mp, 5=mf, 6=f, 7=ff, 8=fff.
        * `max_dynamic` (1-8 Int) - Loudest comfortable volume.
        * *Constraint:* Must be >= `min_dynamic`.
        * `strength_rating` (-5 to +5 Integer) - Too Soft vs Too Hard
        * `modifications` (Boolean) - "Do you modify your reeds?"
        * `modification_details` (Text) - "How do you modify your reeds? (clip, sand, etc). (note: only show this if `modifications` is true)
        * `comments` (Text)

---

## 4. API Endpoints (FastAPI)

### Public Routes
* `GET /api/v1/options/mouthpieces` - Returns list for dropdowns.
* `GET /api/v1/options/reeds` - Returns list for dropdowns.
* `GET /api/v1/stats/correlation` - Returns JSON for scatter plots (Tip Opening X vs Reed Strength Y).
* `POST /api/v1/survey/submit` - Validates and inserts a new `player_submission`.

### Recommender Routes
* `POST /api/v1/recommend/reed`
    * **Input:** `{mouthpiece_id, tip_opening, current_reed_strength, problem ("too_soft", "too_hard"), genre}`
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
