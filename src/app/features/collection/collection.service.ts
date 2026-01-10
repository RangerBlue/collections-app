import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CollectionItemResponse, PageCollectionItemSummary, UserCollectionResponse } from '../../core/models/collection-item.model';
import { CreateCollectionItemRequest } from '../../core/models/create-collection-item.model';
import { UpdateCollectionItem } from '../../core/models/update-collection-item.model';
import { ValidateItemResponse } from '../../core/models/validate-item-response.model';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/collections`;

  getCollections(): Observable<UserCollectionResponse[]> {
    return this.http.get<UserCollectionResponse[]>(this.baseUrl, {
      headers: {
        'Accept': 'application/vnd.hal+json'
      }
    });
  }

  getItems(
    collectionKey: string,
    page: number = 0,
    size: number = 10,
    query?: string,
    sort?: string[]
  ): Observable<PageCollectionItemSummary> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (query) {
      params = params.set('query', query);
    }

    if (sort && sort.length > 0) {
      sort.forEach(s => {
        params = params.append('sort', s);
      });
    }

    return this.http.get<PageCollectionItemSummary>(
      `${this.baseUrl}/${collectionKey}/items`,
      {
        params,
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  getItem(collectionKey: string, id: string): Observable<CollectionItemResponse> {
    return this.http.get<CollectionItemResponse>(
      `${this.baseUrl}/${collectionKey}/items/${id}`,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  addItem(
    collectionKey: string,
    file: Blob,
    request: CreateCollectionItemRequest
  ): Observable<CollectionItemResponse> {
    const formData = new FormData();
    formData.append('file', file, 'image.jpg');
    formData.append('request', new Blob([JSON.stringify(request)], {
      type: 'application/json'
    }));

    return this.http.post<CollectionItemResponse>(
      `${this.baseUrl}/${collectionKey}/items`,
      formData,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  validateItem(
    collectionKey: string,
    file: Blob
  ): Observable<ValidateItemResponse> {
    const formData = new FormData();
    formData.append('file', file, 'image.jpg');

    return this.http.post<ValidateItemResponse>(
      `${this.baseUrl}/${collectionKey}/items/validate`,
      formData,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  updateItem(
    collectionKey: string,
    id: string,
    request: UpdateCollectionItem
  ): Observable<CollectionItemResponse> {
    return this.http.put<CollectionItemResponse>(
      `${this.baseUrl}/${collectionKey}/items/${id}`,
      request,
      {
        headers: {
          'Accept': 'application/vnd.hal+json',
          'Content-Type': 'application/json'
        }
      }
    );
  }

  updateImage(
    collectionKey: string,
    id: string,
    file: Blob
  ): Observable<CollectionItemResponse> {
    const formData = new FormData();
    formData.append('file', file, 'image.jpg');

    return this.http.put<CollectionItemResponse>(
      `${this.baseUrl}/${collectionKey}/items/${id}/image`,
      formData,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  deleteItem(
    collectionKey: string,
    id: string
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${collectionKey}/items/${id}`,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  getAvailableTags(collectionKey: string): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.baseUrl}/${collectionKey}/available-tags`,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

}
