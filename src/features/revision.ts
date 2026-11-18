// Carte « Révision IA illimitée » (v38.2) : toujours des exercices nouveaux (jamais la réserve de l'IA),
// à la difficulté réglée sur la réussite réelle aux dernières révisions, et les exercices ratés qui reviennent.
import { S } from "../core/accounts.js";
import { shuffle } from "../core/util.js";

type RevResult = { ts: number; ok: number; n: number };
export type RevPerf = { perf: "up" | "keep" | "down"; acc: number };

export const REV = {
  keep: 5, // résultats de séance gardés par cours
  last: 3, // séances prises en compte pour le niveau
  up: 85, // à partir de ce taux de réussite : un peu plus difficile
  down: 60, // en dessous : un peu plus simple, pour consolider
  failed: 6, // exercices ratés repris dans chaque séance
};

// S.revAcc[cid] : résultats des dernières séances (profil, synchronisé avec les comptes)
const P = (): any => S;
function results(cid: string): RevResult[] {
  const st = P();
  st.revAcc = st.revAcc && typeof st.revAcc === "object" ? st.revAcc : {};
  return (st.revAcc[cid] = Array.isArray(st.revAcc[cid]) ? st.revAcc[cid] : []);
}

// Fin d'une séance de révision IA : on garde son taux de réussite (5 réponses au moins)
export function revRecord(cid: string, ok: number, n: number): void {
  if (!cid || n < 5) return;
  const a = results(cid);
  a.push({ ts: Date.now(), ok, n });
  P().revAcc[cid] = a.slice(-REV.keep);
}

// Réussite des dernières séances et réglage demandé à l'IA ; null tant qu'aucune séance n'est terminée
export function revPerf(cid: string): RevPerf | null {
  const a = results(cid).slice(-REV.last);
  const n = a.reduce((s, r) => s + (r.n || 0), 0);
  if (!n) return null;
  const acc = Math.round((a.reduce((s, r) => s + (r.ok || 0), 0) / n) * 100);
  return { perf: acc >= REV.up ? "up" : acc < REV.down ? "down" : "keep", acc };
}

// Consigne envoyée à l'IA (même texte dans server/api/generate.php)
export function revPerfText(perf: string, acc: number): string {
  const head = `Adaptation au niveau réel : l'élève réussit ${acc} % de ses dernières révisions. `;
  if (perf === "up")
    return (
      head +
      "Propose des exercices un peu plus difficiles que le niveau indiqué (phrases plus longues, structures et vocabulaire du niveau suivant), toujours à partir de ce qu'il a vu.\n\n"
    );
  if (perf === "down")
    return (
      head +
      "Propose des exercices un peu plus simples que le niveau indiqué (phrases courtes, vocabulaire de base des unités vues) pour consolider.\n\n"
    );
  if (perf === "keep") return head + "Garde exactement le niveau indiqué, en variant les formes d'exercices.\n\n";
  return "";
}

// Exercices ratés à reprendre : ceux qui sont à revoir, et ceux qui n'ont pas encore été réussis depuis l'erreur
export function revFailed(cid: string, n = REV.failed): any[] {
  const now = Date.now();
  const list = ((P().mist && P().mist[cid]) || []) as any[];
  return shuffle(list.filter(m => (m.due || 0) <= now || !(m.box > 0)))
    .slice(0, n)
    .map((m: any) => Object.assign({}, m, { _cid: cid, _rev: true }));
}
