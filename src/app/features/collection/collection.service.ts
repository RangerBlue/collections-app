import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CollectionItem } from '../../core/models/collection-item.model';
import { CreateCollectionItemRequest } from '../../core/models/create-collection-item.model';
import { ValidateItemResponse } from '../../core/models/validate-item-response.model';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/collections`;

  getCollections(): Observable<string[]> {
    return this.http.get<string[]>(this.baseUrl, {
      headers: {
        'Accept': 'application/vnd.hal+json'
      }
    });
  }

  getItems(
    collectionType: string = 'caps',
    limit: number = 10,
    offset: number = 0
  ): Observable<CollectionItem[]> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<CollectionItem[]>(
      `${this.baseUrl}/${collectionType}/items/paginated`,
      {
        params,
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  getItem(collectionType: string, id: string): Observable<CollectionItem> {
    return this.http.get<CollectionItem>(
      `${this.baseUrl}/${collectionType}/items/${id}`,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  addItem(
    collectionType: string,
    file: Blob,
    request: CreateCollectionItemRequest
  ): Observable<CollectionItem> {
    const formData = new FormData();
    formData.append('file', file, 'image.jpg');
    formData.append('request', new Blob([JSON.stringify(request)], {
      type: 'application/json'
    }));

    return this.http.post<CollectionItem>(
      `${this.baseUrl}/${collectionType}/items`,
      formData,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  validateItem(
    collectionType: string,
    file: Blob
  ): Observable<ValidateItemResponse> {
    const formData = new FormData();
    formData.append('file', file, 'image.jpg');

    return this.http.post<ValidateItemResponse>(
      `${this.baseUrl}/${collectionType}/items/validate`,
      formData,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  searchItems(
    collectionType: string,
    query: string
  ): Observable<CollectionItem[]> {
    const params = new HttpParams().set('query', query);

    return this.http.get<CollectionItem[]>(
      `${this.baseUrl}/${collectionType}/items/search`,
      {
        params,
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }
}
