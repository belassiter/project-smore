from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from uuid import UUID
from backend.enums import (
    MaterialType, BaffleType, ChamberSize, MfgMethod,
    FacingLength, CutType, ReedMaterial, InstrumentType,
    Genre, SkillLevel, PlayerHours
)
from datetime import datetime

class TipOpeningBase(BaseModel):
    label: Optional[str] = None
    opening_inch: float
    facing_length: FacingLength
    instrument: InstrumentType

class TipOpeningOut(TipOpeningBase):
    id: UUID
    mouthpiece_id: UUID
    model_config = ConfigDict(from_attributes=True)

class MouthpieceBase(BaseModel):
    manufacturer: str
    model: str
    variant: Optional[str] = None
    material: MaterialType
    baffle_type: BaffleType
    chamber_size: ChamberSize
    manufacturing_method: Optional[MfgMethod] = None

class MouthpieceOut(MouthpieceBase):
    id: UUID
    tip_openings: List[TipOpeningOut] = []
    model_config = ConfigDict(from_attributes=True)

class ReedBase(BaseModel):
    manufacturer: str
    model: str
    cut: CutType
    material: ReedMaterial
    strength_label: str

class ReedOut(ReedBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)

class PlayerSubmissionCreate(BaseModel):
    player_id: str 
    instrument: InstrumentType
    genre: Genre
    sub_genre: Optional[str] = None
    skill_level: SkillLevel
    player_hours: PlayerHours
    
    mouthpiece_id: UUID
    tip_opening_id: UUID
    reed_id: UUID
    
    suitability_rating: int
    resistance_feel: int
    brightness_feel: int
    min_dynamic: int = Field(..., ge=1, le=8)
    max_dynamic: int = Field(..., ge=1, le=8)
    strength_rating: int
    
    # Modifications
    is_mouthpiece_modified: bool = False
    is_reed_modified: bool = False
    modification_details: Optional[str] = None
    
    # New Field Details
    mouthpiece_man_details: Optional[str] = None
    reed_man_details: Optional[str] = None
    mouthpiece_mod_details: Optional[str] = None
    reed_mod_details: Optional[str] = None
    
    comments: Optional[str] = None

class PlayerSubmissionOut(PlayerSubmissionCreate):
    id: UUID
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class ExplorationDataPoint(BaseModel):
    # Setup Info
    mouthpiece_manufacturer: str
    mouthpiece_model: str
    tip_label: Optional[str] = None
    tip_opening_inch: float
    baffle_type: BaffleType
    chamber_size: ChamberSize
    facing_length: FacingLength
    reed_manufacturer: str
    reed_model: str
    reed_strength: str
    
    # Aggregated Stats
    avg_suitability: float
    avg_resistance: float
    avg_brightness: float
    avg_min_dynamic: float
    avg_max_dynamic: float
    avg_strength_rating: float
    
    submission_count: int

    model_config = ConfigDict(from_attributes=True)

class ScatterDataPoint(BaseModel):
    # Setup IDs
    mouthpiece_id: UUID
    tip_opening_id: UUID
    reed_id: UUID

    # Mouthpiece Details
    mouthpiece_manufacturer: str
    mouthpiece_model: str
    mouthpiece_material: MaterialType
    baffle_type: BaffleType
    chamber_size: ChamberSize

    # Tip Details
    tip_label: Optional[str] = None
    tip_opening_inch: float
    facing_length: FacingLength

    # Reed Details 
    reed_manufacturer: str
    reed_model: str
    reed_strength: str
    reed_cut: CutType
    reed_material: ReedMaterial

    # Aggregates
    submission_count: int
    avg_suitability: float
    avg_resistance: Optional[float] = None
    avg_brightness: Optional[float] = None
    avg_min_dynamic: Optional[float] = None
    avg_max_dynamic: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)
