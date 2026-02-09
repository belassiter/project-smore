from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest
import uuid

# Setup Test Engine first
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Patching: crucial to do this BEFORE importing app if possible, or patch where it's used.
from backend import database
database.engine = test_engine

# Import main, and patch the engine reference there too because it does `from database import engine`
from backend import main
main.engine = test_engine

from backend.main import app, get_db
from backend.database import Base
from backend import models
from backend.enums import (
    MaterialType, BaffleType, ChamberSize, MfgMethod, 
    FacingLength, CutType, ReedMaterial, InstrumentType, 
    Genre, SkillLevel, PlayerHours
)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def run_around_tests():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)

def test_read_mouthpieces_empty():
    response = client.get("/api/v1/options/mouthpieces")
    assert response.status_code == 200
    assert response.json() == []

def test_create_submission_flow():
    # 1. Setup Reference Data
    db = TestingSessionLocal()
    mp_id = uuid.uuid4()
    mp = models.Mouthpiece(
        id=mp_id,
        manufacturer="Meyer", 
        model="5M", 
        material=MaterialType.HR, 
        baffle_type=BaffleType.ROLLOVER, 
        chamber_size=ChamberSize.MEDIUM, 
        manufacturing_method=MfgMethod.CNC
    )
    db.add(mp)
    
    tip_id = uuid.uuid4()
    tip = models.TipOpening(
        id=tip_id,
        mouthpiece_id=mp_id,
        label="5",
        opening_inch=0.076,
        facing_length=FacingLength.MEDIUM,
        instrument=InstrumentType.ALTO
    )
    db.add(tip)

    reed_id = uuid.uuid4()
    reed = models.Reed(
        id=reed_id,
        manufacturer="Vandoren",
        model="Java Green",
        cut=CutType.UNFILED,
        material=ReedMaterial.CANE,
        strength_label="2.5"
    )
    db.add(reed)
    db.commit()
    db.close()

    # 2. Submit Survey
    payload = {
        "player_id": "test_user_001",
        "instrument": "Alto",
        "genre": "Jazz",
        "sub_genre": "Bebop",
        "skill_level": "Pro",
        "player_hours": "High",
        "mouthpiece_id": str(mp_id),
        "tip_opening_id": str(tip_id),
        "reed_id": str(reed_id),
        "suitability_rating": 5,
        "resistance_feel": 0,
        "brightness_feel": 1,
        "min_dynamic": 1,
        "max_dynamic": 8,
        "strength_rating": 0,
        "modifications": False,
        "comments": "Testing via API"
    }

    response = client.post("/api/v1/survey/submit", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["player_id"] == "test_user_001"
    assert data["mouthpiece_id"] == str(mp_id)
