<<<<<<< HEAD
import 'zone.js';
=======
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Add global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
<<<<<<< HEAD
  alert(`Erreur JavaScript : ${event.error.message}`);
=======
  alert(`JavaScript Error: ${event.error.message}`);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
<<<<<<< HEAD
  alert(`Erreur (promesse non gérée) : ${event.reason}`);
=======
  alert(`Promise Error: ${event.reason}`);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
});

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('Bootstrap error:', err);
<<<<<<< HEAD
    alert(`Échec du démarrage de l’application : ${err.message}`);
=======
    alert(`App failed to start: ${err.message}`);
>>>>>>> 2d3d62c5d004508496c215ced2ea02973e183bc3
  });
