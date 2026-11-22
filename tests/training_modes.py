import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,sys,json
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
ui=sys.argv[1]
TR={'fr':[('en','en-daily'),('en','en-toeic'),('fr','fr-volt'),('ko','ko')],'en':[('fr','fr-fle'),('fr','fr-volt'),('ko','ko')],'ko':[('en','en-pro'),('en','en-toeic'),('fr','fr-fle'),('fr','fr-volt')]}[ui]
async def story(p):
    for _ in range(80):
        if await p.evaluate("!L||L.state!=='story'"): break
        if await p.evaluate("(()=>{const q=[...document.querySelectorAll('.sq')].pop();const nb=document.querySelector('#snext');if(nb&&nb.disabled&&q){const st=L.story;const it=st.items[L.done-1];q.querySelector('.opt[data-k=\"'+it.a+'\"]').click();return 1}return 0})()"): await p.wait_for_timeout(60)
        await p.click('#snext'); await p.wait_for_timeout(50)
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.route('https://images.unsplash.com/**',lambda r:r.abort())
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6,gems:2000,xp:500}}))")
    await p.reload(); await p.wait_for_timeout(600)
    # tout débloquer + quelques erreurs enregistrées
    await p.evaluate("Object.keys(COURSES).forEach(c=>{S.dn[c]={};COURSES[c].units.forEach((U,u)=>S.dn[c][u]=262143)});save()")
    prob=[]
    for sec,trk in TR:
      await p.evaluate(f"if(L)closeLesson();closeModal();S.sec='{sec}';S.track['{sec}']='{trk}';save();location.hash='entrainement';route()"); await p.wait_for_timeout(300)
      # fabriquer des erreurs pour « Mes erreurs » et le coach
      await p.evaluate(f"(()=>{{const ctx=ctxFor('{trk}',COURSES['{trk}'].units.slice(0,3));['choice','type','mc','choice','tiles','choice'].forEach(t=>{{const e=make(t,ctx);if(e){{try{{addMistake(e);logError&&logError(e,'x')}}catch(x){{}}}}}});save()}})()")
      n=await p.evaluate("document.querySelectorAll('.tcard').length"); res=[]
      for i in range(n):
        # retour à l'onglet Entraînement : une carte peut mener ailleurs (sans IA, « Ouvrir Mon Claude »)
        await p.evaluate("if(L)closeLesson();closeModal();if(location.hash!=='#entrainement')location.hash='entrainement';route()"); await p.wait_for_timeout(120)
        title=await p.evaluate(f"document.querySelectorAll('.tcard')[{i}].querySelector('h3').textContent")
        try:
          await p.evaluate(f"document.querySelectorAll('.tcard')[{i}].click()"); await p.wait_for_timeout(400)
          # fenêtres intermédiaires (choix d'unité, de thème, lancement d'examen…)
          for _ in range(3):
            if await p.evaluate("!L&&!document.querySelector('#modal').classList.contains('hidden')"):
              clicked=await p.evaluate("(()=>{const m=document.querySelector('#modal');const b=m.querySelector('.urow:not(.lock),[data-th],[data-u],.choices button,.btn:not(.ghost)');if(b){b.click();return b.textContent.slice(0,30)}return null})()"); await p.wait_for_timeout(500)
            else: break
          mode=await p.evaluate("L?L.mode+':'+(L.q?L.q.length:0):null")
          if not mode:
            res.append(f"{title} → fenêtre «{await p.evaluate('(document.querySelector(chr0)||{}).textContent'.replace('chr0','\"#modal h2\"'))}»"); continue
          k=0; lim=25 if 'sprint' in (mode or '') or await p.evaluate("!!document.querySelector('#stimer,.timer')") else 70
          if await p.evaluate("L.state==='story'"): await story(p)
          else:
            while await solve(p):
              k+=1
              if k>=lim: break
          ended=await p.evaluate("!!document.querySelector('#endc')")
          while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
          res.append(f"{title} → {mode}, {k} ex., {'fin OK' if ended else 'interrompu'}")
          if not ended and k<lim and 'place' not in mode: prob.append(f"{trk}/{title}: s'arrête à {k}")
        except Exception as e:
          (None if 'sprint' in (await p.evaluate('L&&L.mode') or '') else prob.append(f"{trk}/{title}: {await p.evaluate('L&&L.ex&&L.ex.t')} {str(e)[:120]}")); res.append(title+' → ERREUR')
      print(f'[{ui}] {trk} entraînements ({n}) :'); [print('    ',r) for r in res]
      # test de niveau complet (toutes les bonnes réponses → niveau Expert)
      try:
        await p.evaluate(f"if(L)closeLesson();closeModal();S.place={{}};placeIntro('{trk}')"); await p.wait_for_timeout(200); await p.click('#pgo'); await p.wait_for_timeout(300); k=0
        for _ in range(12):
          while await solve(p):
            k+=1
            if k>60: break
          await p.wait_for_timeout(300)
          nxt=await p.evaluate("(()=>{const m=document.querySelector('#modal');if(m.classList.contains('hidden'))return null;const b=m.querySelector('.btn:not(.ghost)');if(b){const t=b.textContent;b.click();return t}return null})()")
          await p.wait_for_timeout(300)
          if not await p.evaluate("!!L"): break
        print(f'    test de niveau : {k} questions → place={await p.evaluate("JSON.stringify(S.place)")} | conseillée {await p.evaluate(f"JSON.stringify(nextStep(chr0))".replace("chr0",chr(39)+trk+chr(39)))}')
      except Exception as e: prob.append(f"{trk}/test de niveau: {str(e)[:150]}")
      await p.evaluate("if(L)closeLesson();closeModal()")
      # version extrême d'une étape
      try:
        await p.evaluate(f"(()=>{{const C=COURSES['{trk}'];const u=C.units.findIndex(U=>!U.hg);const exs=buildLesson('{trk}',u,3,true);openSession({{mode:'lesson',cid:'{trk}',u,n:3,ext:true,exs}})}})()"); k=0
        while await solve(p):
          k+=1
          if k>60: break
        e=await p.evaluate("!!document.querySelector('#endc')")
        while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
        cr=await p.evaluate("JSON.stringify(S.ext)");print(f'    version extrême : {k} ex., {"fin OK" if e else "interrompue"} | couronnes {cr[:60]}')
      except Exception as e: prob.append(f"{trk}/extrême: {await p.evaluate('L&&L.ex&&L.ex.t')} {str(e)[:150]}")
      await p.evaluate("if(L)closeLesson();closeModal()")
      # toutes les histoires de la section
      try:
        ids=await p.evaluate(f"allStories('{sec}').map(s=>s.id)"); okc=0
        for sid in ids:
          await p.evaluate(f"if(L)closeLesson();closeModal();playStory('{sec}',allStories('{sec}').find(s=>s.id==='{sid}'))"); await p.wait_for_timeout(60); await story(p)
          if await p.evaluate("!!document.querySelector('#endc')"): okc+=1
          else: prob.append(f"histoire {sec}/{sid} non terminée")
          while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
        print(f'    histoires {sec} : {okc}/{len(ids)} terminées')
      except Exception as e: prob.append(f"{trk}/histoires: {str(e)[:150]}")
    # boutique, profil, export / import
    await p.evaluate("if(L)closeLesson();closeModal();location.hash='boutique';route()"); await p.wait_for_timeout(300)
    g0=await p.evaluate("S.gems"); nb=await p.evaluate("(()=>{let n=0;for(let i=0;i<12;i++){const b=[...document.querySelectorAll('#view button')].find(x=>/\\d+\\s*💎/.test(x.textContent)&&!x.disabled);if(!b)break;b.click();n++;closeModal&&0}return n})()"); await p.wait_for_timeout(300)
    print(f'[{ui}] boutique : {nb} achats, gemmes {g0} → {await p.evaluate("S.gems")}, tenues {await p.evaluate("JSON.stringify(S.owned)")}, gels {await p.evaluate("S.freeze")}')
    await p.evaluate("closeModal();exportAcc()"); await p.wait_for_timeout(300); code=await p.evaluate("(document.querySelector('#modal textarea')||{}).value")
    await p.evaluate("closeModal();importAcc()"); await p.wait_for_timeout(200)
    try:
      await p.fill('#modal textarea',code or ''); await p.evaluate("document.querySelector('#modal .btn:not(.ghost)').click()"); await p.wait_for_timeout(500)
      print(f'    export ({len(code or "")} car.) → import : comptes {await p.evaluate("ACC.list.length")}, XP du compte importé {await p.evaluate("S.xp")}')
    except Exception as e: prob.append('export/import: '+str(e)[:120])
    for v in ['parcours','histoires','ligue','profil','stats']:
      await p.evaluate(f"closeModal();location.hash='{v}';route()"); await p.wait_for_timeout(250)
    print(f'[{ui}] PROBLEMES :',prob); print(f'[{ui}] erreurs JS :',errs[:6]); await b.close()
asyncio.run(main())
