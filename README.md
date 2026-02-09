# The Saxophone Mouthpiece-Reed (SMoRe) Recommender

## Overview
A data-driven application to help saxophonists find their optimal mouthpiece and reed combination based on real player data.

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Supabase account (for database)

### Setup

1. **Install Backend Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Install Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   ```

3. **Database Setup**:
   Ensure `.env` contains your Supabase connection string.
   ```bash
   alembic upgrade head
   python backend/seed_data.py
   ```

### Running the Application

To use the application, you need to run both the backend API and the frontend UI.

**1. Start the Backend API:**
From the project root:
```bash
uvicorn backend.main:app --reload --port 8000
```
This serves the API at `http://localhost:8000`.

**2. Start the Frontend UI:**
In a separate terminal, from the `frontend` directory:
```bash
npm run dev
```
This serves the UI at `http://localhost:5173`.

### Usage
Open your browser to `http://localhost:5173`.
Navigate to the "Participate in Survey" section to enter your setup data.
The wizard will guide you through:
1. Context (Instrument, Genre, Skill)
2. Mouthpiece Selection (Manufacturer, Model, Tip)
3. Reed Selection (Manufacturer, Model, Strength)
4. Playability Ratings (Resistance, Brightness, Suitability)
