"""Romanisation révisée (romanisation affichée sous les phrases coréennes) du coréen avec les principales règles de prononciation (liaison, nasalisation, ㄹ, ㅎ)."""
import os, re

CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
# finales : index 0 = aucune
JONG_L = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
CHO_L = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
CR = dict(zip(CHO_L, CHO))
# finale prononcée seule (neutralisation)
NEUT = {'ㄱ': 'ㄱ', 'ㄲ': 'ㄱ', 'ㅋ': 'ㄱ', 'ㄳ': 'ㄱ', 'ㄺ': 'ㄱ', 'ㄴ': 'ㄴ', 'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ', 'ㄷ': 'ㄷ', 'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ',
        'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅎ': 'ㄷ', 'ㄹ': 'ㄹ', 'ㄼ': 'ㄹ', 'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㅀ': 'ㄹ', 'ㄻ': 'ㅁ', 'ㅁ': 'ㅁ',
        'ㅂ': 'ㅂ', 'ㅍ': 'ㅂ', 'ㅄ': 'ㅂ', 'ㄿ': 'ㅂ', 'ㅇ': 'ㅇ'}
FR = {'ㄱ': 'k', 'ㄴ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅇ': 'ng', '': ''}
# finale double : (reste, part en liaison)
SPLIT = {'ㄳ': ('ㄱ', 'ㅅ'), 'ㄵ': ('ㄴ', 'ㅈ'), 'ㄶ': ('ㄴ', 'ㅎ'), 'ㄺ': ('ㄹ', 'ㄱ'), 'ㄻ': ('ㄹ', 'ㅁ'), 'ㄼ': ('ㄹ', 'ㅂ'),
         'ㄽ': ('ㄹ', 'ㅅ'), 'ㄾ': ('ㄹ', 'ㅌ'), 'ㄿ': ('ㄹ', 'ㅍ'), 'ㅀ': ('ㄹ', 'ㅎ'), 'ㅄ': ('ㅂ', 'ㅅ')}
ASP = {'ㄱ': 'ㅋ', 'ㄷ': 'ㅌ', 'ㅂ': 'ㅍ', 'ㅈ': 'ㅊ'}


def syl(text):
    out = []
    for ch in text:
        o = ord(ch) - 0xAC00
        if 0 <= o < 11172:
            out.append([CHO_L[o // 588], JUNG[(o % 588) // 28], JONG_L[o % 28]])
        else:
            out.append(ch)
    return out


def word(w):
    s = syl(w)
    n = len(s)
    for i in range(n - 1):
        a, b = s[i], s[i + 1]
        if not isinstance(a, list) or not isinstance(b, list):
            continue
        f, c = a[2], b[0]
        if not f:
            continue
        if c == 'ㅇ':  # liaison
            if f == 'ㅇ':
                continue
            if f in ('ㄷ', 'ㅌ') and b[1] == 'i':  # palatalisation : 같이 → gachi
                a[2], b[0] = '', ('ㅈ' if f == 'ㄷ' else 'ㅊ')
                continue
            if f in SPLIT:
                a[2], b[0] = SPLIT[f]
            elif f == 'ㅎ':
                a[2] = ''
            elif f in ('ㄲ', 'ㅆ'):
                a[2], b[0] = '', f
            else:
                a[2], b[0] = '', f
            if b[0] == 'ㅎ':
                b[0] = 'ㅇ'
            continue
        if c == 'ㅎ' and f in ('ㄱ', 'ㅂ'):  # 축하 → chukha, 급해 → geuphae (usage des données du cours)
            continue
        if c == 'ㅎ':  # aspiration finale + ㅎ
            base = NEUT.get(f, f) if f not in SPLIT else SPLIT[f][1]
            if f in SPLIT:
                a[2] = SPLIT[f][0]
            else:
                a[2] = ''
            if base in ASP:
                b[0] = ASP[base]
            elif f in ('ㅅ', 'ㅆ', 'ㅈ', 'ㅊ', 'ㅌ'):
                b[0] = 'ㅌ'
            else:
                a[2] = f if f not in SPLIT else a[2]
            continue
        if f in ('ㅎ', 'ㄶ', 'ㅀ') and c in ASP:
            a[2] = '' if f == 'ㅎ' else ('ㄴ' if f == 'ㄶ' else 'ㄹ')
            b[0] = ASP[c]
            continue
        nf = NEUT.get(f, f)
        if c in ('ㄴ', 'ㅁ'):
            nf = {'ㄱ': 'ㅇ', 'ㄷ': 'ㄴ', 'ㅂ': 'ㅁ'}.get(nf, nf)
            if nf == 'ㄹ' and c == 'ㄴ':
                b[0] = 'ㄹ'
        elif c == 'ㄹ':
            if nf == 'ㄴ':
                nf = 'ㄹ'
            elif nf in ('ㄱ', 'ㄷ', 'ㅂ', 'ㅁ', 'ㅇ'):
                b[0] = 'ㄴ'
                nf = {'ㄱ': 'ㅇ', 'ㄷ': 'ㄴ', 'ㅂ': 'ㅁ'}.get(nf, nf)
        a[2] = nf
    r = ''
    for i, x in enumerate(s):
        if not isinstance(x, list):
            r += x
            continue
        if x[0] == 'ㅎ' and i > 0 and isinstance(s[i - 1], list) and s[i - 1][2] in ('ㄱ', 'ㅂ'):
            r += 'h' + x[1] + FR[NEUT.get(x[2], x[2]) if x[2] else '']
            continue
        c, v, f = x
        if c == 'ㄹ' and i > 0 and isinstance(s[i - 1], list) and s[i - 1][2] == 'ㄹ':
            r += 'l'
        elif c == 'ㄹ' and i == 0:
            r += 'r'
        else:
            r += CR[c]
        r += v
        r += FR[NEUT.get(f, f) if f else '']
    return r


def rom(text):
    t = re.sub(r'[.!?…"«»“”~]+$', '', text.strip())
    t = re.sub(r'["«»“”~…]', '', t)
    return ' '.join(word(w) for w in t.split())


if __name__ == '__main__':
    import json, sys
    C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src/content/courses/ko.json')))
    ok = bad = 0
    for U in C['units']:
        for p in U.get('p', []):
            if len(p) > 2 and isinstance(p[2], str):
                if rom(p[1]) == p[2]:
                    ok += 1
                else:
                    bad += 1
                    if bad <= 25:
                        print(p[1], '|', p[2], '|', rom(p[1]))
    print(ok, bad)
