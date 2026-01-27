import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe, PercentPipe, KeyValuePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { CollectionService } from './collection.service';
import { CollectionItemResponse, CollectionItemSummary, UserCollectionResponse } from '../../core/models/collection-item.model';
import { UpdateCollectionItem } from '../../core/models/update-collection-item.model';
import { CollectionShareEntry, SharedCollectionResponse } from '../../core/models/collection-share.model';

type CollectionViewMode = 'owned' | 'shared';

type CropShape = 'rectangle' | 'circle';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PercentPipe, KeyValuePipe, FormsModule, RouterLink, ImageCropperComponent],
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
  readonly pageSize = signal<number>(30);
  readonly totalPages = signal<number>(0);
  readonly totalElements = signal<number>(0);
  readonly collectionTotalItems = signal<number>(0);

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

  // Image cropping
  readonly isCropping = signal<boolean>(false);
  readonly cropImageSource = signal<string>('');
  readonly cropImageFile = signal<File | undefined>(undefined);
  readonly cropShape = signal<CropShape>('rectangle');
  readonly croppedImageBlob = signal<Blob | null>(null);

  // Search
  readonly searchQuery = signal<string>('');

  // Sorting
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  // Collection view mode (owned vs shared)
  readonly collectionViewMode = signal<CollectionViewMode>('owned');

  // Share modal
  readonly isShareModalOpen = signal<boolean>(false);
  readonly shareEmail = signal<string>('');
  readonly isSharing = signal<boolean>(false);
  readonly shareError = signal<string | null>(null);
  readonly shareSuccess = signal<string | null>(null);

  // Collection shares list
  readonly collectionShares = signal<CollectionShareEntry[]>([]);
  readonly isLoadingShares = signal<boolean>(false);
  readonly isRevokingShare = signal<string | null>(null);

  // Shared with me collections
  readonly sharedWithMeCollections = signal<SharedCollectionResponse[]>([]);
  readonly isLoadingSharedWithMe = signal<boolean>(false);
  readonly selectedSharedCollection = signal<SharedCollectionResponse | null>(null);

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
    const sort = [`createdAt,${this.sortDirection()}`];

    this.collectionService.getItems(collectionKey, this.currentPage(), this.pageSize(), query, sort)
      .subscribe({
        next: (response) => {
          this.items.set(response.content);
          this.totalPages.set(response.totalPages);
          this.totalElements.set(response.totalElements);
          // Store unfiltered total when not searching
          if (!query) {
            this.collectionTotalItems.set(response.totalElements);
          }
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

  // Sorting methods
  toggleSortDirection(): void {
    this.sortDirection.update(dir => dir === 'asc' ? 'desc' : 'asc');
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
    this.cropImageFile.set(file);
    this.isCropping.set(true);
    this.croppedImageBlob.set(null);
  }

  // Cropper methods
  onImageCropped(event: ImageCroppedEvent): void {
    if (event.blob) {
      if (this.cropShape() === 'circle') {
        this.applyCircularMask(event.blob);
      } else {
        this.croppedImageBlob.set(event.blob);
      }
    }
  }

  private applyCircularMask(blob: Blob): void {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create circular clipping path
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw image centered
      const offsetX = (img.width - size) / 2;
      const offsetY = (img.height - size) / 2;
      ctx.drawImage(img, -offsetX, -offsetY);

      canvas.toBlob((maskedBlob) => {
        if (maskedBlob) {
          this.croppedImageBlob.set(maskedBlob);
        }
      }, 'image/png');
    };
    img.src = URL.createObjectURL(blob);
  }

  onCropperReady(): void {
    // Cropper is ready
  }

  onImageLoaded(image: LoadedImage): void {
    // Image loaded successfully
  }

  onLoadImageFailed(): void {
    this.error.set('Failed to load image. Please try again.');
    this.cancelImageChange();
  }

  confirmImageCrop(): void {
    const croppedBlob = this.croppedImageBlob();
    if (croppedBlob) {
      this.newImageFile = croppedBlob;
      const reader = new FileReader();
      reader.onload = () => {
        this.newImagePreview.set(reader.result as string);
      };
      reader.readAsDataURL(croppedBlob);
      this.isCropping.set(false);
    }
  }

  cancelImageChange(): void {
    this.newImagePreview.set(null);
    this.newImageFile = null;
    this.isCropping.set(false);
    this.cropImageSource.set('');
    this.cropImageFile.set(undefined);
    this.croppedImageBlob.set(null);
    this.cropShape.set('rectangle');
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

  // View mode methods
  switchToOwned(): void {
    if (this.collectionViewMode() === 'owned') return;
    this.collectionViewMode.set('owned');
    this.selectedSharedCollection.set(null);
    if (this.collections().length > 0) {
      this.selectedCollectionKey.set(this.collections()[0].collectionKey);
      this.currentPage.set(0);
      this.clearSearch();
      this.loadItems();
    }
  }

  switchToShared(): void {
    if (this.collectionViewMode() === 'shared') return;
    this.collectionViewMode.set('shared');
    this.selectedCollectionKey.set('');
    this.items.set([]);
    this.loadSharedWithMe();
  }

  loadSharedWithMe(): void {
    this.isLoadingSharedWithMe.set(true);
    this.collectionService.getSharedWithMe().subscribe({
      next: (collections) => {
        this.sharedWithMeCollections.set(collections);
        this.isLoadingSharedWithMe.set(false);
        if (collections.length > 0 && !this.selectedSharedCollection()) {
          this.selectSharedCollection(collections[0]);
        }
      },
      error: (err) => {
        console.error('Failed to load shared collections:', err);
        this.error.set('Failed to load shared collections. Please try again.');
        this.isLoadingSharedWithMe.set(false);
      }
    });
  }

  selectSharedCollection(collection: SharedCollectionResponse): void {
    this.selectedSharedCollection.set(collection);
    this.selectedCollectionKey.set(collection.collectionKey);
    this.currentPage.set(0);
    this.clearSearch();
    this.loadItems();
  }

  // Share modal methods
  openShareModal(): void {
    this.shareEmail.set('');
    this.shareError.set(null);
    this.shareSuccess.set(null);
    this.isShareModalOpen.set(true);
    this.loadCollectionShares();
  }

  closeShareModal(): void {
    this.isShareModalOpen.set(false);
  }

  loadCollectionShares(): void {
    const collectionKey = this.selectedCollectionKey();
    if (!collectionKey) return;

    this.isLoadingShares.set(true);
    this.collectionService.getCollectionShares(collectionKey).subscribe({
      next: (shares) => {
        this.collectionShares.set(shares);
        this.isLoadingShares.set(false);
      },
      error: (err) => {
        console.error('Failed to load collection shares:', err);
        this.isLoadingShares.set(false);
      }
    });
  }

  shareCollection(): void {
    const collectionKey = this.selectedCollectionKey();
    const email = this.shareEmail().trim();
    if (!collectionKey || !email) return;

    this.isSharing.set(true);
    this.shareError.set(null);
    this.shareSuccess.set(null);

    this.collectionService.shareCollection(collectionKey, email).subscribe({
      next: (response) => {
        this.shareSuccess.set(response.message || `Collection shared with ${email}`);
        this.shareEmail.set('');
        this.isSharing.set(false);
        this.loadCollectionShares();
      },
      error: (err) => {
        console.error('Failed to share collection:', err);
        this.shareError.set(err.error?.message || 'Failed to share collection. Please try again.');
        this.isSharing.set(false);
      }
    });
  }

  revokeShare(userId: string): void {
    const collectionKey = this.selectedCollectionKey();
    if (!collectionKey) return;

    if (!confirm('Are you sure you want to revoke access for this user?')) return;

    this.isRevokingShare.set(userId);
    this.collectionService.revokeCollectionShare(collectionKey, userId).subscribe({
      next: () => {
        this.isRevokingShare.set(null);
        this.loadCollectionShares();
      },
      error: (err) => {
        console.error('Failed to revoke share:', err);
        this.shareError.set('Failed to revoke access. Please try again.');
        this.isRevokingShare.set(null);
      }
    });
  }
}
