import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
MOCK=open(os.path.join(TESTS, 'android.py')).read().split('MOCK=r"""')[1].split('"""')[0]
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); c=await b.new_context(**pw.devices['iPhone 13']); await c.add_init_script(MOCK); p=await c.new_page(); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    seed="localStorage.clear();localStorage.setItem('speakeasy-ui','%s');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'%s',dn:{'en-daily':{0:262143,1:262143},'en-toeic':{0:262143,1:262143,2:262143,3:262143},'ko':{0:262143,1:262143,2:262143,3:262143,4:262143,5:262143}}}))"
    await p.evaluate(seed%('fr','en')); await p.reload(); await p.wait_for_timeout(600)
    # 1. « Plus tard » pendant un entraînement de prononciation (que des exercices de micro)
    await p.evaluate("trainSpeak(['en-daily'])"); await p.wait_for_timeout(300)
    q0=await p.evaluate("[L.ex.t,L.ex.answer,L.q.map(e=>e.t).join(','),L.total]"); await p.click('#skip'); await p.wait_for_timeout(300)
    q1=await p.evaluate("[L.ex.t,L.ex.answer,L.q.map(e=>e.t).join(','),L.total,document.querySelector('.ltitle').textContent,document.querySelector('#skip').textContent]")
    print('1. micro « Plus tard » :',q0,'→',q1); k=0
    while await solve(p):
      k+=1
      if k>30: break
    print('   séance terminée sans micro :',k,'exercices, fin',await p.evaluate("!!document.querySelector('#endc')"))
    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    # 2. leçon : « Pas de son » sur un exercice d'écoute
    await p.evaluate("S.speakOff=0;S.listenOff=0;const exs=buildLesson('en-daily',1,5);openSession({mode:'lesson',cid:'en-daily',u:1,n:5,exs})"); await p.wait_for_timeout(200)
    for i in range(20):
      if await p.evaluate("isAudioEx(L.ex)"): break
      if not await solve(p): break
    q0=await p.evaluate("[L.ex.t,document.querySelector('#skip').textContent,L.q.map(e=>e.t).join(','),L.total,L.wrong]"); await p.click('#skip'); await p.wait_for_timeout(300)
    q1=await p.evaluate("[L.ex.t,document.querySelector('#skip').textContent,L.q.map(e=>e.t).join(','),L.total,L.wrong]"); print('2. écoute « Pas de son » :',q0,'→',q1); k=0
    while await solve(p):
      k+=1
      if k>30: break
    print('   leçon terminée :',await p.evaluate("!!document.querySelector('#endc')"),'| erreurs comptées',await p.evaluate("L?L.wrong:'-'"))
    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    print('   leçon suivante pendant la pause :',await p.evaluate("[...new Set(buildLesson('en-daily',1,6).map(e=>e.t))].join(',')"),'| TOEIC :',await p.evaluate("[...new Set([4,8,12].flatMap(n=>buildLesson('en-toeic',3,n).map(e=>e.t)))].join(',')"))
    await p.evaluate("location.hash='reglages/preferences';route()"); await p.wait_for_timeout(300); print('   réglage écoute :',await p.evaluate("document.querySelector('#sListen').classList.contains('on')"),'→ clic →',await p.evaluate("(document.querySelector('#sListen').click(),[document.querySelector('#sListen').classList.contains('on'),S.listenOff])"))
    await p.evaluate("trainListen(['en-toeic'])"); await p.wait_for_timeout(200); print('   « Écoute TOEIC » relance le son :',await p.evaluate("[S.listenOff,L.ex.t]")); await p.evaluate("closeLesson()")
    # 3. voix
    print('3. voix :',await p.evaluate("JSON.stringify([speakParts('I','en-US'),speakParts('I am Léa.','en-US'),speakParts('À quelqu\\'un qui reste, en partant : 안녕히 계세요','ko-KR'),speakParts('K-pop 좋아해요','ko-KR'),speakParts('안녕하세요','ko-KR')])"))
    await p.evaluate("window.__tts.length=0;say('À quelqu\\'un qui reste : 안녕히 계세요','ko-KR')"); await p.wait_for_timeout(500); print('   parlé :',await p.evaluate("window.__tts"))
    await p.evaluate(seed%('en','fr')); await p.reload(); await p.wait_for_timeout(600)
    await p.evaluate("(()=>{const C=COURSES['fr-fle'];const ctx=ctxFor('fr-fle',[C.units[0]]);openSession({mode:'train',cid:'fr-fle',exs:[make('tilesRev',ctx),make('tiles',ctx)]})})()"); await p.wait_for_timeout(300)
    await p.evaluate("window.__tts.length=0;document.querySelector('.tile').click()"); await p.wait_for_timeout(300); print('   étiquette anglaise (interface EN, cours de français) :',await p.evaluate("window.__tts.filter(x=>x.startsWith('speak'))"))
    print('erreurs JS',errs); await b.close()
asyncio.run(main())
