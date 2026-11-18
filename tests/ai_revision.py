import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
# Carte « Révision IA illimitée » (v38.2) : jamais de réserve (toujours des exercices nouveaux),
# difficulté réglée sur la réussite aux dernières révisions, exercices ratés repris dans la séance.
# Claude est simulé : chaque appel et chaque prompt sont relevés.
STUB = """()=>{window.__calls=0;window.__prompts=[];AI.mode='claude';AI.sample={json:async p=>{window.__calls++;window.__prompts.push(p);
  const U=COURSES['en-daily'].units;const n=window.__calls;
  return {p:[['Version '+n,'Version '+n],...U[0].p.slice(0,3),...U[1].p.slice(0,3)],c:U[0].c.slice(0,3),v:U[0].v.slice(0,4)}}}}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(); p.set_default_timeout(8000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en'}))")
    await p.reload(); await p.wait_for_timeout(600)
    prob=[]
    await p.evaluate("("+STUB+")()"); await p.evaluate("cacheClear()")
    U="COURSES['en-daily'].units.slice(0,8)"
    # 1) toujours une génération nouvelle : 4 révisions identiques = 4 appels, comme les autres cartes
    r=await p.evaluate(f"(async()=>{{for(let i=0;i<4;i++)await aiGenerate('en-daily',{U},null,'',{{rev:true}});const rev=window.__calls;for(let i=0;i<4;i++)await aiGenerate('en-daily',{U},null,'',null);return [rev,window.__calls-rev]}})()")
    print('révision : appels',r[0],'· étape IA classique : appels',r[1])
    if r[0]!=4: prob.append(f'révision IA mise en réserve ({r[0]} appels au lieu de 4)')
    if r[1]!=4: prob.append(f'autres cartes : {r[1]} appels au lieu de 4')
    # 2) niveau : sans séance terminée, pas de consigne ; puis plus difficile, à garder, plus simple
    r=await p.evaluate(f"""(async()=>{{const out=[];const ask=async()=>{{window.__prompts=[];await aiGenerate('en-daily',{U},null,'',{{rev:true}});const q=aiRequest('en-daily',{U},null,'',{{rev:true}});const t=window.__prompts[0]||'';return [q.perf||'',q.acc||0,/plus difficiles/.test(t),/plus simples/.test(t),/Garde exactement/.test(t)]}};
      S.revAcc={{}};out.push(await ask());
      [[19,20],[18,20],[20,20]].forEach(([o,n])=>revRecord('en-daily',o,n));out.push(await ask());
      [[14,20],[15,20],[14,20]].forEach(([o,n])=>revRecord('en-daily',o,n));out.push(await ask());
      [[8,20],[10,20],[9,20]].forEach(([o,n])=>revRecord('en-daily',o,n));out.push(await ask());
      revRecord('en-daily',2,3);out.push(S.revAcc['en-daily'].length);
      return out}})()""")
    print('niveau :',r)
    if r[0]!=['',0,False,False,False]: prob.append('consigne de niveau sans séance terminée '+str(r[0]))
    if r[1]!=['up',95,True,False,False]: prob.append('réussite 95 % : '+str(r[1]))
    if r[2]!=['keep',72,False,False,True]: prob.append('réussite 72 % : '+str(r[2]))
    if r[3]!=['down',45,False,True,False]: prob.append('réussite 45 % : '+str(r[3]))
    if r[4]!=5: prob.append(f'{r[4]} résultats gardés au lieu de 5 (séance de moins de 5 réponses comptée ?)')
    # 3) les exercices ratés pas encore réussis reviennent dans la séance, même s'ils ne sont pas encore « à revoir »
    r=await p.evaluate("""(async()=>{const C=COURSES['en-daily'];const ctx=ctxFor('en-daily',[C.units[0]]);const now=Date.now();
      const ex=[make('mc',ctx),make('type',ctx),make('choice',ctx)].filter(Boolean);
      S.mist['en-daily']=[Object.assign({},ex[0],{box:0,due:now+20*60000}),Object.assign({},ex[1],{box:2,due:now+3*864e5}),Object.assign({},ex[2],{box:1,due:now-1000})];
      const f=revFailed('en-daily').map(e=>exKey(e));
      await startAI('en-daily',unlockedUnits('en-daily'),{mode:'train',rev:true});
      const q=L?[L.ex,...L.q].filter(Boolean):[];const back=q.filter(e=>e._rev).map(e=>exKey(e));
      const res=[f.length,f.includes(exKey(ex[0])),f.includes(exKey(ex[1])),f.includes(exKey(ex[2])),back.length,!!(L&&L.rev),window.__calls];
      return res})()""")
    print('ratés :',r)
    if r[0]!=2 or not r[1] or r[2] or not r[3]: prob.append('exercices ratés repris : '+str(r[:4]))
    if r[4]!=2: prob.append(f'{r[4]} exercices ratés dans la séance au lieu de 2')
    if not r[5]: prob.append('séance sans repère de révision IA')
    # 4) fin de séance : son taux de réussite est enregistré pour régler la suivante
    r=await p.evaluate("(()=>{S.revAcc={};L.correct=9;L.wrong=1;finish();return S.revAcc['en-daily']||[]})()")
    print('fin de séance :',r)
    if len(r)!=1 or r[0].get('ok')!=9 or r[0].get('n')!=10: prob.append('fin de séance non enregistrée '+str(r))
    await p.evaluate("closeModal&&closeModal();if(L){closeLesson&&closeLesson()}")
    # 5) le niveau survit à un rechargement et à la fusion de deux appareils
    r=await p.evaluate("(()=>{save();const a=JSON.parse(JSON.stringify(S)),b=JSON.parse(JSON.stringify(S));b.revAcc={'en-daily':[{ts:1,ok:5,n:10}]};b.ts=(a.ts||0)+5;const m=mergeStates(a,b);return (m.revAcc['en-daily']||[]).length})()")
    if r!=2: prob.append(f'fusion de deux appareils : {r} résultats au lieu de 2')
    await p.reload(); await p.wait_for_timeout(600)
    r=await p.evaluate("(S.revAcc['en-daily']||[]).length")
    if r!=1: prob.append(f'niveau perdu au rechargement ({r})')
    print('PROBLEMES :',prob)
    print('erreurs JS :',errs); await b.close()
asyncio.run(main())
