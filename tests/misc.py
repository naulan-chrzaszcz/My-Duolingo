import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    seed="localStorage.clear();localStorage.setItem('speakeasy-ui','%s');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'%s',dn:{'en-daily':{0:262143,1:262143},'fr-fle':{0:262143},'ko':{0:262143,1:262143,2:262143,3:262143,4:262143}}}))"
    # 1. changement de langue alors que la section mémorisée n'existe pas dans la nouvelle langue
    for ui,sec in [('ko','ko'),('en','en'),('fr','fr'),('ko','fr'),('en','ko')]:
      await p.evaluate(seed%(ui,sec)); await p.reload(); await p.wait_for_timeout(600)
      print(f'1. interface {ui}, section mémorisée «{sec}» →',await p.evaluate("[curSec().id,curCid(),document.querySelectorAll('.unit,.ucard,.node').length>0,(document.querySelector('.chip')||{}).textContent]"))
    # 2. erreurs réelles → « Mes erreurs », coach, statistiques
    await p.evaluate(seed%('fr','en')); await p.reload(); await p.wait_for_timeout(600)
    await p.evaluate("openSession({mode:'lesson',cid:'en-daily',u:1,n:4,exs:buildLesson('en-daily',1,4)})")
    for i in range(40):
      st=await p.evaluate("L&&L.state")
      if not st: break
      if st=='answer' and i<10 and await p.evaluate("!!document.querySelector('#skip')"):
        await p.click('#skip'); await p.wait_for_timeout(100); await p.click('#cont'); continue
      if not await solve(p): break
    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    print('2. erreurs enregistrées :',await p.evaluate("[(S.mist||S.mistakes||[]).length,Object.keys(S.elog||{}).length,S.hearts]"))
    await p.evaluate("closeModal();location.hash='entrainement';route()"); await p.wait_for_timeout(300)
    for name in ['Mes erreurs','Sprint','Mes mots','Entraînement à thème','Révision IA']:
      await p.evaluate("if(L)closeLesson();closeModal();route()"); await p.wait_for_timeout(150)
      await p.evaluate(f"[...document.querySelectorAll('.tcard')].find(c=>c.querySelector('h3').textContent.startsWith('{name}')).click()"); await p.wait_for_timeout(600)
      info=await p.evaluate("[L?L.mode:null,L&&L.q?L.q.length:0,document.querySelector('#modal').classList.contains('hidden')?null:(document.querySelector('#modal h2,#modal h3')||{}).textContent,[...document.querySelectorAll('.toast')].map(t=>t.textContent).slice(-1)[0]]")
      if name=='Sprint':
        k=0
        for _ in range(12):
          t=await p.evaluate("L&&L.ex&&L.ex.t"); 
          if t in('mc','choice'):
            idx=await p.evaluate("L.ex.options.indexOf(L.ex.answer)"); await p.click(f'.opt[data-i="{idx}"]'); k+=1; await p.wait_for_timeout(700)
          else: break
        info.append(f'{k} réponses, score {await p.evaluate("L&&(L.correct)")}, minuteur {await p.evaluate("(document.querySelector(\"#lstat,.lstat\")||{}).textContent")}')
      elif name=='Entraînement à thème':
        await p.evaluate("(()=>{const b=document.querySelector('#modal [data-th],#modal .chipbtn,#modal .choices button');b&&b.click()})()"); await p.wait_for_timeout(300)
        await p.evaluate("(()=>{const b=[...document.querySelectorAll('#modal .btn')].find(x=>!x.classList.contains('ghost'));b&&b.click()})()"); await p.wait_for_timeout(1500)
        info.append(await p.evaluate("[L?L.mode:null,L&&L.q?L.q.length:0,[...document.querySelectorAll('.toast')].map(t=>t.textContent).slice(-1)[0]]"))
      elif await p.evaluate("!!L"):
        k=0
        while await solve(p):
          k+=1
          if k>40: break
        info.append(f'{k} ex. joués, fin {await p.evaluate("!!document.querySelector(\"#endc\")")}')
        while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
      print('  ',name,'→',info)
    # 3. ajout d'un mot perso + séance
    await p.evaluate("if(L)closeLesson();closeModal();bankView()"); await p.wait_for_timeout(300)
    print('3. Mes mots à retenir : champs',await p.evaluate("[...document.querySelectorAll('#modal input,#modal textarea')].map(i=>i.id+':'+i.placeholder)"))
    print('erreurs JS',errs); await b.close()
asyncio.run(main())
