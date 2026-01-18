import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  protected authService = inject(AuthService);
  readonly imageError = signal(false);
  readonly menuOpen = signal(false);

  login(): void {
    this.authService.login();
  }

  logout(): void {
    this.authService.logout();
  }

  onImageError(): void {
    this.imageError.set(true);
  }

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  getFirstName(fullName: string | undefined): string {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }

  getInitials(fullName: string | undefined): string {
    if (!fullName) return '?';
    const parts = fullName.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
}
