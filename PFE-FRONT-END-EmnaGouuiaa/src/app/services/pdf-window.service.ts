import { Injectable } from '@angular/core';


// 1. openPlaceholder()  →  Ouvre un onglet vide avec "Chargement du PDF..."
//                          (pendant que le fichier se télécharge)
//
// 2. showPdf()          →  Quand le PDF arrive, remplace le "Chargement..."
//                          par une vraie visionneuse avec boutons Imprimer / Fermer
//
// 3. escapeHtml()       →  Sécurité : évite les injections HTML dans le titre
export interface PdfWindowOptions {
  title: string;
  autoPrint?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PdfWindowService {
  openPlaceholder(title: string): Window | null {
    const viewerWindow = window.open('', '_blank');
    if (!viewerWindow) {
      return null;
    }

    viewerWindow.opener = null;
    viewerWindow.document.open();
    viewerWindow.document.write(this.buildLoadingHtml(title));
    viewerWindow.document.close();
    return viewerWindow;
  }

  showPdf(targetWindow: Window | null, blob: Blob, options: PdfWindowOptions): void {
    const viewerWindow = targetWindow ?? this.openPlaceholder(options.title);
    if (!viewerWindow) {
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    viewerWindow.document.open();
    viewerWindow.document.write(this.buildViewerHtml(objectUrl, options));
    viewerWindow.document.close();
    viewerWindow.focus();

    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }

  private buildLoadingHtml(title: string): string {
    return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>${this.escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Segoe UI, Arial, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      .card {
        padding: 24px 28px;
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
    </style>
  </head>
  <body>
    <div class="card">Chargement du PDF...</div>
  </body>
</html>`;
  }

  private buildViewerHtml(objectUrl: string, options: PdfWindowOptions): string {
    const safeTitle = this.escapeHtml(options.title);
    const printScript = options.autoPrint
      ? `
      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (_) {
          window.print();
        }
      };
      iframe.addEventListener('load', () => window.setTimeout(triggerPrint, 250), { once: true });`
      : '';

    return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        grid-template-rows: auto 1fr;
        background: #e2e8f0;
        font-family: Segoe UI, Arial, sans-serif;
      }
      .toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 16px;
        background: #0f4c81;
        color: #fff;
      }
      .title {
        font-weight: 600;
      }
      .actions {
        display: flex;
        gap: 8px;
      }
      button {
        border: none;
        border-radius: 999px;
        padding: 9px 14px;
        font: inherit;
        cursor: pointer;
      }
      .primary {
        background: #ffffff;
        color: #0f4c81;
      }
      .secondary {
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: #cbd5e1;
      }
      @media print {
        .toolbar {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <div class="title">${safeTitle}</div>
      <div class="actions">
        <button class="primary" type="button" onclick="document.getElementById('pdf-frame').contentWindow?.print()">Imprimer</button>
        <button class="secondary" type="button" onclick="window.close()">Fermer</button>
      </div>
    </div>
    <iframe id="pdf-frame" src="${objectUrl}" title="${safeTitle}"></iframe>
    <script>
      const iframe = document.getElementById('pdf-frame');
      ${printScript}
    </script>
  </body>
</html>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
