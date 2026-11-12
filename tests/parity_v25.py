import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
# Compare la v25 (un seul script) et la nouvelle version modulaire : mêmes écrans, mêmes leçons, même HTML.
# Math.random et Date sont figés pour que les deux versions produisent exactement la même chose.
import asyncio, sys, json, difflib
from playwright.async_api import async_playwright
A, B = sys.argv[1], sys.argv[2]
INIT = """(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};
const T0=Date.UTC(2026,10,12,9,0,0);let t=T0;const RD=Date;class FD extends RD{constructor(...a){if(a.length)super(...a);else super(t);}static now(){return t;}}
FD.UTC=RD.UTC;FD.parse=RD.parse;window.Date=FD;window.__tick=ms=>{t+=ms};
window.speechSynthesis&&(speechSynthesis.speak=()=>{});})();"""
SETUP = """localStorage.clear();localStorage.setItem('speakeasy-ui','%s');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'Test',emoji:'🐯',color:'#7C4DFF',pin:''}]}));
localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,xp:1234,gems:340,streak:12,lastDay:'2026-11-12',dn:{'en-daily':{0:262143,1:262143,2:4095},'fr-volt':{0:4095},'ko':{0:262143}},bank:{en:[{id:'w',w:'deadline',tr:'date limite',added:1,box:0,due:0}]}}))"""
SECS = {'fr': [('en', 'en-daily'), ('en', 'en-pro'), ('en', 'en-toeic'), ('fr', 'fr-volt'), ('ko', 'ko')], 'en': [('fr', 'fr-fle'), ('fr', 'fr-volt'), ('ko', 'ko')], 'ko': [('en', 'en-daily'), ('en', 'en-toeic'), ('fr', 'fr-fle'), ('fr', 'fr-volt')]}
TYPES = ['mc', 'mcw', 'choice', 'tiles', 'tilesRev', 'type', 'match', 'listen', 'listenTiles', 'dictee', 'speak', 'spot', 'build', 'hear', 'jamo', 'jamoRev', 'hg', 'photo', 'part2', 'conv', 'read', 'readw']
async def run(url):
    out = {}
    async with async_playwright() as pw:
        b = await pw.chromium.launch(); c = await b.new_context(viewport={'width': 390, 'height': 844}); await c.add_init_script(INIT)
        p = await c.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await p.route('https://**', lambda r: r.abort())
        await p.goto(url); await p.wait_for_timeout(300)
        for ui, secs in SECS.items():
            await p.evaluate(SETUP % ui); await p.reload(); await p.wait_for_timeout(700)
            for sec, cid in secs:
                await p.evaluate(f"closeModal();S.sec='{sec}';S.track['{sec}']='{cid}';save();")
                for h in ['parcours', 'entrainement', 'histoires', 'ligue', 'boutique', 'profil', 'stats']:
                    await p.evaluate(f"closeModal();location.hash='x';location.hash='{h}';route()"); await p.wait_for_timeout(120)
                    out[f'{ui}/{cid}/{h}'] = await p.evaluate("document.querySelector('#view').innerHTML+'|'+document.querySelector('#topbar').innerHTML")
                await p.evaluate(f"nodeSheet('{cid}',1,5)"); await p.wait_for_timeout(100)
                out[f'{ui}/{cid}/sheet'] = await p.evaluate("document.querySelector('#modal').innerHTML"); await p.evaluate("closeModal()")
                for n in [1, 5, 9, 17]:
                    await p.evaluate(f"if(L)closeLesson();closeModal();openSession({{mode:'lesson',cid:'{cid}',u:2,n:{n},exs:buildLesson('{cid}',2,{n})}})"); await p.wait_for_timeout(150)
                    out[f'{ui}/{cid}/lesson{n}'] = await p.evaluate("JSON.stringify((L&&L.exs||[]).map(e=>[e.t,e.answer,e.options]))+'|'+document.querySelector('#lesson').innerHTML")
                for t in TYPES:
                    r = await p.evaluate(f"(()=>{{try{{if(L)closeLesson();closeModal();const e=make('{t}',ctxFor('{cid}',COURSES['{cid}'].units.slice(0,4)));if(!e)return 'null';openSession({{mode:'train',cid:'{cid}',exs:[e]}});return JSON.stringify([e.t,e.answer,e.options]);}}catch(x){{return 'ERR '+x.message}}}})()")
                    await p.wait_for_timeout(60)
                    out[f'{ui}/{cid}/type-{t}'] = r + '|' + await p.evaluate("document.querySelector('#lesson').innerHTML")
                await p.evaluate("if(L)closeLesson();closeModal()")
            for m in ['accountPicker()', 'sectionPicker()', 'langPicker(()=>{})', "placeIntro(S.track[S.sec])", 'themePicker()', 'myWords()', 'bankView()']:
                try:
                    await p.evaluate(f"closeModal();{m}"); await p.wait_for_timeout(120)
                    out[f'{ui}/modal/{m}'] = await p.evaluate("document.querySelector('#modal').innerHTML")
                except Exception as e:
                    out[f'{ui}/modal/{m}'] = 'EXC ' + str(e)[:100]
        out['__errs'] = errs
        await b.close()
    return out
async def main():
    a, b = await asyncio.gather(run(A), run(B))
    diffs = [k for k in a if a.get(k) != b.get(k)]
    small = [k for k in a if len(str(a[k])) < 60]; print('vides/courts', len(small), small[:8], 'taille moyenne', sum(len(str(v)) for v in a.values())//len(a))
    print('écrans comparés', len(a), '| différences', len(diffs), '| erreurs A', a['__errs'][:3], '| erreurs B', b['__errs'][:3])
    for k in diffs[:6]:
        sa, sb = str(a.get(k)), str(b.get(k))
        i = next((i for i in range(min(len(sa), len(sb))) if sa[i] != sb[i]), min(len(sa), len(sb)))
        print('---', k, '\n  v25 :', sa[max(0, i - 120):i + 160], '\n  new :', sb[max(0, i - 120):i + 160])
asyncio.run(main())
