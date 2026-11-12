import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,sys
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
ui,cid=sys.argv[1],sys.argv[2]
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.route('https://images.unsplash.com/**',lambda r:r.abort())
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))")
    await p.reload(); await p.wait_for_timeout(600)
    n=await p.evaluate(f"COURSES['{cid}'].units.length"); steps=0; stuck=0; les=0
    for u in range(0,n,3):
      for st in [(u*5+1)%18,(u*5+10)%18,17 if u%2 else 5]:
        await p.evaluate(f"if(L)closeLesson();closeModal();openSession({{mode:'lesson',cid:'{cid}',u:{u},n:{st},exs:buildLesson('{cid}',{u},{st})}})"); k=0; les+=1
        try:
          while await solve(p):
            k+=1
            if k>60: stuck+=1; print('boucle',cid,u,st); break
        except Exception as e: stuck+=1; print('bloqué',ui,cid,'u',u,'étape',st,'type',await p.evaluate("L&&L.ex&&L.ex.t"),str(e)[:120])
        steps+=k
        try:
          while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
        except Exception as e: print('fin bloquée',cid,u,st,str(e)[:80])
    print('RESULTAT',ui,cid,'leçons',les,'étapes',steps,'blocages',stuck,'erreurs JS',errs[:4]); await b.close()
asyncio.run(main())
