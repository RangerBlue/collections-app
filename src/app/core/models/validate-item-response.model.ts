export interface SimilarItem {
  id: string;
  name: string;
  imageUrl: string;
  similarityScore: number;
}

export interface ValidateItemResponse {
  similarCaps: SimilarItem[];
  hasSimilarItems: boolean;
}
