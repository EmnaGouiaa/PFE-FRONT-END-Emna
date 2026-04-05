import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Add global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  alert(`JavaScript Error: ${event.error.message}`);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  alert(`Promise Error: ${event.reason}`);
});

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('Bootstrap error:', err);
    alert(`App failed to start: ${err.message}`);
  });
