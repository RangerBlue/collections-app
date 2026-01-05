export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
  oauth: {
    issuer: 'https://accounts.google.com',
    clientId: '',
    redirectUri: 'http://localhost:4200',
    scope: 'openid profile email',
    showDebugInformation: true,
    strictDiscoveryDocumentValidation: false
  }
};
