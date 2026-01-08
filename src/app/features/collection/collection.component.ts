import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe, PercentPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CollectionService } from './collection.service';
import { CollectionItemResponse, CollectionItemSummary, UserCollectionResponse } from '../../core/models/collection-item.model';
import { UpdateCollectionItem } from '../../core/models/update-collection-item.model';

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
  readonly collections = signal<UserCollectionResponse[]>([]);
  readonly selectedCollectionKey = signal<string>('');
  readonly isLoadingCollections = signal<boolean>(true);

  // Computed signal for selected collection name (for display)
  readonly selectedCollectionName = computed(() => {
    const key = this.selectedCollectionKey();
    const collection = this.collections().find(c => c.collectionKey === key);
    return collection?.collectionName ?? '';
  });

  readonly items = signal<CollectionItemSummary[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(12);
  readonly totalPages = signal<number>(0);
  readonly totalElements = signal<number>(0);

  // Item detail modal
  readonly selectedItem = signal<CollectionItemResponse | null>(null);

  // Edit mode
  readonly isEditMode = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);
  readonly editName = signal<string>('');
  readonly editDescription = signal<string>('');
  readonly editCustomTags = signal<Record<string, string>>({});
  readonly newTagKey = signal<string>('');
  readonly newTagValue = signal<string>('');

  // Image update
  readonly isUpdatingImage = signal<boolean>(false);
  readonly newImagePreview = signal<string | null>(null);
  private newImageFile: Blob | null = null;

  // Search
  readonly searchQuery = signal<string>('');

  readonly hasMore = computed(() => this.currentPage() < this.totalPages() - 1);
  readonly hasPrevious = computed(() => this.currentPage() > 0);

  ngOnInit(): void {
    this.loadCollections();
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

  loadCollections(): void {
    this.isLoadingCollections.set(true);
    this.collectionService.getCollections().subscribe({
      next: (collections) => {
        this.collections.set(collections);
        if (collections.length > 0) {
          this.selectedCollectionKey.set(collections[0].collectionKey);
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

  selectCollection(collectionKey: string): void {
    if (collectionKey !== this.selectedCollectionKey()) {
      this.selectedCollectionKey.set(collectionKey);
      this.currentPage.set(0);
      this.clearSearch();
      this.loadItems();
    }
  }

  loadItems(): void {
    const collectionKey = this.selectedCollectionKey();
    if (!collectionKey) return;

    this.isLoading.set(true);
    this.error.set(null);

    const query = this.searchQuery().trim() || undefined;

    this.collectionService.getItems(collectionKey, this.currentPage(), this.pageSize(), query)
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
    const collectionKey = this.selectedCollectionKey();
    if (!collectionKey) return;

    this.collectionService.getItem(collectionKey, item.id).subscribe({
      next: (fullItem) => {
        this.selectedItem.set(fullItem);
      },
      error: (err) => {
        console.error('Error loading item details:', err);
        this.error.set('Failed to load item details.');
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

  // Edit mode methods
  enterEditMode(): void {
    const item = this.selectedItem();
    if (!item) return;

    this.editName.set(item.name);
    this.editDescription.set(item.description || '');
    this.editCustomTags.set({ ...(item.customTags || {}) });
    this.newTagKey.set('');
    this.newTagValue.set('');
    this.newImagePreview.set(null);
    this.newImageFile = null;
    this.isEditMode.set(true);
  }

  cancelEdit(): void {
    this.isEditMode.set(false);
    this.newImagePreview.set(null);
    this.newImageFile = null;
  }

  saveChanges(): void {
    const item = this.selectedItem();
    const collectionKey = this.selectedCollectionKey();
    if (!item || !collectionKey) return;

    const updateRequest: UpdateCollectionItem = {
      name: this.editName(),
      description: this.editDescription(),
      customTags: this.editCustomTags()
    };

    this.isSaving.set(true);

    this.collectionService.updateItem(collectionKey, item.id, updateRequest).subscribe({
      next: (updatedItem) => {
        this.selectedItem.set(updatedItem);
        this.isEditMode.set(false);
        this.isSaving.set(false);
        this.loadItems();
      },
      error: (err) => {
        console.error('Error updating item:', err);
        this.error.set('Failed to update item. Please try again.');
        this.isSaving.set(false);
      }
    });
  }

  // Custom tags management
  addCustomTag(): void {
    const key = this.newTagKey().trim();
    const value = this.newTagValue().trim();
    if (!key || !value) return;

    this.editCustomTags.update(tags => ({
      ...tags,
      [key]: value
    }));
    this.newTagKey.set('');
    this.newTagValue.set('');
  }

  removeCustomTag(key: string): void {
    this.editCustomTags.update(tags => {
      const newTags = { ...tags };
      delete newTags[key];
      return newTags;
    });
  }

  // Image update methods
  selectNewImage(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.handleNewImageSelected(target.files[0]);
      }
    };
    fileInput.click();
  }

  private handleNewImageSelected(file: File): void {
    this.newImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.newImagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  cancelImageChange(): void {
    this.newImagePreview.set(null);
    this.newImageFile = null;
  }

  updateImage(): void {
    const item = this.selectedItem();
    const collectionKey = this.selectedCollectionKey();
    if (!item || !collectionKey || !this.newImageFile) return;

    this.isUpdatingImage.set(true);

    this.collectionService.updateImage(collectionKey, item.id, this.newImageFile).subscribe({
      next: (updatedItem) => {
        this.selectedItem.set(updatedItem);
        this.newImagePreview.set(null);
        this.newImageFile = null;
        this.isUpdatingImage.set(false);
        this.loadItems();
      },
      error: (err) => {
        console.error('Error updating image:', err);
        this.error.set('Failed to update image. Please try again.');
        this.isUpdatingImage.set(false);
      }
    });
  }

  deleteItem(): void {
    const item = this.selectedItem();
    const collectionKey = this.selectedCollectionKey();
    if (!item || !collectionKey) return;

    if (!confirm('Are you sure you want to delete this item?')) return;

    this.collectionService.deleteItem(collectionKey, item.id).subscribe({
      next: () => {
        this.closeItemDetail();
        this.loadItems();
      },
      error: (err) => {
        console.error('Error deleting item:', err);
        this.error.set('Failed to delete item. Please try again.');
      }
    });
  }
}
