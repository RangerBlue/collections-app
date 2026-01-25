export interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
}

export interface ItemIdentificationResponse {
  primaryName: string;
  brand: string;
  category: string;
  description: string;
  suggestedTags: string[];
  confidence: number;
  rateLimit?: RateLimitInfo;
}
