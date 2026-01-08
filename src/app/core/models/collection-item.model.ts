export interface FirestoreImageDto {
  objectName?: string;
  contentType?: string;
  sizeBytes?: number;
  md5Hash?: string;
  width?: number;
  height?: number;
  uploadedAt?: string;
  signedUrl?: string;
}

export interface VisionLabelDto {
  description: string;
  score: number;
  topicality: number;
}

export interface VisionColorDto {
  red: number;
  green: number;
  blue: number;
  score: number;
  pixelFraction: number;
}

export interface VisionTextDto {
  fullText: string;
  words: string[];
  language: string;
}

export interface VisionLogoDto {
  description: string;
  score: number;
}

export interface ImageAnalysisMetadataResponse {
  labels?: VisionLabelDto[];
  dominantColors?: VisionColorDto[];
  textAnnotation?: VisionTextDto;
  logoAnnotation?: VisionLogoDto;
  overallConfidence?: number;
  analyzedAt?: string;
}

export interface UserCollectionResponse {
  collectionKey: string;
  collectionName: string;
}

export interface CollectionItemResponse {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  image: FirestoreImageDto;
  visionMetadata?: ImageAnalysisMetadataResponse;
  tags: string[];
  customTags?: Record<string, string>;
  userId: string;
  collectionKey: string;
  collectionName: string;
}

export interface CollectionItemSummary {
  id: string;
  name: string;
  signedUrl: string;
  collectionKey: string;
  collectionName: string;
  objectName: string;
  customTags?: Record<string, string>;
}

export interface SortObject {
  sorted: boolean;
  unsorted: boolean;
  empty: boolean;
}

export interface PageableObject {
  paged: boolean;
  pageNumber: number;
  pageSize: number;
  unpaged: boolean;
  offset: number;
  sort: SortObject;
}

export interface PageCollectionItemSummary {
  totalPages: number;
  totalElements: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  pageable: PageableObject;
  size: number;
  content: CollectionItemSummary[];
  number: number;
  sort: SortObject;
  empty: boolean;
}
