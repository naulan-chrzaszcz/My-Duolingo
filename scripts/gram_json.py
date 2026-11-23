"""Écrit content/grammar/<langue>.json dans sa mise en forme d'origine (v39.3) :
objets et listes d'objets sur plusieurs lignes, une ligne par gabarit, listes de mots sur une ligne, règles « r » une par ligne."""
import json


def dumps(o, ind=0, key=None):
    sp = " " * ind
    if isinstance(o, dict):
        if not o:
            return "{}"
        rows = [f'{sp} {json.dumps(k, ensure_ascii=False)}: {dumps(v, ind + 1, k)}' for k, v in o.items()]
        return "{\n" + ",\n".join(rows) + "\n" + sp + "}"
    if isinstance(o, list):
        if any(isinstance(x, dict) for x in o) or any(isinstance(x, list) for x in o) or key == "r":
            if not o:
                return "[]"
            inline = key in ("i", "p")
            rows = [sp + " " + (dumps(x, ind + 1) if isinstance(x, dict) and not inline else json.dumps(x, ensure_ascii=False)) for x in o]
            return "[\n" + ",\n".join(rows) + "\n" + sp + "]"
        return json.dumps(o, ensure_ascii=False)
    return json.dumps(o, ensure_ascii=False)


def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        f.write(dumps(data) + "\n")
