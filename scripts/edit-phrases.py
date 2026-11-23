"""Remplace ou complète des phrases existantes d'un cours (v39.3), avec leur traduction d'interface.
Format (une ligne par phrase, champs séparés par « | ») :
  cid: en-daily
  = Ancienne phrase française | nouvelle phrase française | traduction 1 | traduction 2… || 한국어
  + Phrase française existante | variante à ajouter | autre variante
La ligne « = » remplace la phrase (même place, même unité) ; la ligne « + » ajoute des traductions acceptées.
Usage : python3 scripts/edit-phrases.py fichier.txt [--dry]
"""
import json, sys, os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
path = sys.argv[1]
dry = "--dry" in sys.argv
C = cid = None
KO = json.load(open(ROOT + "src/i18n/ko.json", encoding="utf-8"))
n = {"=": 0, "+": 0}
for no, l in enumerate(open(path, encoding="utf-8"), 1):
    s = l.strip()
    if not s or s.startswith("//"):
        continue
    if s.startswith("cid:"):
        cid = s[4:].strip()
        C = json.load(open(f"{ROOT}src/content/courses/{cid}.json", encoding="utf-8"))
        continue
    k, rest = s[0], s[1:].strip()
    main, _, ko = rest.partition("||")
    f = [x.strip() for x in main.split("|")]
    hits = [p for U in C["units"] for p in U.get("p", []) if p[0] == f[0]]
    if len(hits) != 1:
        raise SystemExit(f"{path}:{no} phrase introuvable ou en double ({len(hits)}) : {f[0]}")
    p = hits[0]
    if k == "=":
        if any(q[0] == f[1] for U in C["units"] for q in U.get("p", [])):
            raise SystemExit(f"{path}:{no} la nouvelle phrase existe déjà : {f[1]}")
        p[:] = f[1:]
        if ko.strip():
            KO["content"].setdefault(f[1], ko.strip())
    elif k == "+":
        for x in f[1:]:
            if x and x not in p[1:]:
                p.append(x)
    else:
        raise SystemExit(f"{path}:{no} ligne inconnue : {s}")
    n[k] += 1
print(cid, "remplacées :", n["="], "· variantes ajoutées sur", n["+"], "phrases")
if not dry:
    with open(f"{ROOT}src/content/courses/{cid}.json", "w", encoding="utf-8") as o:
        json.dump(C, o, ensure_ascii=False, indent=1)
        o.write("\n")
    with open(ROOT + "src/i18n/ko.json", "w", encoding="utf-8") as o:
        json.dump(KO, o, ensure_ascii=False, indent=1)
        o.write("\n")
