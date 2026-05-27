import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

/**
 * GET avec corps optionnel : succès 200 + JSON, ou 204 / corps vide → null, sans erreur réseau « rouge ».
 * Les erreurs authentification / 5xx retombent dans catchError → null (comportement gracieux comme avant).
 */
export function getJsonOptional$<T>(http: HttpClient, url: string): Observable<T | null> {
  return http.get<T>(url, { observe: 'response' }).pipe(
    map((resp: HttpResponse<T>) => {
      if (resp.status === 204 || resp.body === null || resp.body === undefined) {
        return null;
      }
      return resp.body as T;
    }),
    catchError(() => of(null))
  );
}
