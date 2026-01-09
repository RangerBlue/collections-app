import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe, PercentPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { PublicCollectionService } from './public-collection.service';
import { CollectionItemResponse, CollectionItemSummary } from '../../core/models/collection-item.model';

@Component({
  selector: 'app-public-collection',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PercentPipe, KeyValuePipe, FormsModule],
  templateUrl: './public-collection.component.html',
  styleUrl: './public-collection.component.css'
})
export class PublicCollectionComponent implements OnInit, OnDestroy {
  private publicCollectionService = inject(PublicCollectionService);
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  readonly items = signal<CollectionItemSummary[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<string | null>(null);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(12);
  readonly totalPages = signal<number>(0);
  readonly totalElements = signal<number>(0);

  // Item detail modal
  readonly selectedItem = signal<CollectionItemResponse | null>(null);
  readonly isLoadingItem = signal<boolean>(false);

  // Search
  readonly searchQuery = signal<string>('');

  readonly hasMore = computed(() => this.currentPage() < this.totalPages() - 1);
  readonly hasPrevious = computed(() => this.currentPage() > 0);

  ngOnInit(): void {
    this.loadItems();
    this.setupSearch();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage.set(0);
      this.loadItems();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadItems(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const query = this.searchQuery().trim() || undefined;

    this.publicCollectionService.getItems(this.currentPage(), this.pageSize(), query)
      .subscribe({
        next: (response) => {
          this.items.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set('Failed to load collection items. Please try again.');
          this.isLoading.set(false);
          console.error('Error loading items:', err);
        }
      });
  }

  nextPage(): void {
    if (this.hasMore()) {
      this.currentPage.update(p => p + 1);
      this.loadItems();
    }
  }

  previousPage(): void {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
      this.loadItems();
    }
  }

  retry(): void {
    this.loadItems();
  }

  openItemDetail(item: CollectionItemSummary): void {
    this.isLoadingItem.set(true);
    this.publicCollectionService.getItem(item.id).subscribe({
      next: (fullItem) => {
        this.selectedItem.set(fullItem);
        this.isLoadingItem.set(false);
      },
      error: (err) => {
        console.error('Error loading item details:', err);
        this.error.set('Failed to load item details.');
        this.isLoadingItem.set(false);
      }
    });
  }

  closeItemDetail(): void {
    this.selectedItem.set(null);
  }

  getCustomTagKeys(customTags: Record<string, string> | undefined): string[] {
    return customTags ? Object.keys(customTags) : [];
  }

  // Search methods
  onSearchInput(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(0);
    this.loadItems();
  }
}
