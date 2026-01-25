export interface RateLimitError {
  message: string;
  limitType: 'items' | 'identification';
  limit: number;
  used: number;
  remaining: number;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: RateLimitError;
}
