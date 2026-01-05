import { Pipe, PipeTransform, OnDestroy } from '@angular/core';

@Pipe({
  name: 'blobToUrl',
  standalone: true
})
export class BlobToUrlPipe implements PipeTransform, OnDestroy {
  private cachedBlob: Blob | null = null;
  private cachedUrl: string | null = null;

  transform(blob: Blob | null): string {
    if (!blob) {
      return '';
    }

    if (blob !== this.cachedBlob) {
      if (this.cachedUrl) {
        URL.revokeObjectURL(this.cachedUrl);
      }
      this.cachedUrl = URL.createObjectURL(blob);
      this.cachedBlob = blob;
    }

    return this.cachedUrl || '';
  }

  ngOnDestroy(): void {
    if (this.cachedUrl) {
      URL.revokeObjectURL(this.cachedUrl);
    }
  }
}
