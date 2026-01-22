import { Component, signal, inject, ViewChild, ElementRef, OnDestroy, OnInit, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { CollectionService } from '../collection.service';
import { BlobToUrlPipe } from '../../../shared/pipes/blob-to-url.pipe';
import { SimilarItem } from '../../../core/models/validate-item-response.model';
import { UserCollectionResponse } from '../../../core/models/collection-item.model';

type CropShape = 'rectangle' | 'circle';
type ComponentStep = 'collection-selection' | 'source-selection' | 'capture' | 'crop' | 'validating' | 'results';

@Component({
  selector: 'app-validate-item',
  standalone: true,
  imports: [FormsModule, ImageCropperComponent, BlobToUrlPipe],
  templateUrl: './validate-item.component.html',
  styleUrl: './validate-item.component.css'
})
export class ValidateItemComponent implements OnInit, OnDestroy {
  private collectionService = inject(CollectionService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // State signals
  readonly currentStep = signal<ComponentStep>('collection-selection');
  readonly imageSource = signal<string>('');
  readonly imageFile = signal<File | undefined>(undefined);
  readonly croppedImage = signal<Blob | null>(null);
  readonly cropShape = signal<CropShape>('circle');
  readonly error = signal<string | null>(null);
  readonly isCameraActive = signal<boolean>(false);

  // Mobile detection - hide camera option on mobile as file upload provides camera access
  readonly isMobile = signal<boolean>(this.detectMobile());

  // Drag and drop state
  readonly isDragging = signal<boolean>(false);

  private detectMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  }

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

  // Validation results
  readonly similarItems = signal<SimilarItem[]>([]);
  readonly hasSimilarItems = signal<boolean>(false);

  private mediaStream: MediaStream | null = null;

  ngOnInit(): void {
    const collectionParam = this.route.snapshot.queryParamMap.get('collection');
    if (collectionParam) {
      this.selectedCollectionKey.set(collectionParam);
      this.currentStep.set('source-selection');
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
    } else {
      if (!this.selectedCollectionKey()) {
        this.error.set('Please select a collection.');
        return;
      }
    }

    this.error.set(null);
    this.currentStep.set('source-selection');
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
      this.validateItem();
    }
  }

  retakePicture(): void {
    this.imageSource.set('');
    this.imageFile.set(undefined);
    this.croppedImage.set(null);
    this.currentStep.set('source-selection');
  }

  goBackToCollectionSelection(): void {
    this.imageSource.set('');
    this.imageFile.set(undefined);
    this.croppedImage.set(null);
    this.currentStep.set('collection-selection');
  }

  // Validation
  validateItem(): void {
    const croppedBlob = this.croppedImage();
    const collectionKey = this.selectedCollectionKey();

    if (!collectionKey) {
      this.error.set('Please select a collection.');
      return;
    }

    if (!croppedBlob) {
      this.error.set('Please capture or upload an image first.');
      return;
    }

    this.currentStep.set('validating');
    this.error.set(null);

    this.collectionService.validateItem(collectionKey, croppedBlob)
      .subscribe({
        next: (response) => {
          this.similarItems.set(response.similarCaps);
          this.hasSimilarItems.set(response.hasSimilarItems);
          this.currentStep.set('results');
        },
        error: (err) => {
          console.error('Validation error:', err);
          this.error.set('Failed to validate item. Please try again.');
          this.currentStep.set('crop');
        }
      });
  }

  checkAnother(): void {
    this.imageSource.set('');
    this.croppedImage.set(null);
    this.similarItems.set([]);
    this.hasSimilarItems.set(false);
    this.currentStep.set('source-selection');
  }

  cancel(): void {
    this.stopCamera();
    this.router.navigate(['/collection']);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
