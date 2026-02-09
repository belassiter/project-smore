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
