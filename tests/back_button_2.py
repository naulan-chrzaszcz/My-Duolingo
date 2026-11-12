import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); c=await b.new_context(**pw.devices['Pixel 7']); p=await c.new_page(); p.set_default_timeout(4000)
    await p.goto('about:blank'); await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en'}))"); await p.reload(); await p.wait_for_timeout(500)
    st=lambda tag: p.evaluate(f"'{tag}: '+JSON.stringify([history.length,history.state,location.hash,!!L,!document.querySelector('#modal').classList.contains('hidden')])")
    print(await st('départ'))
    await p.evaluate("openSession({mode:'lesson',cid:'en-daily',u:0,n:0,exs:buildLesson('en-daily',0,0)})"); await p.wait_for_timeout(300); print(await st('leçon'))
    await p.go_back(); await p.wait_for_timeout(400); print(await st('retour1'))
    await p.go_back(); await p.wait_for_timeout(400); print(await st('retour2'))
    await p.evaluate("closeLesson()"); await p.wait_for_timeout(300); print(await st('fermée'))
    await p.evaluate("location.hash='entrainement'"); await p.wait_for_timeout(300); print(await st('hash'))
    await p.evaluate("rulesSheet('en-pro')"); await p.wait_for_timeout(200); print(await st('fenêtre'))
    await p.go_back(); await p.wait_for_timeout(400); print(await st('retour3'))
    await b.close()
asyncio.run(main())
