import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'browse',
    loadComponent: () => import('./features/public-collection/public-collection.component').then(m => m.PublicCollectionComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'collection',
    loadComponent: () => import('./features/collection/collection.component').then(m => m.CollectionComponent),
    canActivate: [authGuard]
  },
  {
    path: 'collection/add',
    loadComponent: () => import('./features/collection/add-item/add-item.component').then(m => m.AddItemComponent),
    canActivate: [authGuard]
  },
  {
    path: 'collection/validate',
    loadComponent: () => import('./features/collection/validate-item/validate-item.component').then(m => m.ValidateItemComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
