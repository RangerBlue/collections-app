export interface SimilarItem {
  id: string;
  name: string;
  imageUrl: string;
  similarityScore: number;
}

export interface ValidateItemResponse {
  temporaryCapId: string;
  similarCaps: SimilarItem[];
  hasSimilarCaps: boolean;
}
