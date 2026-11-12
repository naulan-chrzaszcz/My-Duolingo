import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,sys
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={'width':390,'height':844})
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    for ui,secs in [('ko',[('en','en-daily'),('en','en-pro'),('en','en-toeic'),('fr','fr-fle'),('fr','fr-volt')]),('en',[('fr','fr-fle'),('fr','fr-volt'),('ko','ko')])]:
      await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))")
      await p.reload(); await p.wait_for_timeout(600); seen=set()
      for sec,trk in secs:
        await p.evaluate(f"S.sec='{sec}';S.track['{sec}']='{trk}';save();location.hash='x';location.hash='entrainement';route()"); await p.wait_for_timeout(300)
        for t in await p.evaluate("[...document.querySelectorAll('.tcard h3,.tcard p,.tcard .tag,.tcard small')].map(e=>e.textContent.trim())"):
          bad = (ui=='ko' and not any('가'<=c<='힣' for c in t)) or (ui=='en' and any(c in t for c in 'éèêàùçâîô'))
          if bad and t not in seen: seen.add(t); print(ui,trk,'|',t)
    await b.close()
asyncio.run(main())
