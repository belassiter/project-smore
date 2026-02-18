from sqlalchemy import Column, String, Boolean, Integer, ForeignKey, Enum, DateTime, Text, Numeric, Uuid
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone

from backend.database import Base
from backend.enums import (
    MaterialType, BaffleType, ChamberSize, MfgMethod,
    FacingLength, CutType, ReedMaterial, InstrumentType,
    Genre, SkillLevel, PlayerHours
)

class Mouthpiece(Base):
    __tablename__ = "ref_mouthpieces"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    variant = Column(String, nullable=True)
    material = Column(Enum(MaterialType), nullable=False)
    baffle_type = Column(Enum(BaffleType), nullable=False)
    chamber_size = Column(Enum(ChamberSize), nullable=False)
    manufacturing_method = Column(Enum(MfgMethod), nullable=True)
    data_source = Column(String, nullable=True)

    tip_openings = relationship("TipOpening", back_populates="mouthpiece")

class TipOpening(Base):
    __tablename__ = "ref_tip_openings"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mouthpiece_id = Column(Uuid(as_uuid=True), ForeignKey("ref_mouthpieces.id"), nullable=False)
    label = Column(String, nullable=True)
    opening_inch = Column(Numeric(precision=5, scale=4), nullable=False)
    facing_length = Column(Enum(FacingLength), nullable=False)
    instrument = Column(Enum(InstrumentType), nullable=False) # Added
    data_source = Column(String, nullable=True)

    mouthpiece = relationship("Mouthpiece", back_populates="tip_openings")

class Reed(Base):
    __tablename__ = "ref_reeds"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    manufacturer = Column(String, nullable=False)
    model = Column(String, nullable=False)
    cut = Column(Enum(CutType), nullable=False)
    material = Column(Enum(ReedMaterial), nullable=False)
    strength_label = Column(String, nullable=False)
    data_source = Column(String, nullable=True)

class PlayerSubmission(Base):
    __tablename__ = "player_submissions"
    
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    player_id = Column(String, nullable=False)
    
    # Context
    instrument = Column(Enum(InstrumentType), nullable=False)
    genre = Column(Enum(Genre), nullable=False)
    sub_genre = Column(String, nullable=True) 
    skill_level = Column(Enum(SkillLevel), nullable=False)
    player_hours = Column(Enum(PlayerHours), nullable=False)
    
    # Gear
    mouthpiece_id = Column(Uuid(as_uuid=True), ForeignKey("ref_mouthpieces.id"), nullable=False)
    tip_opening_id = Column(Uuid(as_uuid=True), ForeignKey("ref_tip_openings.id"), nullable=False)
    reed_id = Column(Uuid(as_uuid=True), ForeignKey("ref_reeds.id"), nullable=False)
    
    # Ratings
    suitability_rating = Column(Integer, nullable=False)
    resistance_feel = Column(Integer, nullable=True) # -5 to +5, Optional
    brightness_feel = Column(Integer, nullable=True) # -5 to +5, Optional
    min_dynamic = Column(Integer, nullable=True) # 1-8, Optional
    max_dynamic = Column(Integer, nullable=True) # 1-8, Optional
    strength_rating = Column(Integer, nullable=False) # -5 to +5
    
    # Modifications
    is_mouthpiece_modified = Column(Boolean, default=False)
    is_reed_modified = Column(Boolean, default=False)
    modification_details = Column(Text, nullable=True)

    # Specific Details
    mouthpiece_man_details = Column(Text, nullable=True)
    reed_man_details = Column(Text, nullable=True)
    mouthpiece_mod_details = Column(Text, nullable=True)
    reed_mod_details = Column(Text, nullable=True)
    
    comments = Column(Text, nullable=True)

    mouthpiece = relationship("Mouthpiece")
    tip_opening = relationship("TipOpening")
    reed = relationship("Reed")
