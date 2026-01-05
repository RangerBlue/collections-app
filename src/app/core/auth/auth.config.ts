import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../../environments/environment';

export const authConfig: AuthConfig = {
  issuer: environment.oauth.issuer,
  clientId: environment.oauth.clientId,
  redirectUri: window.location.origin,
  scope: environment.oauth.scope,
  showDebugInformation: environment.oauth.showDebugInformation,
  strictDiscoveryDocumentValidation: environment.oauth.strictDiscoveryDocumentValidation,
  // Use implicit flow for SPA (no client_secret needed)
  responseType: 'id_token token',
  requireHttps: false,
  sessionChecksEnabled: true,
  useSilentRefresh: true,
  silentRefreshRedirectUri: `${window.location.origin}/silent-refresh.html`,
  silentRefreshTimeout: 5000,
  timeoutFactor: 0.75
};
