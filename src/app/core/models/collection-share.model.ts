export interface ShareCollectionRequest {
  email: string;
}

export interface ShareCollectionResponse {
  shared: boolean;
  message: string;
}

export interface CollectionShareEntry {
  userId: string;
  email: string;
  sharedAt: string;
}

export interface SharedCollectionResponse {
  collectionKey: string;
  collectionName: string;
  ownerUserId: string;
  ownerName: string;
  sharedAt: string;
}
