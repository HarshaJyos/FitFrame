export type BodyType = 'slim' | 'average' | 'muscular';

export interface Measurements {
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hip: number;
  bodyType?: BodyType;
}

export interface SizeRecommendation {
  shirtSize: string;
  pantsSize: string;
  shirtConfidence: number;
  pantsConfidence: number;
}

export interface ClothingColors {
  shirtColor: string;
  pantsColor: string;
}

export interface UserData {
  measurements: Measurements;
  selectedModel: string;
  facePhoto: string | null;
  shirtColor: string;
  pantsColor: string;
  timestamp: number;
}

export interface ModelInfo {
  file: string;
  muscle: number;
  weight: number;
  bodyType: string;
  bmiRange: string;
}
