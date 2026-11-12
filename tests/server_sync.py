import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,json
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
U=SITE+''
async def shot(p,n): await p.screenshot(path=f'{OUT}/h_{n}.png')
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(args=['--no-proxy-server'])
    # ---------- appareil 1 : première ouverture, création d'un compte en ligne ----------
    c1=await b.new_context(**pw.devices['iPhone 13'],locale='fr-FR'); p=await c1.new_page(); p.set_default_timeout(6000); errs=[]; p.on('pageerror',lambda e:errs.append('A1 '+str(e)[:200])); cons=[]; p.on('console',lambda m:cons.append(m.text[:160]) if m.type=='error' else None)
    await p.goto(U); await p.wait_for_timeout(1500)
    print('1. viewport',await p.evaluate("[innerWidth,document.documentElement.scrollWidth]"),'| sélecteur de langue',await p.evaluate("!!document.querySelector('.langpick')"),'| serveur détecté',await p.evaluate("SRV.ok"))
    await p.click('.langpick [data-l="fr"]'); await p.wait_for_timeout(600)
    print('   formulaire :',await p.evaluate("(document.querySelector('#modal h2')||{}).textContent"),'| champ mot de passe',await p.evaluate("!!document.querySelector('#fpw')"))
    await p.fill('#fn','TestLea'); await p.fill('#fpw','secret12'); await p.click('#fok'); await p.wait_for_timeout(1500)
    print('   après création :',await p.evaluate("[(curAcc()||{}).name,!!(curAcc()||{}).srv,(document.querySelector('#modal h2')||{}).textContent,(document.querySelector('#ferr')||{}).textContent]"))
    # onboarding
    for _ in range(6):
      h=await p.evaluate("document.querySelector('#modal').classList.contains('hidden')")
      if h: break
      await p.evaluate("(()=>{const m=document.querySelector('#modal');const b=m.querySelector('[data-s],[data-g],[data-p],#n1,#n2,.btn');b&&b.click()})()"); await p.wait_for_timeout(500)
    print('   onboarding terminé :',await p.evaluate("[S.onb,S.sec,document.querySelector('#modal').classList.contains('hidden')]"))
    await p.evaluate("closeModal();if(L)closeLesson()")
    # une leçon complète
    await p.evaluate("openSession({mode:'lesson',cid:'en-daily',u:0,n:0,exs:buildLesson('en-daily',0,0)})"); k=0
    while await solve(p):
      k+=1
      if k>40: break
    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    await p.wait_for_timeout(2500)
    xp=await p.evaluate("S.xp"); print('2. leçon jouée :',k,'étapes | XP',xp,'| étapes faites',await p.evaluate("doneCount('en-daily')"),'| sync en attente',await p.evaluate("!!S._pend||!!SRV.pending"))
    sw=await p.evaluate("navigator.serviceWorker?navigator.serviceWorker.getRegistrations().then(r=>r.length):-1"); print('   service worker enregistré :',sw)
    # hors ligne : rechargement + leçon + resynchronisation
    await p.wait_for_timeout(1500); await c1.set_offline(True)
    try:
      await p.reload(); await p.wait_for_timeout(1500); print('3. hors ligne, rechargement :',await p.evaluate("[typeof COURSES,(curAcc()||{}).name,S.xp]"))
    except Exception as e: print('3. hors ligne : rechargement impossible',str(e)[:100])
    await p.evaluate("closeModal();openSession({mode:'lesson',cid:'en-daily',u:0,n:1,exs:buildLesson('en-daily',0,1)})"); k=0
    while await solve(p):
      k+=1
      if k>40: break
    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    xp2=await p.evaluate("S.xp"); print('   leçon hors ligne :',k,'étapes | XP',xp2,'| bandeau',await p.evaluate("(document.querySelector('#netbar')||{}).textContent"))
    await c1.set_offline(False); await p.evaluate("window.dispatchEvent(new Event('online'))"); await p.wait_for_timeout(3500)
    print('   retour en ligne : bandeau',repr(await p.evaluate("(document.querySelector('#netbar')||{className:''}).className")))
    # ---------- appareil 2 : connexion au même compte ----------
    c2=await b.new_context(**pw.devices['Pixel 7'],locale='fr-FR',color_scheme='dark'); q=await c2.new_page(); q.set_default_timeout(6000); q.on('pageerror',lambda e:errs.append('A2 '+str(e)[:200]))
    await q.goto(U); await q.wait_for_timeout(1500); await q.click('.langpick [data-l="fr"]'); await q.wait_for_timeout(500)
    await q.click('#flogin'); await q.wait_for_timeout(800)
    await q.fill('#ln','testlea'); await q.fill('#lp','mauvais'); await q.click('#lok'); await q.wait_for_timeout(900); print('4. mauvais mot de passe →',await q.evaluate("(document.querySelector('#lerr')||{}).textContent"))
    await q.fill('#lp','secret12'); await q.click('#lok'); await q.wait_for_timeout(2000)
    print('   connexion appareil 2 :',await q.evaluate("[(curAcc()||{}).name,S.xp,doneCount('en-daily'),S.onb]"),'(attendu XP',xp2,')')
    await q.evaluate("closeModal()"); await q.evaluate("location.hash='ligue'"); await q.wait_for_timeout(1500); print('   classement :',(await q.evaluate("(document.querySelector('.board,.lb,#app')||{}).innerText"))[:0],await q.evaluate("[...document.querySelectorAll('.lrow,.brow')].map(x=>x.innerText.replace(/\\n/g,' ')).slice(0,3)"))
    await shot(q,'ligue_dark')
    # progression sur appareil 2 → retour sur appareil 1
    await q.evaluate("openSession({mode:'lesson',cid:'en-daily',u:0,n:2,exs:buildLesson('en-daily',0,2)})"); k=0
    while await solve(q):
      k+=1
      if k>40: break
    while await q.evaluate("!!document.querySelector('#endc')"): await q.click('#endc')
    await q.wait_for_timeout(2500); xp3=await q.evaluate("S.xp")
    await p.reload(); await p.wait_for_timeout(2500); print('5. appareil 1 après progression sur appareil 2 : XP',await p.evaluate("S.xp"),'(attendu',xp3,') étapes',await p.evaluate("doneCount('en-daily')"))
    # doublon de pseudo
    c3=await b.new_context(); r=await c3.new_page(); await r.goto(U); await r.wait_for_timeout(1200); await r.click('.langpick [data-l="en"]'); await r.wait_for_timeout(1500)
    print('6. appareil 3 en anglais :',await r.evaluate("[UI,(document.querySelector('#modal h2')||{}).textContent]"))
    await r.fill('#fn','TESTLEA'); await r.fill('#fpw','autre123'); await r.click('#fok'); await r.wait_for_timeout(1200); print('   pseudo déjà pris →',await r.evaluate("(document.querySelector('#ferr')||{}).textContent"))
    await r.fill('#fn','민지'); await r.fill('#fpw','123'); await r.click('#fok'); await r.wait_for_timeout(900); print('   mot de passe trop court →',await r.evaluate("(document.querySelector('#ferr')||{}).textContent"))
    await r.fill('#fpw','비밀번호123'); await r.click('#fok'); await r.wait_for_timeout(1500); print('   compte « 민지 » créé :',await r.evaluate("[(curAcc()||{}).name,!!(curAcc()||{}).srv]"))
    print('erreurs JS',errs,'| console',[x for x in cons if 'favicon' not in x][:5]); await b.close()
asyncio.run(main())
