"""Ajoute du contenu à un cours, unité par unité, avec ses traductions d'interface (v37).
Format :
  cid: en-pro
  tr: ko            (langue de traduction par défaut des « || … »)
  # Titre du thème  (U.t exact, ou #<index>)
  ## Titre de l'unité (P.t exact)
  P: champ0 | champ1 | …  || traduction de champ0
  V: champ0 | champ1 | …  || traduction
  C: question | o1 ; o2 ; o3 ; o4 | indexBon | explication || traduction de l'explication
  L: question | o1 ; o2 ; o3 | indexBon
  D: dictée
Plusieurs traductions : « || en: … || ko: … ».
  CV: M: réplique // W: réplique // N: annonce     (conversation Part 3/4 ; M = homme, W = femme, N = narrateur)
  RD: texte, avec \\n pour les retours à la ligne  (texte Part 7)
  G: graphique, avec \\n                          (facultatif, après CV : graphique Part 3/4)
  Q: question | o1 ; o2 ; o3 ; o4 | indexBon | explication || traduction  (question de la dernière CV ou RD)
Chaque élément est ajouté à la fin de la liste du thème et son index à l'unité (champ « parts »), dans l'ordre du fichier :
les leçons de l'unité se partagent ces éléments dans cet ordre (découverte d'abord). Un élément dont le texte source
existe déjà dans le cours est ignoré. Pour le coréen, la romanisation est calculée (scripts/romanize_ko.py).
Les traductions ne sont ajoutées que si la clé manque dans src/i18n/<langue>.json (section content).
Usage : python3 scripts/add-content.py fichier.txt [--dry]
"""
import json, sys, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from romanize_ko import rom

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
path = sys.argv[1]
dry = "--dry" in sys.argv
lines = [l.rstrip("\n") for l in open(path, encoding="utf-8")]
cid = tr = None
U = P = None
adds = {"en": {}, "ko": {}}
cnt = {}
C = None


def split_tr(s):
    parts = [x.strip() for x in s.split("||")]
    main, trs = parts[0], {}
    for t in parts[1:]:
        m = re.match(r"^(en|ko):\s*(.*)$", t)
        if m:
            trs[m.group(1)] = m.group(2)
        elif t:
            trs[tr] = t
    return main, trs


ALLSRC = set()


def add(key, item, trkey, trs):
    if not ALLSRC and C:
        for UU in C["units"]:
            for k in ("p", "v", "c", "dd", "l"):
                for x in UU.get(k, []):
                    ALLSRC.add((k, json.dumps(x[0] if isinstance(x, list) else x, ensure_ascii=False)))
    sk = (key, json.dumps(item[0] if isinstance(item, list) else item, ensure_ascii=False, sort_keys=True))
    if sk in ALLSRC:
        print(f"  déjà dans le cours, ignoré : {sk[1]}")
        return
    ALLSRC.add(sk)
    if key not in U:
        U[key] = []
    if not isinstance(item, dict) and item in U[key]:
        raise SystemExit(f"doublon dans {U['t']} : {item}")
    U[key].append(item)
    P.setdefault(key, []).append(len(U[key]) - 1)
    cnt[key] = cnt.get(key, 0) + 1
    for l, t in trs.items():
        if trkey is not None:
            adds[l][trkey] = t


for no, l in enumerate(lines, 1):
    s = l.strip()
    if not s or s.startswith("//"):
        continue
    try:
        if s.startswith("cid:"):
            cid = s[4:].strip()
            C = json.load(open(f"{ROOT}src/content/courses/{cid}.json", encoding="utf-8"))
        elif s.startswith("tr:"):
            tr = s[3:].strip()
        elif s.startswith("## "):
            t = s[3:].strip()
            P = next(x for x in U["parts"] if x["t"] == t)
        elif s.startswith("# "):
            t = s[2:].strip()
            U = C["units"][int(t[1:])] if re.match(r"^#\d+$", t) else next(x for x in C["units"] if x["t"] == t)
            P = None
        elif s[:2] in ("P:", "V:"):
            main, trs = split_tr(s[2:])
            f = [x.strip() for x in main.split("|")]
            if cid == "ko" and s[0] == "P":
                f = f[:2] + [rom(f[1])] + f[2:]
            add("p" if s[0] == "P" else "v", f, f[0], trs)
        elif s.startswith("C:"):
            main, trs = split_tr(s[2:])
            q, o, i, e = [x.strip() for x in main.split("|")]
            opts = [x.strip() for x in o.split(";")]
            assert 0 <= int(i) < len(opts), "index"
            add("c", [q, opts, int(i), e], e, trs)
        elif s.startswith("CV:"):
            d = [[x.split(":", 1)[0].strip()[0], x.split(":", 1)[1].strip()] for x in s[3:].split("//")]
            LAST = {"d": d, "q": []}
            add("cv", LAST, None, {})
        elif s.startswith("RD:"):
            LAST = {"x": s[3:].strip().replace("\\n", "\n"), "q": []}
            add("rd", LAST, None, {})
        elif s.startswith("G:"):
            LAST["g"] = s[2:].strip().replace("\\n", "\n")
        elif s.startswith("Q:"):
            main, trs = split_tr(s[2:])
            q, o, i, e = [x.strip() for x in main.split("|")]
            opts = [x.strip() for x in o.split(";")]
            assert 0 <= int(i) < len(opts), "index"
            LAST["q"].append([q, opts, int(i), e])
            for l, t in trs.items():
                adds[l][e] = t
        elif s.startswith("L:"):
            q, o, i = [x.strip() for x in s[2:].split("|")]
            add("l", [q, [x.strip() for x in o.split(";")], int(i)], None, {})
        elif s.startswith("D:"):
            add("dd", s[2:].strip(), None, {})
        else:
            raise ValueError("ligne inconnue")
    except StopIteration:
        raise SystemExit(f"{path}:{no} titre introuvable : {s}")
    except Exception as ex:
        raise SystemExit(f"{path}:{no} {ex} : {s}")

print(cid, cnt, {k: len(v) for k, v in adds.items()})
if not dry:
    with open(f"{ROOT}src/content/courses/{cid}.json", "w", encoding="utf-8") as f:
        json.dump(C, f, ensure_ascii=False, indent=1)
        f.write("\n")
    for l, d in adds.items():
        if not d:
            continue
        fn = f"{ROOT}src/i18n/{l}.json"
        J = json.load(open(fn, encoding="utf-8"))
        for k, v in d.items():
            if k not in J["content"]:
                J["content"][k] = v
        with open(fn, "w", encoding="utf-8") as f:
            json.dump(J, f, ensure_ascii=False, indent=1)
            f.write("\n")
