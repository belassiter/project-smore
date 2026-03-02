from sqlalchemy.orm import Session
from fastapi import HTTPException
from backend import models, schemas
from typing import Optional

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


from sqlalchemy import func

def get_active_mouthpiece_ids(db: Session):
    return db.query(models.PlayerSubmission.mouthpiece_id).distinct().all()

def get_exploration_data(db: Session, instrument: Optional[str] = None):
    query = db.query(
        models.Mouthpiece.manufacturer.label("mouthpiece_manufacturer"),
        models.Mouthpiece.model.label("mouthpiece_model"),
        models.TipOpening.label.label("tip_label"),
        models.TipOpening.opening_inch.label("tip_opening_inch"),
        models.Mouthpiece.baffle_type.label("baffle_type"),
        models.Mouthpiece.chamber_size.label("chamber_size"),
        models.TipOpening.facing_length.label("facing_length"),
        models.Reed.manufacturer.label("reed_manufacturer"),
        models.Reed.model.label("reed_model"),
        models.Reed.strength_label.label("reed_strength"),
        
        func.avg(models.PlayerSubmission.suitability_rating).label("avg_suitability"),
        func.avg(models.PlayerSubmission.resistance_feel).label("avg_resistance"),
        func.avg(models.PlayerSubmission.brightness_feel).label("avg_brightness"),
        func.avg(models.PlayerSubmission.min_dynamic).label("avg_min_dynamic"),
        func.avg(models.PlayerSubmission.max_dynamic).label("avg_max_dynamic"),
        func.avg(models.PlayerSubmission.strength_rating).label("avg_strength_rating"),
        func.count(models.PlayerSubmission.id).label("submission_count")
    ).join(
        models.Mouthpiece, models.PlayerSubmission.mouthpiece_id == models.Mouthpiece.id
    ).join(
        models.TipOpening, models.PlayerSubmission.tip_opening_id == models.TipOpening.id
    ).join(
        models.Reed, models.PlayerSubmission.reed_id == models.Reed.id
    )

    if instrument:
        query = query.filter(models.PlayerSubmission.instrument == instrument)

    return query.group_by(
        models.Mouthpiece.manufacturer,
        models.Mouthpiece.model,
        models.TipOpening.label,
        models.TipOpening.opening_inch,
        models.Mouthpiece.baffle_type,
        models.Mouthpiece.chamber_size,
        models.TipOpening.facing_length,
        models.Reed.manufacturer,
        models.Reed.model,
        models.Reed.strength_label
    ).all()

def get_aggregated_scatter_data(db: Session):
    """
    Groups PlayerSubmission by (mouthpiece, tip_opening, reed) and averages ratings.
    """
    results = db.query(
        # Group By IDs
        models.PlayerSubmission.mouthpiece_id,
        models.PlayerSubmission.tip_opening_id,
        models.PlayerSubmission.reed_id,
        
        # Mouthpiece Attributes
        models.Mouthpiece.manufacturer.label("mouthpiece_manufacturer"),
        models.Mouthpiece.model.label("mouthpiece_model"),
        models.Mouthpiece.material.label("mouthpiece_material"),
        models.Mouthpiece.baffle_type,
        models.Mouthpiece.chamber_size,

        # Tip Opening Attributes
        models.TipOpening.label.label("tip_label"),
        models.TipOpening.opening_inch.label("tip_opening_inch"),
        models.TipOpening.facing_length,

        # Reed Attributes
        models.Reed.manufacturer.label("reed_manufacturer"),
        models.Reed.model.label("reed_model"),
        models.Reed.strength_label.label("reed_strength"),
        models.Reed.cut.label("reed_cut"),
        models.Reed.material.label("reed_material"),

        # Aggregates
        func.count(models.PlayerSubmission.id).label("submission_count"),
        func.avg(models.PlayerSubmission.suitability_rating).label("avg_suitability"),
        func.avg(models.PlayerSubmission.resistance_feel).label("avg_resistance"),
        func.avg(models.PlayerSubmission.brightness_feel).label("avg_brightness"),
        func.avg(models.PlayerSubmission.min_dynamic).label("avg_min_dynamic"),
        func.avg(models.PlayerSubmission.max_dynamic).label("avg_max_dynamic")
    ).join(
        models.Mouthpiece, models.Mouthpiece.id == models.PlayerSubmission.mouthpiece_id
    ).join(
        models.TipOpening, models.TipOpening.id == models.PlayerSubmission.tip_opening_id
    ).join(
        models.Reed, models.Reed.id == models.PlayerSubmission.reed_id
    ).group_by(
        models.PlayerSubmission.mouthpiece_id,
        models.PlayerSubmission.tip_opening_id,
        models.PlayerSubmission.reed_id,
        models.Mouthpiece.manufacturer,
        models.Mouthpiece.model,
        models.Mouthpiece.material,
        models.Mouthpiece.baffle_type,
        models.Mouthpiece.chamber_size,
        models.TipOpening.label,
        models.TipOpening.opening_inch,
        models.TipOpening.facing_length,
        models.Reed.manufacturer,
        models.Reed.model,
        models.Reed.strength_label,
        models.Reed.cut,
        models.Reed.material,
    ).all()

    return results
