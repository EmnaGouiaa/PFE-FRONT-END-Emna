import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extrait le message d'erreur API lorsque responseType est "blob"
 * (le corps d'erreur arrive souvent en Blob JSON, illisible sans parsing).
 */
export async function readApiErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!(error instanceof HttpErrorResponse)) {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String((error as { message?: unknown }).message ?? '');
      return message.trim() || fallback;
    }
    return fallback;
  }

  if (error.status === 0) {
    return 'Le serveur est indisponible ou la requête a été bloquée.';
  }
  if (error.status === 401) {
    return 'Votre session a expiré. Veuillez vous reconnecter.';
  }
  if (error.status === 403) {
    return "Vous n'avez pas l'autorisation pour cette action.";
  }
  if (error.status === 404) {
    return "La ressource demandée est introuvable.";
  }

  const body = error.error;
  if (body && typeof body === 'object' && !(body instanceof Blob)) {
    if (typeof (body as { message?: unknown }).message === 'string') {
      const message = (body as { message: string }).message.trim();
      if (message) return message;
    }
  }

  if (typeof body === 'string' && body.trim()) {
    try {
      const json = JSON.parse(body) as { message?: string };
      if (json.message?.trim()) return json.message.trim();
    } catch {
      return body.trim();
    }
  }

  if (body instanceof Blob) {
    try {
      const text = await body.text();
      if (text.trim()) {
        try {
          const json = JSON.parse(text) as { message?: string };
          if (json.message?.trim()) return json.message.trim();
        } catch {
          return text.trim();
        }
      }
    } catch {
      // ignore
    }
  }

  return fallback;
}
