from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.database import SessionLocal, engine
from backend.models import Mouthpiece, TipOpening, Reed, MaterialType, BaffleType, ChamberSize, MfgMethod, FacingLength, CutType, ReedMaterial, InstrumentType
import uuid

def seed_mouthpieces(db: Session):
    print("Seeding Mouthpieces...")
    
    # --- VANDOREN ---
    vandoren_source = "https://vandoren.fr/en/saxophone-mouthpieces/"
    
    # Vandoren V5 (Ebonite/Hard Rubber)
    v5 = Mouthpiece(
        id=uuid.uuid4(),
        manufacturer="Vandoren",
        model="V5",
        material=MaterialType.HR,
        baffle_type=BaffleType.STRAIGHT, # Generalizing for V5
        chamber_size=ChamberSize.SMALL, # Varies, but generally small/roundish
        manufacturing_method=MfgMethod.CAST,
        data_source=vandoren_source
    )
    # Check if exists (simple check by model name for this script)
    existing_v5 = db.execute(select(Mouthpiece).where(Mouthpiece.model == "V5", Mouthpiece.manufacturer == "Vandoren")).scalar_one_or_none()
    if not existing_v5:
        db.add(v5)
        db.commit() # Commit to get ID for relationships
        
        # Add Tip Openings for V5 (A17, A28) - ALTO
        db.add_all([
            TipOpening(mouthpiece_id=v5.id, label="A17", opening_inch=0.060, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=vandoren_source),
            TipOpening(mouthpiece_id=v5.id, label="A28", opening_inch=0.064, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=vandoren_source),
            TipOpening(mouthpiece_id=v5.id, label="A27", opening_inch=0.065, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=vandoren_source)
        ])
    else:
        # If exists, we might need to update/backfill instrument if null (optional)
        pass 
    
    # Vandoren Java (Ebonite)
    java = Mouthpiece(
        id=uuid.uuid4(),
        manufacturer="Vandoren",
        model="Java",
        material=MaterialType.HR,
        baffle_type=BaffleType.ROLLOVER, # Jazz style
        chamber_size=ChamberSize.MEDIUM, 
        manufacturing_method=MfgMethod.CAST,
        data_source=vandoren_source
    )
    existing_java = db.execute(select(Mouthpiece).where(Mouthpiece.model == "Java", Mouthpiece.manufacturer == "Vandoren")).scalar_one_or_none()
    if not existing_java:
        db.add(java)
        db.commit()
        db.add_all([
            TipOpening(mouthpiece_id=java.id, label="A35", opening_inch=0.081, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=vandoren_source),
            TipOpening(mouthpiece_id=java.id, label="A45", opening_inch=0.087, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=vandoren_source),
            TipOpening(mouthpiece_id=java.id, label="A55", opening_inch=0.097, facing_length=FacingLength.LONG, instrument=InstrumentType.ALTO, data_source=vandoren_source)
        ])

    # --- JODYJAZZ ---
    jj_source = "https://jodyjazz.com/hr-alto/"
    
    # HR* (Hard Rubber)
    hr_star = Mouthpiece(
        id=uuid.uuid4(),
        manufacturer="JodyJazz",
        model="HR*",
        material=MaterialType.HR,
        baffle_type=BaffleType.ROLLOVER,
        chamber_size=ChamberSize.MEDIUM,
        manufacturing_method=MfgMethod.CNC, # JJ uses CNC
        data_source=jj_source
    )
    existing_hr = db.execute(select(Mouthpiece).where(Mouthpiece.model == "HR*", Mouthpiece.manufacturer == "JodyJazz")).scalar_one_or_none()
    if not existing_hr:
        db.add(hr_star)
        db.commit()
        db.add_all([
            TipOpening(mouthpiece_id=hr_star.id, label="5M", opening_inch=0.072, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=jj_source),
            TipOpening(mouthpiece_id=hr_star.id, label="6M", opening_inch=0.078, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=jj_source),
            TipOpening(mouthpiece_id=hr_star.id, label="7M", opening_inch=0.083, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=jj_source),
            TipOpening(mouthpiece_id=hr_star.id, label="8M", opening_inch=0.090, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=jj_source)
        ])

    # --- SELMER PARIS ---
    selmer_source = "https://www.selmer.fr"
    
    # S80
    s80 = Mouthpiece(
        id=uuid.uuid4(),
        manufacturer="Selmer Paris",
        model="S80",
        material=MaterialType.HR,
        baffle_type=BaffleType.STRAIGHT,
        chamber_size=ChamberSize.SMALL, # Famous for square chamber
        manufacturing_method=MfgMethod.CAST,
        data_source=selmer_source
    )
    existing_s80 = db.execute(select(Mouthpiece).where(Mouthpiece.model == "S80", Mouthpiece.manufacturer == "Selmer Paris")).scalar_one_or_none()
    if not existing_s80:
        db.add(s80)
        db.commit()
        # Converting mm to inch approx
        db.add_all([
            TipOpening(mouthpiece_id=s80.id, label="C*", opening_inch=0.061, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=selmer_source), # ~1.55mm
            TipOpening(mouthpiece_id=s80.id, label="C**", opening_inch=0.065, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=selmer_source), # ~1.65mm
            TipOpening(mouthpiece_id=s80.id, label="D", opening_inch=0.069, facing_length=FacingLength.MEDIUM, instrument=InstrumentType.ALTO, data_source=selmer_source)  # ~1.75mm
        ])

    db.commit()

def seed_reeds(db: Session):
    print("Seeding Reeds...")
    
    reeds_data = [
        {
            "mfg": "Vandoren", "model": "Traditional (Blue Box)", "cut": CutType.FILED, "mat": ReedMaterial.CANE,
            "strengths": ["1.5", "2", "2.5", "3", "3.5", "4"],
            "source": "https://vandoren.fr/en/saxophone-reeds/"
        },
        {
            "mfg": "Vandoren", "model": "Java Green", "cut": CutType.UNFILED, "mat": ReedMaterial.CANE,
            "strengths": ["1.5", "2", "2.5", "3", "3.5", "4"],
            "source": "https://vandoren.fr/en/saxophone-reeds/"
        },
         {
            "mfg": "D'Addario", "model": "Select Jazz Unfiled", "cut": CutType.UNFILED, "mat": ReedMaterial.CANE,
            "strengths": ["2S", "2M", "2H", "3S", "3M", "3H"],
            "source": "https://daddario.com/products/woodwinds/alto-saxophone/"
        },
        {
            "mfg": "Legere", "model": "Signature", "cut": CutType.UNFILED, "mat": ReedMaterial.SYNTHETIC,
            "strengths": ["2.00", "2.25", "2.50", "2.75", "3.00", "3.25"],
            "source": "https://legere.com/products/saxophone-reeds/"
        }
    ]

    for r in reeds_data:
        # Check if exists
        existing = db.execute(select(Reed).where(Reed.manufacturer == r["mfg"], Reed.model == r["model"])).scalar_one_or_none()
        if not existing:
            for s in r["strengths"]:
                db.add(Reed(
                    manufacturer=r["mfg"],
                    model=r["model"],
                    cut=r["cut"], 
                    material=r["mat"],
                    strength_label=s,
                    instrument=InstrumentType.ALTO, # Assuming ALTO for now, as typical
                    data_source=r["source"]
                ))
    db.commit()

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_mouthpieces(db)
        seed_reeds(db)
        print("Seeding complete.")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()
