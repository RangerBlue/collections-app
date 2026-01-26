export interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
}

export interface ItemIdentificationResponse {
  primaryName: string;
  company: string;
  country: string;
  category: string;
  description: string;
  suggestedTags: string[];
  confidence: number;
  rateLimit?: RateLimitInfo;
}
