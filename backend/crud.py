from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend import models, schemas

def get_mouthpieces(db: Session):
    return db.query(models.Mouthpiece).all()

def get_reeds(db: Session):
    return db.query(models.Reed).all()

def create_submission(db: Session, submission: schemas.PlayerSubmissionCreate):
    # Validate that the tip opening instrument matches the submission instrument
    tip_opening = db.query(models.TipOpening).filter(models.TipOpening.id == submission.tip_opening_id).first()
    if not tip_opening:
        raise HTTPException(status_code=400, detail="Invalid tip opening ID")
    
    if tip_opening.instrument != submission.instrument:
        raise HTTPException(
            status_code=400, 
            detail=f"Instrument mismatch: Tip opening is for {tip_opening.instrument} but submission is for {submission.instrument}"
        )

    db_submission = models.PlayerSubmission(**submission.model_dump())
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

def get_submissions_by_mouthpiece(db: Session, mouthpiece_id: str):
    return db.query(models.PlayerSubmission).filter(models.PlayerSubmission.mouthpiece_id == mouthpiece_id).all()

def get_active_mouthpiece_ids(db: Session):
    return db.query(models.PlayerSubmission.mouthpiece_id).distinct().all()
