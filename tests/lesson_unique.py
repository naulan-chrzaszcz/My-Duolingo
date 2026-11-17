import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
# v37 : chaque leçon d'un thème a son propre contenu.
# Pour chaque cours et chaque thème, construit plusieurs fois chacune de ses leçons (ronds « leçon » du parcours) et vérifie :
#  - aucune phrase, question, dictée, conversation ou texte du thème ne revient dans deux leçons différentes du thème
#    (seuls les mots des associations, les phrases générées et la révision venue d'un autre thème peuvent revenir) ;
#  - dans une leçon, un même élément sert au plus deux fois (une conversation ou un texte : une fois par question) ;
#  - une leçon reste courte, comme sur Duolingo : de 4 à 10 exercices.
import asyncio
from playwright.async_api import async_playwright

CHECK = r"""(cid)=>{const NODE=["L","L","L","L","ai","L","L","L","w","L","ai","L","L","L","w","L","ai","ck"];
const C=COURSES[cid];const bad=[];const B=m=>{if(bad.length<60)bad.push(m)};let nl=0,nx=0,lmin=99,lmax=0;
// identité de l'élément du cours derrière un exercice (null pour les mots, images et phrases générées)
const key=e=>{if(e._sub||e._rev||e.t==='match'||e.w||e.t==='pic'||e.t==='picw')return null;
 if(e.d)return 'cv:'+JSON.stringify(e.d);if(e.x)return 'rd:'+e.x;
 if(e.parts)return null; // plusieurs phrases à la suite : vérifiées une à une ci-dessous
 return e.t==='spot'?'q:'+e.q:(e.t==='dictee'||e.t==='listen'||e.t==='listenTiles')&&e.text?'p:'+e.text:'p:'+(e.prompt||e.tgtText||e.q||e.text||e.audio||'')};
const keys=e=>e.parts?e.parts.filter(x=>!x._sub).map(x=>'q:'+x.q):[key(e)].filter(Boolean);
for(let u=0;u<C.units.length;u++){const U=C.units[u];if(U.hg)continue;
 const owner=new Map(); // élément → première leçon du thème qui l'a utilisé
 for(let n=0;n<17;n++){if(NODE[n]!=='L')continue;
  for(let k=0;k<4;k++){const exs=buildLesson(cid,u,n).filter(e=>!e._rev);nl++;nx+=exs.length;
   lmin=Math.min(lmin,exs.length);lmax=Math.max(lmax,exs.length);
   if(exs.length<4||exs.length>10)B(U.t+' leçon '+n+' : '+exs.length+' exercices');
   const cnt=new Map();
   for(const e of exs){if(e._u!=null&&e._u!==u)continue; // révision venue d'un thème précédent
    for(const kk of keys(e)){cnt.set(kk,(cnt.get(kk)||0)+1);
     if(!owner.has(kk))owner.set(kk,n);else if(owner.get(kk)!==n)B(U.t+' : « '+kk.slice(0,70)+' » dans les leçons '+owner.get(kk)+' et '+n)}}
   for(const [kk,c] of cnt){const lim=/^(cv|rd):/.test(kk)?4:2;if(c>lim)B(U.t+' leçon '+n+' : « '+kk.slice(0,60)+' » '+c+' fois')}}}}
return {nl,nx,lmin,lmax,bad}}"""

async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(); p = await b.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:200]))
    problems = []
    for ui, cids in [('fr', ['en-daily', 'en-pro', 'en-toeic', 'fr-volt', 'ko']), ('en', ['fr-fle', 'ko']), ('ko', ['en-pro', 'fr-volt'])]:
      await p.goto(APP_URL); await p.wait_for_timeout(200)
      await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))")
      await p.reload(); await p.wait_for_timeout(500)
      for cid in cids:
        r = await p.evaluate(CHECK, cid)
        print(f'== {ui} {cid} : {r["nl"]} leçons construites, {r["nx"]} exercices, de {r["lmin"]} à {r["lmax"]} par leçon, anomalies {len(r["bad"])}')
        for x in r['bad'][:8]: print('   ', x)
        problems += [f'{ui} {cid} : {x}' for x in r['bad']]
    print('erreurs JS :', errs[:5])
    print('anomalies', len(problems))
    await b.close()
    sys.exit(1 if problems or errs else 0)

asyncio.run(main())
