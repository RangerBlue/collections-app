export interface FirestoreHSBColor {
  hue: number;
  saturation: number;
  brightness: number;
}

export interface FirestoreImage {
  storageUrl: string;
  bucketName?: string;
  objectName?: string;
  contentType?: string;
  sizeBytes?: number;
  md5Hash?: string;
  width?: number;
  height?: number;
  uploadedAt?: string;
  hsbColor?: FirestoreHSBColor;
  signedUrl?: string;
}

export interface VisionLabel {
  description: string;
  score: number;
  topicality: number;
}

export interface VisionColor {
  red: number;
  green: number;
  blue: number;
  score: number;
  pixelFraction: number;
}

export interface VisionText {
  fullText: string;
  words: string[];
  language: string;
}

export interface VisionLogo {
  description: string;
  score: number;
}

export interface FirestoreVisionMetadata {
  labels?: VisionLabel[];
  dominantColors?: VisionColor[];
  textAnnotation?: VisionText;
  logoAnnotation?: VisionLogo;
  overallConfidence?: number;
  analyzedAt?: string;
}

export interface FirestoreEmbedding {
  vector: number[];
  dimensions: number;
  modelId: string;
  modelVersion: string;
  generatedAt: string;
}

export interface CollectionItem {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  image: FirestoreImage;
  visionMetadata?: FirestoreVisionMetadata;
  embedding?: FirestoreEmbedding;
  tags: string[];
  customTags?: Record<string, string>;
  userId: string;
  temporary: boolean;
  collectionType: string;
}
