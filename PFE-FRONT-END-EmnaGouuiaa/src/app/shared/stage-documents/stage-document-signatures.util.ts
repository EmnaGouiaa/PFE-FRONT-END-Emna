/** Signataire renvoyé par l'API documents de stage. */
export interface DocumentSignatoryApi {
  role?: string;
  libelle: string;
  signe: boolean;
}

/** Acteur affiché dans le bloc signatures (uniquement les signataires autorisés). */
export interface StageSignatureActorView {
  label: string;
  signed: boolean;
}

/** Statut document minimal pour extraire les signataires. */
export type StageDocumentSignatoriesSource = {
  signataires?: DocumentSignatoryApi[] | null;
} | null | undefined;

/** Libellé uniforme : ✔ Signé / ❌ En attente */
export function stageSignatureStatusLabel(signed: boolean): string {
  return signed ? '✔ Signé' : '❌ En attente';
}

/** Résumé court pour les cartes de liste (sans détail des signataires). */
export function stageSignatureCardSummary(actors: StageSignatureActorView[]): string {
  if (!actors.length) {
    return 'Signatures — chargement…';
  }
  const signed = actors.filter((actor) => actor.signed).length;
  const total = actors.length;
  if (signed === total) {
    return 'Signatures complètes';
  }
  if (signed === 0) {
    return 'Signatures en attente';
  }
  return `${signed}/${total} signées`;
}

/** Résumé détaillé pour la vue Détail (ex. 5/5 signatures complètes). */
export function stageSignatureSummary(chips: StageSignatureActorView[]): string {
  if (!chips.length) {
    return 'État des signatures en cours de chargement…';
  }
  const signed = chips.filter((chip) => chip.signed).length;
  const total = chips.length;
  if (signed === total) {
    return `${signed}/${total} signatures complètes`;
  }
  const remaining = total - signed;
  return `${signed}/${total} signé(s) — ${remaining} signature(s) en attente`;
}

/**
 * Construit la liste d'affichage à partir des signataires fournis par le backend uniquement.
 * Aucun rôle n'est ajouté côté UI.
 */
export function signatoriesFromDocumentStatus(
  status: StageDocumentSignatoriesSource
): StageSignatureActorView[] {
  if (!status?.signataires?.length) {
    return [];
  }
  return status.signataires.map((entry) => ({
    label: String(entry.libelle ?? '').trim() || 'Signataire',
    signed: entry.signe === true,
  }));
}

/** Normalise le tableau signataires renvoyé par l'API. */
export function normalizeDocumentSignatoriesApi(raw: unknown): DocumentSignatoryApi[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: DocumentSignatoryApi[] = [];
  for (const item of raw) {
    const row = item as Record<string, unknown>;
    const libelle = String(row['libelle'] ?? '').trim();
    if (!libelle) {
      continue;
    }
    const entry: DocumentSignatoryApi = {
      libelle,
      signe: row['signe'] === true || row['signe'] === 'true',
    };
    if (row['role'] != null && String(row['role']).trim()) {
      entry.role = String(row['role']);
    }
    result.push(entry);
  }
  return result;
}
