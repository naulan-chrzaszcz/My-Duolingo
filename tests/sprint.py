import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":390,"height":844}); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    for ui,sec in [('fr','en'),('ko','fr')]:
      await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','%s');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'%s',dn:{'en-daily':{0:262143,1:262143},'fr-fle':{0:262143,1:262143}}}))"%(ui,sec)); await p.reload(); await p.wait_for_timeout(600)
      await p.evaluate("trainSprint()"); await p.wait_for_timeout(400); k=0
      for _ in range(8):
        idx=await p.evaluate("L.ex.options?L.ex.options.indexOf(L.ex.answer):-1")
        if idx<0: print('type inattendu',await p.evaluate("L.ex.t")); break
        await p.click(f'.opt[data-i="{idx}"]')
        if await p.evaluate("L&&L.state==='answer'&&!!document.querySelector('#chk')&&!document.querySelector('#chk').disabled"): await p.click('#chk')
        await p.wait_for_timeout(900); k+=1
      print(ui,'sprint :',k,'réponses → bonnes',await p.evaluate("L.correct"),'| temps restant',await p.evaluate("L.timeLeft"),'| question affichée',await p.evaluate("(document.querySelector('.ltitle')||{}).textContent"))
      await p.evaluate("L.timeLeft=1"); await p.wait_for_timeout(2500)
      print('   fin :',await p.evaluate("[(document.querySelector('#lesson h2,.endc h2,#lesson h1')||{}).textContent,S.sprint]"))
      while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    print(errs); await b.close()
asyncio.run(main())
