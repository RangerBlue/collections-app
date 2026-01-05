import { Component, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  protected authService = inject(AuthService);
  private router = inject(Router);

  readonly error = signal<string | null>(null);
  readonly isSigningIn = signal(false);

  constructor() {
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.router.navigate(['/collection']);
      }
    });
  }

  async login(): Promise<void> {
    this.isSigningIn.set(true);
    this.error.set(null);

    try {
      await this.authService.login();
    } catch (err) {
      this.error.set('Failed to initiate sign in. Please try again.');
      this.isSigningIn.set(false);
      console.error('Sign in error:', err);
    }
  }
}
