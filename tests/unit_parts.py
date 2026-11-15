# v35 : chaque thème est découpé en 3 unités à sujet propre (champ « parts »).
# Vérifie : 3 unités, titres distincts et traduits, chaque élément d'une liste découpée dans une seule unité,
# assez de matière par unité, et contenu traduit pour les interfaces qui affichent le cours.
import json, os, sys
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
EN = json.load(open(os.path.join(R, 'i18n/en.json')))['content']
KO = json.load(open(os.path.join(R, 'i18n/ko.json')))['content']
# dictionnaires où chaque texte français (ou anglais pour fr-fle) doit exister
NEED = {'en-daily': [KO], 'en-pro': [KO], 'en-toeic': [KO], 'fr-fle': [KO], 'ko': [EN], 'fr-volt': [EN, KO]}
MIN = {'trans': {'p': 4, 'v': 3, 'c': 2}, 'toeic': {'c': 2}, 'volt': {'c': 3, 'dd': 1}, 'hg': {'hj': 2}}
prob = []
nparts = 0
for cid, dicts in NEED.items():
    C = json.load(open(os.path.join(R, f'content/courses/{cid}.json')))
    for U in C['units']:
        T = U['t']
        P = U.get('parts')
        if not P or len(P) != 3:
            prob.append(f'{cid} « {T} » : pas de découpage en 3 unités'); continue
        nparts += 3
        ts = [x.get('t', '') for x in P]
        if len(set(ts)) != 3 or not all(ts): prob.append(f'{cid} « {T} » : titres vides ou en double {ts}')
        for t in ts:
            for d in dicts:
                if t not in d: prob.append(f'{cid} « {T} » : titre non traduit « {t} »')
        keys = set(k for x in P for k in x if k != 't')
        for k in keys:
            arr = U.get(k) or []
            used = sorted(i for x in P for i in x.get(k, []))
            if used != list(range(len(arr))): prob.append(f'{cid} « {T} » : « {k} » mal réparti {used} sur {len(arr)}')
        kind = 'hg' if U.get('hg') else C.get('kind', 'trans')
        for k, m in MIN.get(kind, {}).items():
            if not U.get(k): continue
            for x in P:
                # une liste absente de la partie reste commune au thème
                n = len(x.get(k, U[k]))
                if n < m: prob.append(f'{cid} « {x.get("t")} » : {n} « {k} » (minimum {m})')
        # tout le contenu affiché doit être traduit pour les autres interfaces
        if cid != 'fr-volt':
            for d in dicts:
                for p in U.get('p', []):
                    if p[0] not in d: prob.append(f'{cid} « {T} » : phrase non traduite « {p[0]} »')
                # en hangul, v[0] est une romanisation : rien à traduire
                for v in ([] if kind == 'hg' else U.get('v', [])):
                    if v[0] not in d: prob.append(f'{cid} « {T} » : mot non traduit « {v[0]} »')
        for d in dicts:
            for c in U.get('c', []):
                if len(c) > 3 and c[3] and c[3] not in d: prob.append(f'{cid} « {T} » : explication non traduite « {c[3][:60]} »')
                # en coréen, la consigne en français est traduite pour l'interface anglaise
                if cid == 'ko' and c[0] not in d: prob.append(f'{cid} « {T} » : consigne non traduite « {c[0][:60]} »')
print(f'{nparts} unités affichées vérifiées')
for x in prob[:80]: print(' -', x)
print('PROBLEMES :', len(prob))
sys.exit(1 if prob else 0)
