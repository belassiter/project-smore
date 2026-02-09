from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
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
