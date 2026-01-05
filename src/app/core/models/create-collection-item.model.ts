export interface CreateCollectionItemRequest {
  name: string;
  description?: string;
  tags?: string[];
  customTags?: Record<string, string>;
  userId: string;
}
