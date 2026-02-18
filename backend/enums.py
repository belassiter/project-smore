import enum

class MaterialType(str, enum.Enum):
    HR = "HR"
    METAL = "Metal"
    PLASTIC = "Plastic"
    WOOD = "Wood"

class BaffleType(str, enum.Enum):
    STRAIGHT = "Straight"
    ROLLOVER = "Rollover"
    STEP = "Step"
    CONCAVE = "Concave"
    HIGH = "High"
    LOW = "Low"

class ChamberSize(str, enum.Enum):
    SMALL = "Small"
    MEDIUM = "Medium"
    MEDIUM_LARGE = "Medium-Large"
    LARGE = "Large"

class MfgMethod(str, enum.Enum):
    CNC = "CNC"
    HAND_FINISHED = "Hand-finished"
    CAST = "Cast"

class FacingLength(str, enum.Enum):
    SHORT = "Short"
    MEDIUM = "Medium"
    LONG = "Long"

class CutType(str, enum.Enum):
    FILED = "Filed"
    UNFILED = "Unfiled"

class ReedMaterial(str, enum.Enum):
    CANE = "Cane"
    SYNTHETIC = "Synthetic"
    COATED = "Coated"

class InstrumentType(str, enum.Enum):
    SOPRANINO = "Sopranino"
    SOPRANO = "Soprano"
    ALTO = "Alto"
    TENOR = "Tenor"
    BARITONE = "Baritone"
    BASS = "Bass"
    CONTRABASS = "Contrabass"

class Genre(str, enum.Enum):
    JAZZ = "Jazz"
    CLASSICAL = "Classical"
    POP = "Pop"
    FUNK = "Funk"
    OTHER = "Other"

class SkillLevel(str, enum.Enum):
    BEGINNER = "Beginner"
    INTERMEDIATE = "Intermediate"
    ENTHUSIAST = "Enthusiast"
    SEMI_PRO = "Semi-Pro"
    PRO = "Pro"

class PlayerHours(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    VERY_HIGH = "Very High"
