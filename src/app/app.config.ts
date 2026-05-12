<<<<<<< HEAD
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
=======
import { ApplicationConfig } from '@angular/core';
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { JwtInterceptor } from './interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
<<<<<<< HEAD
    provideZoneChangeDetection({ eventCoalescing: true }),
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
    provideRouter(routes),
    // withInterceptorsFromDi() is REQUIRED for class-based HTTP_INTERCEPTORS
    // to be picked up in standalone Angular apps. Without it, JwtInterceptor
    // is silently ignored and requests fail without CORS/auth headers.
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true }
  ]
};
