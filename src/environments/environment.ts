export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com', // TODO: Update with your production API URL
  oauth: {
    issuer: 'https://accounts.google.com',
    clientId: '',
    redirectUri: 'http://localhost:4200',
    scope: 'openid profile email',
    showDebugInformation: false,
    strictDiscoveryDocumentValidation: false
  }
};
