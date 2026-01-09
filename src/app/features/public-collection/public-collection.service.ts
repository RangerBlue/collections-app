import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CollectionItemResponse, PageCollectionItemSummary } from '../../core/models/collection-item.model';

@Injectable({
  providedIn: 'root'
})
export class PublicCollectionService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/public`;

  getItems(
    page: number = 0,
    size: number = 12,
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
      `${this.baseUrl}/items`,
      {
        params,
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }

  getItem(id: string): Observable<CollectionItemResponse> {
    return this.http.get<CollectionItemResponse>(
      `${this.baseUrl}/items/${id}`,
      {
        headers: {
          'Accept': 'application/vnd.hal+json'
        }
      }
    );
  }
}
