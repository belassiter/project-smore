from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base
from backend.models import Mouthpiece, TipOpening, Reed, PlayerSubmission
from backend.enums import (
    MaterialType, BaffleType, ChamberSize, MfgMethod,
    FacingLength, CutType, ReedMaterial, InstrumentType,
    Genre, SkillLevel, PlayerHours
)
import uuid
import pytest

# Use SQLite in-memory for testing model relationships
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

def test_create_submission(db_session):
    # 1. Create Reference Data
    # Mouthpiece
    mp_id = uuid.uuid4()
    mp = Mouthpiece(
        id=mp_id,
        manufacturer="Meyer",
        model="5M",
        material=MaterialType.HR,
        baffle_type=BaffleType.ROLLOVER,
        chamber_size=ChamberSize.MEDIUM,
        manufacturing_method=MfgMethod.CNC
    )
    db_session.add(mp)
    db_session.commit()

    # Tip Opening
    tip_id = uuid.uuid4()
    tip = TipOpening(
        id=tip_id,
        mouthpiece_id=mp_id,
        label="5",
        opening_inch=0.076,
        facing_length=FacingLength.MEDIUM,
        instrument=InstrumentType.ALTO
    )
    db_session.add(tip)
    db_session.commit()

    # Reed
    reed_id = uuid.uuid4()
    reed = Reed(
        id=reed_id,
        manufacturer="Vandoren",
        model="Java Green",
        cut=CutType.UNFILED,
        material=ReedMaterial.CANE,
        strength_label="2.5"
    )
    db_session.add(reed)
    db_session.commit()

    # Submission
    sub_id = uuid.uuid4()
    sub = PlayerSubmission(
        id=sub_id,
        player_id="hashed_user_123",
        instrument=InstrumentType.ALTO,
        genre=Genre.JAZZ,
        sub_genre="Bebop",
        skill_level=SkillLevel.PRO,
        player_hours=PlayerHours.HIGH,
        mouthpiece_id=mp_id,
        tip_opening_id=tip_id,
        reed_id=reed_id,
        suitability_rating=5,
        resistance_feel=0,
        brightness_feel=1,
        min_dynamic=1,
        max_dynamic=8,
        strength_rating=0,
        is_mouthpiece_modified=False,
        comments="Great setup!"
    )
    db_session.add(sub)
    db_session.commit()

    # Verify
    retrieved = db_session.query(PlayerSubmission).filter_by(id=sub_id).first()
    assert retrieved is not None
    assert retrieved.mouthpiece.manufacturer == "Meyer"
    assert retrieved.reed.model == "Java Green"
