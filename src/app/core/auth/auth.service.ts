import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { OAuthService, OAuthEvent } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { authConfig } from './auth.config';

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private oauthService = inject(OAuthService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  private _isAuthenticated = signal<boolean>(false);
  private _userProfile = signal<UserProfile | null>(null);
  private _isLoading = signal<boolean>(true);
  private _isConfigured = signal<boolean>(false);

  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  readonly userProfile = this._userProfile.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isLoggedIn = computed(() => this._isAuthenticated() && !this._isLoading());

  constructor() {
    this.configureOAuth();
  }

  private async configureOAuth(): Promise<void> {
    this.oauthService.configure(authConfig);

    this.oauthService.events.subscribe((event: OAuthEvent) => {
      this.ngZone.run(() => this.handleOAuthEvent(event));
    });

    try {
      // Load discovery document and try to login (handles implicit flow tokens in hash)
      await this.oauthService.loadDiscoveryDocumentAndTryLogin();
      this._isConfigured.set(true);

      this.updateAuthState();

      if (this.oauthService.hasValidAccessToken()) {
        console.log('OAuth: Valid token found, setting up silent refresh');
        this.oauthService.setupAutomaticSilentRefresh();
      }
    } catch (error) {
      console.error('OAuth configuration error:', error);
    } finally {
      this._isLoading.set(false);
    }
  }

  private handleOAuthEvent(event: OAuthEvent): void {
    console.log('OAuth event:', event.type, event);

    switch (event.type) {
      case 'token_received':
        this.updateAuthState();
        this.oauthService.setupAutomaticSilentRefresh();
        break;
      case 'token_refreshed':
        this.updateAuthState();
        break;
      case 'silent_refresh_error':
      case 'silent_refresh_timeout':
        console.warn('Silent refresh failed, logging out');
        this.logout();
        break;
      case 'logout':
      case 'session_terminated':
        this._isAuthenticated.set(false);
        this._userProfile.set(null);
        break;
      case 'code_error':
      case 'token_error':
        console.error('OAuth token/code error:', event);
        break;
    }
  }

  private updateAuthState(): void {
    const hasValidToken = this.oauthService.hasValidAccessToken();
    const hasValidIdToken = this.oauthService.hasValidIdToken();

    this._isAuthenticated.set(hasValidToken && hasValidIdToken);

    if (this._isAuthenticated()) {
      this.loadUserProfile();
    }
  }

  private loadUserProfile(): void {
    const claims = this.oauthService.getIdentityClaims() as Record<string, string>;
    if (claims) {
      this._userProfile.set({
        email: claims['email'],
        name: claims['name'],
        picture: claims['picture'],
        sub: claims['sub']
      });
    }
  }

  async login(): Promise<void> {
    // Ensure discovery document is loaded before initiating flow
    if (!this._isConfigured()) {
      await this.oauthService.loadDiscoveryDocument();
    }
    this.oauthService.initLoginFlow();
  }

  logout(): void {
    this.oauthService.logOut();
    this._isAuthenticated.set(false);
    this._userProfile.set(null);
    this.router.navigate(['/']);
  }

  getAccessToken(): string | null {
    return this.oauthService.getAccessToken();
  }

  getIdToken(): string | null {
    return this.oauthService.getIdToken();
  }

  refreshToken(): Promise<object> {
    return this.oauthService.refreshToken();
  }
}
