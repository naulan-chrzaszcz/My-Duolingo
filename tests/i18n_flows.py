# Textes d'interface restés en français dans les parcours que i18n_leaks ne visite pas :
# toutes les quêtes possibles, les écrans de fin de séance, « Mes mots », l'accueil et le test de niveau.
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL
import asyncio
from playwright.async_api import async_playwright
ui=sys.argv[1]
SEC={'en':('fr','fr-fle'),'ko':('en','en-daily')}[ui]
JS=r"""()=>{const out=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
const FR=/\b(le|la|les|des|une|un|et|ou|pour|avec|dans|sur|tes|ton|ta|tu|est|sont|à|ça|mot|mots|phrase|écoute|leçon|unité|réponds|lis|choisis|chapitre|unités|jours?|histoires|erreurs|gagne|termine|objectif|niveau|bonne)\b|[éèêàùçâîô]/i;
const OK=new Set();for(const c in COURSES)COURSES[c].units.forEach(U=>{OK.add(U.t);OK.add(U.d)});for(const k in STORIES)STORIES[k].forEach(st=>OK.add(st.t));
while((n=w.nextNode())){const t=n.nodeValue.trim();if(t.length<4)continue;const p=n.parentElement;if(!p||p.closest('[lang]:not(html),.notr,script,style,.tile,.opt,.sline,.ftxt .ans,.prompt,.bubble,.wd,.spotw,.sq'))continue;
 const r=p.getBoundingClientRect();if(!r.width||OK.has(t))continue;if(FR.test(t)&&!/[가-힣]/.test(t))out.add(t.slice(0,90))}return [...out]}"""
# pendant une leçon, le contenu du cours peut être en français (FLE, Voltaire) : on ne regarde que l'habillage
JS2=r"""()=>{const out=new Set();const FR=/(^|[^a-zà-ÿ])(verbe|marque|indique|phrase|avant|après|devant|terminaison|accordé|projet|fautes?|fautif|touche|trouve|règle|mots|astuce|savoir|réponse|continuer|correcte|clique)([^a-zà-ÿ]|$)/i;
document.querySelectorAll('.ltitle,.micnote,.fxh,.fxai,.fxw,.fx li,.lfoot h3,#cont,.nofault').forEach(el=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;
 while((n=w.nextNode())){const t=n.nodeValue.trim();if(t.length<4||n.parentElement.closest('.notr,[lang]:not(html)'))continue;if(FR.test(t)&&!/[가-힣]/.test(t))out.add(t.slice(0,90))}});return [...out]}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={'width':390,'height':844}); errs=[]
    p.on('pageerror',lambda e:errs.append(str(e)[:160]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-onb:a1','1')")
    await p.reload(); await p.wait_for_timeout(600)
    await p.evaluate(f"S.sec='{SEC[0]}';S.track['{SEC[0]}']='{SEC[1]}';save()")
    leaks={}
    async def grab(where,js=JS):
      await p.wait_for_timeout(250 if js is JS else 120)
      for t in await p.evaluate(js): leaks.setdefault(t,set()).add(where)
    # 1. toutes les quêtes du tirage, trois par trois
    ids=await p.evaluate("QUEST_POOL.map(q=>q.id)")
    while len(ids)%3: ids.append(ids[0])
    for i in range(0,len(ids),3):
      await p.evaluate(f"S.q.ids={ids[i:i+3]!r};S.q.claimed=[];location.hash='x';location.hash='quetes';route()"); await grab('quetes')
    # 2. écrans de fin : leçon parfaite (récompenses, série), entraînement raté, sprint, histoire, version extrême
    cid=SEC[1]
    for label,setup in [
      ('fin parfaite',"S.qm={m:new Date().toISOString().slice(0,7),pts:9,got:[],v:2};S.q.ids=['l2','c8','s4'];S.q.l=1;S.q.claimed=[];L.correct=L.q.length;L.wrong=0;L.maxCombo=15;L.listenOk=8"),
      ('fin moyenne',"L.mode='train';L.correct=6;L.wrong=4;L.maxCombo=3"),
      ('fin difficile',"L.mode='train';L.correct=2;L.wrong=8"),
      ('fin sprint',"L.mode='sprint';L.correct=9;L.wrong=1"),
      ('fin histoire',"L.mode='story';L.story=STORIES[Object.keys(STORIES)[0]][0];L.correct=5;L.wrong=1"),
      ('fin extreme',"L.ext=true;L.correct=L.q.length;L.wrong=1"),
    ]:
      await p.evaluate(f"closeModal();openSession({{mode:'lesson',cid:'{cid}',u:0,n:0,exs:buildLesson('{cid}',0,0)}})"); await p.wait_for_timeout(200)
      await p.evaluate(setup+";finish()")
      for k in range(6):
        await grab(label)
        if not await p.evaluate("!!document.querySelector('#endc')"): break
        await p.evaluate("document.querySelector('#endc').click()"); await p.wait_for_timeout(150)
      await p.evaluate("try{closeLesson()}catch(e){}")
    # 2 bis. consignes des exercices et bloc « À savoir » après la réponse (v33), sur trois cours
    for c3 in {'en':['fr-fle','ko','fr-volt'],'ko':['en-daily','fr-fle','en-toeic']}[ui]:
      for (uu,nn) in [(1,6),(2,12)]:
        await p.evaluate(f"closeModal();openSession({{mode:'lesson',cid:'{c3}',u:{uu},n:{nn},exs:buildLesson('{c3}',{uu},{nn})}})"); await p.wait_for_timeout(200)
        for k in range(12):
          if not await p.evaluate("!!(L&&L.state==='answer')"): break
          await grab(f'consigne {c3}',JS2)
          await p.evaluate("check(true)"); await grab(f'a savoir {c3}',JS2)
          if not await p.evaluate("!!document.querySelector('#cont')"): break
          await p.evaluate("document.querySelector('#cont').click()"); await p.wait_for_timeout(120)
        await p.evaluate("try{closeLesson()}catch(e){}")
    # 3. fenêtres : mes mots, test de niveau, accueil
    for label,js in [('mots',"S.bank=S.bank||{};bankView()"),('test',"placeIntro&&placeIntro(curCid())"),('accueil',"onboarding()")]:
      try:
        await p.evaluate("closeModal();location.hash='parcours';route()"); await p.evaluate(js); await grab(label)
        for k in range(4):
          if not await p.evaluate("!!document.querySelector('#modal .choices button')"): break
          await p.evaluate("document.querySelector('#modal .choices button').click()"); await grab(label)
      except Exception as e: print('(',label,'non visité :',str(e)[:80],')')
    for t,w in sorted(leaks.items()): print(repr(t),sorted(w)[:3])
    print('erreurs JS :',errs)
    print('PROBLEMES :',sorted(leaks))
    await b.close()
asyncio.run(main())
