import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":1034,"height":700}); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e.stack)[:500]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en',bank:{en:[{id:'w1',w:'Test',tr:'test',added:1,box:0,due:0},{id:'w2',w:'deadline',tr:'',added:1,box:0,due:0},{id:'w3',w:'suitcase',tr:'valise',ex:'My suitcase is heavy.',exTr:'Ma valise est lourde.',added:1,box:0,due:0},{id:'w4',w:'to look forward to',tr:'avoir hâte de',added:1,box:0,due:0}]}}))")
    await p.reload(); await p.wait_for_timeout(600)
    await p.evaluate("bankSession('en')"); await p.wait_for_timeout(300)
    for _ in range(3):
      await p.evaluate("if(L){L=null;document.querySelector('#lesson').classList.add('hidden')};bankSession('en')")
      print('QCM :',await p.evaluate("[L.ex,...L.q].filter(e=>e.t==='mc').map(e=>e.prompt+' → '+e.options.join(' | '))"))
    await p.evaluate("if(L){L=null;document.querySelector('#lesson').classList.add('hidden')};bankSession('en')")
    print('file :',await p.evaluate("[L.ex.t,...L.q.map(e=>e.t)].join(',')"))
    for i in range(12):
      if not await p.evaluate("!!L&&L.state==='answer'"): break
      s=await p.evaluate("[L.ex.t,(document.querySelector('.ltitle')||{}).textContent,(document.querySelector('#skip')||{}).textContent,L.q.length]")
      await p.click('#skip'); await p.wait_for_timeout(300)
      if await p.evaluate("!!L&&L.state==='feedback'"): await p.click('#cont'); await p.wait_for_timeout(200)
      print(s,'→',await p.evaluate("L?[L.ex&&L.ex.t,L.state,L.q.length,(document.querySelector('.ltitle')||{}).textContent]:'fermé'"),'| fin',await p.evaluate("!!document.querySelector('#endc')"))
    print('QCM :',await p.evaluate("[]"));print(errs); await b.close()
asyncio.run(main())
