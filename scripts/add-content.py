# Ajoute du contenu à un cours, unité par unité, avec ses traductions d'interface.
#   python3 scripts/add-content.py ajout.json [ajout2.json …]
# Format d'un fichier d'ajout :
# {
#   "cid": "en-daily",
#   "units": { "<titre du thème>": { "<titre de l'unité>": { "p": [...], "v": [...], "c": [...], "l": [...], "dd": [...] } } },
#   "tr": { "<texte français>": { "en": "...", "ko": "..." } }
# }
# Chaque élément est ajouté à la fin de la liste du thème et son index à l'unité (champ « parts »), pour que l'ordre
# de l'auteur (découverte puis difficulté) soit gardé. Un élément déjà présent dans le thème est ignoré.
# Les traductions ne sont ajoutées que si la clé manque dans src/i18n/<langue>.json (section content).
import json, os, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')


def load(p):
    return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))


def save(p, d):
    with open(os.path.join(ROOT, p), 'w', encoding='utf-8') as f:
        f.write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')


def key(x):
    if isinstance(x, list): return x[0] if isinstance(x[0], str) else json.dumps(x[0], ensure_ascii=False)
    return json.dumps(x, ensure_ascii=False)


# Format texte (.txt), plus rapide à écrire :
#   cid: en-daily                 cours visé
#   tr: ko                        langue(s) des traductions après « || » (ex. « tr: en ko » pour deux langues)
#   # Titre du thème
#   ## Titre de l'unité
#   P: phrase source | réponse | autre réponse acceptée… || traduction de la phrase source
#   V: mot source | mot cible || traduction du mot source
#   C: question avec ___ | bonne option | autre | autre | autre | explication || traduction de l'explication
#   L: question entendue | bonne réponse | piège | piège           (Part 2 TOEIC, rien à traduire)
#   D: phrase de dictée                                             (Voltaire)
def parse_txt(path):
    A = {'units': {}, 'tr': {}}
    langs, T, P = [], None, None
    for raw in open(path, encoding='utf-8'):
        line = raw.strip()
        if not line or line.startswith('//'): continue
        if line.startswith('cid:'): A['cid'] = line[4:].strip(); continue
        if line.startswith('tr:'): langs = line[3:].split(); continue
        if line.startswith('## '): P = A['units'][T].setdefault(line[3:].strip(), {}); continue
        if line.startswith('# '): T = line[2:].strip(); A['units'].setdefault(T, {}); P = None; continue
        tag, _, rest = line.partition(':')
        body, *tr = [x.strip() for x in rest.split('||')]
        f = [x.strip() for x in body.split('|')]
        if P is None: sys.exit(f'{path} : ligne hors unité « {line} »')
        if tag == 'P': it, src = f, f[0]
        elif tag == 'V': it, src = f[:2], f[0]
        elif tag == 'C':
            it = [f[0], f[1:-1], 0, f[-1]]
            src = f[-1]
        elif tag == 'L': it, src = [f[0], f[1:], 0], None
        elif tag == 'D': it, src = f[0], None
        else: sys.exit(f'{path} : type de ligne inconnu « {line} »')
        P.setdefault({'P': 'p', 'V': 'v', 'C': 'c', 'L': 'l', 'D': 'dd'}[tag], []).append(it)
        if src and tr:
            if len(tr) != len(langs): sys.exit(f'{path} : {len(tr)} traduction(s) au lieu de {len(langs)} « {line} »')
            A['tr'].setdefault(src, {}).update(dict(zip(langs, tr)))
    return A


I18N = {L: load(f'src/i18n/{L}.json') for L in ('en', 'ko')}
added, skipped, trs = 0, 0, 0
for path in sys.argv[1:]:
    A = parse_txt(path) if path.endswith('.txt') else json.load(open(path, encoding='utf-8'))
    cid = A['cid']
    cp = f'src/content/courses/{cid}.json'
    C = load(cp)
    units = {U['t']: U for U in C['units']}
    for T, parts in A.get('units', {}).items():
        if T not in units: sys.exit(f'{path} : thème inconnu « {T} » dans {cid}')
        U = units[T]
        byt = {P['t']: P for P in U['parts']}
        for pt, lists in parts.items():
            if pt not in byt: sys.exit(f'{path} : unité inconnue « {pt} » dans « {T} »')
            P = byt[pt]
            for k, items in lists.items():
                arr = U.setdefault(k, [])
                have = {key(x) for x in arr}
                for it in items:
                    if key(it) in have:
                        skipped += 1
                        continue
                    have.add(key(it))
                    arr.append(it)
                    P.setdefault(k, []).append(len(arr) - 1)
                    added += 1
    save(cp, C)
    for fr, t in A.get('tr', {}).items():
        for L, v in t.items():
            c = I18N[L]['content']
            if fr not in c:
                c[fr] = v
                trs += 1
for L, d in I18N.items(): save(f'src/i18n/{L}.json', d)
print(f'{added} éléments ajoutés, {skipped} déjà présents, {trs} traductions ajoutées')
