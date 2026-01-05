import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe, PercentPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CollectionService } from './collection.service';
import { CollectionItem } from '../../core/models/collection-item.model';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PercentPipe, KeyValuePipe, FormsModule, RouterLink],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.css'
})
export class CollectionComponent implements OnInit, OnDestroy {
  private collectionService = inject(CollectionService);
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Collection selection
  readonly collections = signal<string[]>([]);
  readonly selectedCollection = signal<string>('');
  readonly isLoadingCollections = signal<boolean>(true);

  readonly items = signal<CollectionItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(12);
  readonly hasMore = signal<boolean>(true);

  // Item detail modal
  readonly selectedItem = signal<CollectionItem | null>(null);

  // Search
  readonly searchQuery = signal<string>('');
  readonly isSearchMode = signal<boolean>(false);

  readonly offset = computed(() => this.currentPage() * this.pageSize());

  ngOnInit(): void {
    this.loadCollections();
    this.setupSearch();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.trim()) {
        this.performSearch(query);
      } else {
        this.isSearchMode.set(false);
        this.currentPage.set(0);
        this.loadItems();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCollections(): void {
    this.isLoadingCollections.set(true);
    this.collectionService.getCollections().subscribe({
      next: (collections) => {
        this.collections.set(collections);
        if (collections.length > 0) {
          this.selectedCollection.set(collections[0]);
          this.loadItems();
        }
        this.isLoadingCollections.set(false);
      },
      error: (err) => {
        console.error('Failed to load collections:', err);
        this.error.set('Failed to load collections. Please try again.');
        this.isLoadingCollections.set(false);
      }
    });
  }

  selectCollection(collection: string): void {
    if (collection !== this.selectedCollection()) {
      this.selectedCollection.set(collection);
      this.currentPage.set(0);
      this.clearSearch();
      this.loadItems();
    }
  }

  loadItems(): void {
    const collection = this.selectedCollection();
    if (!collection) return;

    this.isLoading.set(true);
    this.error.set(null);

    this.collectionService.getItems(collection, this.pageSize(), this.offset())
      .subscribe({
        next: (items) => {
          this.items.set(items);
          this.hasMore.set(items.length === this.pageSize());
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

  openItemDetail(item: CollectionItem): void {
    this.selectedItem.set(item);
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

  private performSearch(query: string): void {
    const collection = this.selectedCollection();

    if (!collection) {
      return;
    }

    this.isLoading.set(true);
    this.isSearchMode.set(true);
    this.error.set(null);

    this.collectionService.searchItems(collection, query).subscribe({
      next: (items) => {
        this.items.set(items);
        this.hasMore.set(false);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to search items. Please try again.');
        this.isLoading.set(false);
        console.error('Error searching items:', err);
      }
    });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.isSearchMode.set(false);
    this.currentPage.set(0);
    this.loadItems();
  }
}
