export const InstrumentType = {
    SOPRANINO: "Sopranino",
    SOPRANO: "Soprano",
    ALTO: "Alto",
    TENOR: "Tenor",
    BARITONE: "Baritone",
    BASS: "Bass",
    CONTRABASS: "Contrabass"
} as const;
export type InstrumentType = typeof InstrumentType[keyof typeof InstrumentType];

export const Genre = {
    JAZZ: "Jazz",
    CLASSICAL: "Classical",
    POP: "Pop",
    FUNK: "Funk",
    OTHER: "Other"
} as const;
export type Genre = typeof Genre[keyof typeof Genre];

export const SkillLevel = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ENTHUSIAST: "Enthusiast",
    SEMI_PRO: "Semi-Pro",
    PRO: "Pro"
} as const;
export type SkillLevel = typeof SkillLevel[keyof typeof SkillLevel];

export const PlayerHours = {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    VERY_HIGH: "Very High"
} as const;
export type PlayerHours = typeof PlayerHours[keyof typeof PlayerHours];


export interface TipOpening {
    id: string;
    label: string;
    opening_inch: number;
    facing_length: string;
    instrument?: InstrumentType;
}

export interface Mouthpiece {
    id: string;
    manufacturer: string;
    model: string;
    variant?: string;
    tip_openings: TipOpening[];
}

export interface Reed {
    id: string;
    manufacturer: string;
    model: string;
    material: string;
    strength_label: string;
}

export interface PlayerSubmission {
    player_id: string;
    instrument: InstrumentType;
    genre: Genre;
    sub_genre?: string;
    skill_level: SkillLevel;
    player_hours: PlayerHours;
    
    mouthpiece_id: string;
    tip_opening_id: string;
    reed_id: string;
    
    suitability_rating: number; // 1-5
    resistance_feel: number; // -5 to 5
    brightness_feel: number; // -5 to 5
    min_dynamic: number; // 1-8
    max_dynamic: number; // 1-8
    strength_rating: number; // -5 to 5
    
    is_mouthpiece_modified: boolean;
    is_reed_modified: boolean;
    modification_details?: string;
    comments?: string;
}
