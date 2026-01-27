import { Component, signal, inject, ViewChild, ElementRef, OnDestroy, OnInit, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { CollectionService } from '../collection.service';
import { AuthService } from '../../../core/auth/auth.service';
import { BlobToUrlPipe } from '../../../shared/pipes/blob-to-url.pipe';
import { UserCollectionResponse } from '../../../core/models/collection-item.model';
import { ItemIdentificationResponse, RateLimitInfo } from '../../../core/models/web-detection-response.model';
import { ErrorResponse } from '../../../core/models/error-response.model';

type CropShape = 'rectangle' | 'circle';
type ComponentStep = 'collection-selection' | 'source-selection' | 'capture' | 'crop' | 'form';

@Component({
  selector: 'app-add-item',
  standalone: true,
  imports: [FormsModule, ImageCropperComponent, BlobToUrlPipe],
  templateUrl: './add-item.component.html',
  styleUrl: './add-item.component.css'
})
export class AddItemComponent implements OnInit, OnDestroy {
  private collectionService = inject(CollectionService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // State signals
  readonly currentStep = signal<ComponentStep>('collection-selection');
  readonly imageSource = signal<string>('');
  readonly imageFile = signal<File | undefined>(undefined);
  readonly croppedImage = signal<Blob | null>(null);
  readonly cropShape = signal<CropShape>('rectangle');
  readonly itemName = signal<string>('');
  readonly itemDescription = signal<string>('');
  readonly isSubmitting = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isCameraActive = signal<boolean>(false);

  // Mobile detection - hide camera option on mobile as file upload provides camera access
  readonly isMobile = signal<boolean>(this.detectMobile());

  // Drag and drop state
  readonly isDragging = signal<boolean>(false);

  // Detection state
  readonly isDetecting = signal<boolean>(false);
  readonly detectionResult = signal<ItemIdentificationResponse | null>(null);
  readonly rateLimitInfo = signal<RateLimitInfo | null>(null);
  readonly isRateLimited = signal<boolean>(false);

  // Item limit state
  readonly itemLimitExceeded = signal<boolean>(false);
  readonly itemLimitInfo = signal<{ limit: number; used: number } | null>(null);

  private detectMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  }

  // Custom tags
  readonly customTags = signal<Array<{ key: string; value: string }>>([]);
  readonly newTagKey = signal<string>('');
  readonly newTagValue = signal<string>('');
  readonly availableTagKeys = signal<string[]>([]);

  // Collection selection
  readonly collections = signal<UserCollectionResponse[]>([]);
  readonly selectedCollectionKey = signal<string>('');
  readonly newCollectionName = signal<string>('');
  readonly isLoadingCollections = signal<boolean>(true);
  readonly isCreatingNew = signal<boolean>(false);

  // Computed signal for selected collection name (for display)
  readonly selectedCollectionName = computed(() => {
    const key = this.selectedCollectionKey();
    const collection = this.collections().find(c => c.collectionKey === key);
    return collection?.collectionName ?? '';
  });

  // Computed signal for unused tag keys (filter out already used keys)
  readonly unusedTagKeys = computed(() => {
    const usedKeys = new Set(this.customTags().map(tag => tag.key));
    return this.availableTagKeys().filter(key => !usedKeys.has(key));
  });

  private mediaStream: MediaStream | null = null;

  ngOnInit(): void {
    const collectionParam = this.route.snapshot.queryParamMap.get('collection');
    if (collectionParam) {
      this.selectedCollectionKey.set(collectionParam);
      this.currentStep.set('source-selection');
      this.loadAvailableTags(collectionParam);
    }
    this.loadCollections();
  }

  private loadCollections(): void {
    this.isLoadingCollections.set(true);
    this.collectionService.getCollections().subscribe({
      next: (collections) => {
        this.collections.set(collections);
        if (collections.length > 0 && !this.selectedCollectionKey()) {
          this.selectedCollectionKey.set(collections[0].collectionKey);
        }
        this.isLoadingCollections.set(false);
      },
      error: (err) => {
        console.error('Failed to load collections:', err);
        this.error.set('Failed to load collections. You can create a new one.');
        this.isLoadingCollections.set(false);
        this.isCreatingNew.set(true);
      }
    });
  }

  selectCollection(collectionKey: string): void {
    this.selectedCollectionKey.set(collectionKey);
    this.isCreatingNew.set(false);
  }

  toggleCreateNew(): void {
    this.isCreatingNew.set(!this.isCreatingNew());
    if (this.isCreatingNew()) {
      this.selectedCollectionKey.set('');
    } else if (this.collections().length > 0) {
      this.selectedCollectionKey.set(this.collections()[0].collectionKey);
    }
  }

  confirmCollection(): void {
    if (this.isCreatingNew()) {
      const collectionName = this.newCollectionName().trim();
      if (!collectionName) {
        this.error.set('Please enter a collection name.');
        return;
      }
      // Generate UUID for new collection key
      const collectionKey = crypto.randomUUID();
      this.selectedCollectionKey.set(collectionKey);
      // New collection has no available tags yet
      this.availableTagKeys.set([]);
    } else {
      if (!this.selectedCollectionKey()) {
        this.error.set('Please select a collection.');
        return;
      }
      // Load available tags for existing collection
      this.loadAvailableTags(this.selectedCollectionKey());
    }

    this.error.set(null);
    this.currentStep.set('source-selection');
  }

  private loadAvailableTags(collectionKey: string): void {
    this.collectionService.getAvailableTags(collectionKey).subscribe({
      next: (tags) => {
        this.availableTagKeys.set(tags);
        // Pre-populate customTags with available keys and empty values
        const preFilled = tags.map(key => ({ key, value: '' }));
        this.customTags.set(preFilled);
      },
      error: (err) => {
        console.error('Failed to load available tags:', err);
        // Not critical, just won't have suggestions
        this.availableTagKeys.set([]);
      }
    });
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  // Image source methods
  selectCamera(): void {
    this.error.set(null);
    this.currentStep.set('capture');
    this.startCamera();
  }

  selectUpload(): void {
    this.error.set(null);
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        this.handleFileSelected(target.files[0]);
      }
    };
    fileInput.click();
  }

  private handleFileSelected(file: File): void {
    this.imageFile.set(file);
    this.currentStep.set('crop');
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        this.error.set(null);
        this.handleFileSelected(file);
      } else {
        this.error.set('Please drop an image file.');
      }
    }
  }

  // Camera methods
  async startCamera(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.mediaStream;
        this.isCameraActive.set(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      this.error.set('Unable to access camera. Please check permissions or use file upload.');
      this.currentStep.set('source-selection');
    }
  }

  capturePhoto(): void {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        this.imageFile.set(file);
        this.stopCamera();
        this.currentStep.set('crop');
      }
    }, 'image/jpeg', 0.9);
  }

  stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive.set(false);
  }

  // Cropper methods
  onImageCropped(event: ImageCroppedEvent): void {
    if (event.blob) {
      if (this.cropShape() === 'circle') {
        this.applyCircularMask(event.blob);
      } else {
        this.croppedImage.set(event.blob);
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
          this.croppedImage.set(maskedBlob);
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
    this.currentStep.set('source-selection');
  }

  confirmCrop(): void {
    if (this.croppedImage()) {
      this.currentStep.set('form');
    }
  }

  cutImage(): void {
    const croppedBlob = this.croppedImage();
    if (croppedBlob) {
      // Convert cropped blob to File and set as new source for further cropping
      const file = new File([croppedBlob], 'cropped-image.png', { type: croppedBlob.type });
      this.imageFile.set(file);
      this.croppedImage.set(null);
    }
  }

  // Detection method
  detectItem(): void {
    const croppedBlob = this.croppedImage();
    if (!croppedBlob) {
      return;
    }

    this.isDetecting.set(true);
    this.detectionResult.set(null);
    this.error.set(null);
    this.isRateLimited.set(false);

    this.collectionService.identifyItem(croppedBlob).subscribe({
      next: (response) => {
        this.detectionResult.set(response);
        if (response.rateLimit) {
          this.rateLimitInfo.set(response.rateLimit);
        }
        this.isDetecting.set(false);
      },
      error: (err) => {
        console.error('Detection error:', err);
        if (err.status === 429) {
          this.isRateLimited.set(true);
          const errorResponse = err.error as ErrorResponse;
          if (errorResponse?.error) {
            this.rateLimitInfo.set({
              limit: errorResponse.error.limit,
              used: errorResponse.error.used,
              remaining: errorResponse.error.remaining
            });
            this.error.set(errorResponse.error.message);
          } else {
            this.error.set('Daily identification limit exceeded. Please try again tomorrow.');
          }
        } else {
          this.error.set('Failed to detect item. Please try again.');
        }
        this.isDetecting.set(false);
      }
    });
  }

  dismissDetectionResult(): void {
    this.detectionResult.set(null);
  }

  // Custom tags methods
  addCustomTag(): void {
    const key = this.newTagKey().trim();
    const value = this.newTagValue().trim();

    if (!key || !value) {
      return;
    }

    // Check for duplicate key
    const existingTags = this.customTags();
    if (existingTags.some(tag => tag.key === key)) {
      this.error.set(`Tag "${key}" already exists.`);
      return;
    }

    this.customTags.set([...existingTags, { key, value }]);
    this.newTagKey.set('');
    this.newTagValue.set('');
    this.error.set(null);
  }

  removeCustomTag(key: string): void {
    this.customTags.set(this.customTags().filter(tag => tag.key !== key));
  }

  updateTagValue(key: string, value: string): void {
    this.customTags.set(
      this.customTags().map(tag =>
        tag.key === key ? { ...tag, value } : tag
      )
    );
  }

  retakePicture(): void {
    this.imageSource.set('');
    this.imageFile.set(undefined);
    this.croppedImage.set(null);
    this.detectionResult.set(null);
    this.currentStep.set('source-selection');
  }

  goBackToCollectionSelection(): void {
    this.imageSource.set('');
    this.imageFile.set(undefined);
    this.croppedImage.set(null);
    this.itemName.set('');
    this.customTags.set([]);
    this.newTagKey.set('');
    this.newTagValue.set('');
    this.availableTagKeys.set([]);
    this.currentStep.set('collection-selection');
  }

  // Form submission
  submitItem(): void {
    const croppedBlob = this.croppedImage();
    const name = this.itemName().trim();
    const userId = this.authService.userProfile()?.sub;
    const collectionKey = this.selectedCollectionKey();

    if (!collectionKey) {
      this.error.set('Please select a collection.');
      return;
    }

    if (!croppedBlob) {
      this.error.set('Please capture or upload an image first.');
      return;
    }

    if (!name) {
      this.error.set('Please enter a name for the item.');
      return;
    }

    if (!userId) {
      this.error.set('User not authenticated. Please log in again.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    // Convert customTags array to Record<string, string>
    const customTagsRecord: Record<string, string> = {};
    this.customTags().forEach(tag => {
      customTagsRecord[tag.key] = tag.value;
    });

    const request = {
      name: name,
      userId: userId,
      tags: [],
      description: this.itemDescription().trim(),
      customTags: Object.keys(customTagsRecord).length > 0 ? customTagsRecord : undefined,
      // Include collectionName when creating a new collection
      collectionName: this.isCreatingNew() ? this.newCollectionName().trim() : undefined
    };

    this.collectionService.addItem(collectionKey, croppedBlob, request)
      .subscribe({
        next: () => {
          this.router.navigate(['/collection']);
        },
        error: (err) => {
          console.error('Add item error:', err);
          if (err.status === 429) {
            this.itemLimitExceeded.set(true);
            const errorResponse = err.error as ErrorResponse;
            if (errorResponse?.error) {
              this.itemLimitInfo.set({
                limit: errorResponse.error.limit,
                used: errorResponse.error.used
              });
              this.error.set(errorResponse.error.message);
            } else {
              this.error.set('Item limit exceeded. You have reached the maximum number of items allowed.');
            }
          } else {
            this.error.set('Failed to add item. Please try again.');
          }
          this.isSubmitting.set(false);
        }
      });
  }

  cancel(): void {
    this.stopCamera();
    this.router.navigate(['/collection']);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
