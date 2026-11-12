import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(); p.set_default_timeout(3000)
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en'}))"); await p.reload(); await p.wait_for_timeout(500)
    await p.evaluate("openSession({mode:'lesson',cid:'en-daily',u:0,n:0,exs:buildLesson('en-daily',0,0)})"); n=0
    while n<200:
      if await p.evaluate("!!document.querySelector('#endc')") or await p.evaluate("!L"): break
      st=await p.evaluate("L.state")
      if st=='feedback': await p.click('#cont')
      elif st=='answer':
        if await p.evaluate("!!document.querySelector('#skip')"): await p.click('#skip')
        else: break
      n+=1
    print('clics',n,'| fin',await p.evaluate("!!document.querySelector('#endc')"),'| modale',await p.evaluate("(document.querySelector('#modal:not(.hidden) h2')||{}).textContent"),'| total',await p.evaluate("L&&[L.total,L.done,L.q.length,L.wrong,S.hearts]"))
    await b.close()
asyncio.run(main())
