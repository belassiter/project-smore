from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from contextlib import asynccontextmanager

from backend import crud, models, schemas
from backend.database import SessionLocal, engine, get_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if they don't exist
    models.Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(title="Saxophone Mouthpiece-Reed Recommender", lifespan=lifespan)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Reed Recommender API"}

@app.get("/api/v1/options/mouthpieces", response_model=List[schemas.MouthpieceOut])
def read_mouthpieces(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    mouthpieces = crud.get_mouthpieces(db)
    return mouthpieces

@app.get("/api/v1/options/reeds", response_model=List[schemas.ReedOut])
def read_reeds(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    reeds = crud.get_reeds(db)
    return reeds

@app.post("/api/v1/survey/submit", response_model=schemas.PlayerSubmissionOut, status_code=status.HTTP_201_CREATED)
def create_submission(submission: schemas.PlayerSubmissionCreate, db: Session = Depends(get_db)):
    return crud.create_submission(db=db, submission=submission)

@app.get("/api/v1/submissions/mouthpiece/{mouthpiece_id}", response_model=List[schemas.PlayerSubmissionOut])
def read_submissions_by_mouthpiece(mouthpiece_id: str, db: Session = Depends(get_db)):
    return crud.get_submissions_by_mouthpiece(db, mouthpiece_id=mouthpiece_id)

@app.get("/api/v1/stats/active_mouthpieces")
def get_active_mouthpieces(db: Session = Depends(get_db)):
    ids = crud.get_active_mouthpiece_ids(db)
    return [str(i[0]) for i in ids]

@app.get("/api/v1/stats/exploration", response_model=List[schemas.ExplorationDataPoint])
def get_exploration_data(instrument: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_exploration_data(db, instrument=instrument)

@app.get("/api/v1/stats/scatter_data", response_model=List[schemas.ScatterDataPoint])
def get_scatter_data(db: Session = Depends(get_db)):
    """
    Returns aggregated data for scatter plots:
    - Grouped by (mouthpiece, tip, reed)
    - Averaged ratings
    - Count of submissions
    """
    data = crud.get_aggregated_scatter_data(db)
    
    # Map the SQLAlchemy Row objects to the Pydantic model
    return [
        schemas.ScatterDataPoint(
            mouthpiece_id=row.mouthpiece_id,
            tip_opening_id=row.tip_opening_id,
            reed_id=row.reed_id,
            
            mouthpiece_manufacturer=row.mouthpiece_manufacturer or "Unknown",
            mouthpiece_model=row.mouthpiece_model or "Unknown",
            mouthpiece_material=row.mouthpiece_material,
            baffle_type=row.baffle_type,
            chamber_size=row.chamber_size,
            
            tip_label=row.tip_label,
            tip_opening_inch=float(row.tip_opening_inch) if row.tip_opening_inch else 0.0,
            facing_length=row.facing_length,
            
            reed_manufacturer=row.reed_manufacturer,
            reed_model=row.reed_model,
            reed_strength=row.reed_strength,
            reed_cut=row.reed_cut,
            reed_material=row.reed_material,
            
            submission_count=row.submission_count,
            avg_suitability=float(row.avg_suitability) if row.avg_suitability else 0.0,
            avg_resistance=float(row.avg_resistance) if row.avg_resistance else None,
            avg_brightness=float(row.avg_brightness) if row.avg_brightness else None,
            avg_min_dynamic=float(row.avg_min_dynamic) if row.avg_min_dynamic else None,
            avg_max_dynamic=float(row.avg_max_dynamic) if row.avg_max_dynamic else None
        )
        for row in data
    ]
