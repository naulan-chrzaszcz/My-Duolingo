import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":933,"height":900}); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en',dn:{'en-daily':{0:262143,1:262143,2:262143},'en-toeic':{0:262143,1:262143,2:262143,3:262143}}}))")
    await p.reload(); await p.wait_for_timeout(600)
    for js in ["openSession({mode:'train',cid:'en-daily',exs:[1,2,3].map(()=>({t:'dictee',lang:'en-US',answer:'It is a ten-minute walk.',audio:'It is a ten-minute walk.',alts:[]}))})","openSession({mode:'train',cid:'en-daily',exs:[{t:'listen',lang:'en-US',answer:'Hello there.',audio:'Hello there.',alts:[]}]})","trainDictation('en-daily')","trainListen(['en-toeic','en-daily','en-pro'])","trainMock()","trainDictee&&trainDictee('en-daily')","openSession({mode:'lesson',cid:'en-daily',u:1,n:9,exs:buildLesson('en-daily',1,9)})","openSession({mode:'lesson',cid:'en-toeic',u:3,n:9,exs:buildLesson('en-toeic',3,9)})"]:
      await p.evaluate("S.listenOff=0;if(L){L=null;document.querySelector('#lesson').classList.add('hidden')}closeModal()"); await p.evaluate(js); await p.wait_for_timeout(300)
      for i in range(25):
        if await p.evaluate("!L||isAudioEx(L.ex)"): break
        await p.evaluate("L.q.length?nextEx():0")
      if not await p.evaluate("!!L&&isAudioEx(L.ex)"): print(js[:40],'pas d exercice audio'); continue
      a=await p.evaluate("[L.mode,L.ex.t,!!L.ex.prompt,L.q.length,L.total,document.querySelector('.ltitle').textContent]")
      await p.click('#skip'); await p.wait_for_timeout(400)
      bb=await p.evaluate("L?[L.mode,L.ex&&L.ex.t,L.q.length,L.total,(document.querySelector('.ltitle')||{}).textContent,!!document.querySelector('#endc')]:'session fermée'")
      print(js[:40],'|',a,'→',bb)
    print(errs); await b.close()
asyncio.run(main())
