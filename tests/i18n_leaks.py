import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,sys,re
from playwright.async_api import async_playwright
ui=sys.argv[1]
SECS={'en':[('fr','fr-fle'),('fr','fr-volt'),('ko','ko')],'ko':[('en','en-daily'),('en','en-pro'),('en','en-toeic'),('fr','fr-fle'),('fr','fr-volt')]}[ui]
JS=r"""()=>{const out=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
const FR=/\b(le|la|les|des|une|un|et|ou|pour|avec|dans|sur|tes|ton|ta|tu|est|sont|à|ça|mot|mots|phrase|écoute|leçon|unité|réponds|lis|choisis|chapitre|unités|jours?|histoires|erreurs|gagne)\b|[éèêàùçâîô]/i;
// contenu des cours dans la langue enseignée (titres d'unités et d'histoires) : ce n'est pas de l'interface
// les titres des unités affichées citent souvent les mots étudiés (« a / à », « café ») ; leur traduction est vérifiée par unit_parts
const OK=new Set();for(const c in COURSES)COURSES[c].units.forEach(U=>{OK.add(U.t);OK.add(U.d);(U.parts||[]).forEach(P=>OK.add(P.t))});for(const k in STORIES)STORIES[k].forEach(st=>OK.add(st.t));
while((n=w.nextNode())){const t=n.nodeValue.trim();if(t.length<4)continue;const p=n.parentElement;if(!p||p.closest('[lang]:not(html),.notr,script,style,.tile,.opt,.sline,.ftxt .ans,.prompt,.bubble,.wd,.spotw,.sq'))continue;
 const r=p.getBoundingClientRect();if(!r.width||OK.has(t))continue;if(FR.test(t)&&!/[가-힣]/.test(t))out.add(t.slice(0,90))}return [...out]}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={'width':390,'height':844}); errs=[]
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))")
    await p.reload(); await p.wait_for_timeout(600)
    leaks={}
    for sec,trk in SECS:
      await p.evaluate(f"S.sec='{sec}';S.track['{sec}']='{trk}';save()")
      for h in ['parcours','entrainement','histoires','ligue','boutique','profil','stats','reglages','reglages/preferences','reglages/compte','reglages/notifications','reglages/claude','chapitres','quetes']:
        await p.evaluate(f"closeModal();location.hash='x';location.hash='{h}';route()"); await p.wait_for_timeout(250)
        for t in await p.evaluate(JS): leaks.setdefault(t,set()).add(f'{trk}/{h}')
      # fenêtres principales
      for label,js in [('serie','openStreak()'),('langues','sectionPicker()'),('etape',"nodeSheet(curCid(),0,0)"),('horang','askOpen()')]:
        await p.evaluate("closeModal();location.hash='parcours';route()"); await p.wait_for_timeout(150)
        await p.evaluate(js); await p.wait_for_timeout(300)
        for t in await p.evaluate(JS): leaks.setdefault(t,set()).add(f'{trk}/{label}')
        await p.evaluate("closeModal()")
    for t,w in sorted(leaks.items()): print(repr(t),sorted(w)[:3])
    # un texte d'interface resté en français fait échouer le test
    print('PROBLEMES :',sorted(leaks))
    await b.close()
asyncio.run(main())
