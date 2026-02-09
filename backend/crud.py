from sqlalchemy.orm import Session
from backend import models, schemas

def get_mouthpieces(db: Session):
    return db.query(models.Mouthpiece).all()

def get_reeds(db: Session):
    return db.query(models.Reed).all()

def create_submission(db: Session, submission: schemas.PlayerSubmissionCreate):
    db_submission = models.PlayerSubmission(**submission.model_dump())
    db.add(db_submission)
    db.commit()
    db.refresh(db_submission)
    return db_submission

def get_submissions_by_mouthpiece(db: Session, mouthpiece_id: str):
    return db.query(models.PlayerSubmission).filter(models.PlayerSubmission.mouthpiece_id == mouthpiece_id).all()

def get_active_mouthpiece_ids(db: Session):
    return db.query(models.PlayerSubmission.mouthpiece_id).distinct().all()
