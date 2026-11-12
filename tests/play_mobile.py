import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,sys
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
ui,cid,plat=sys.argv[1],sys.argv[2],sys.argv[3]
IOS_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
AND_UA='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
INIT={'iosapp':"Object.defineProperty(navigator,'standalone',{get:()=>true});delete Navigator.prototype.vibrate;delete window.SpeechRecognition;delete window.webkitSpeechRecognition;",'iossafari':"delete Navigator.prototype.vibrate;delete window.Notification;delete window.PushManager;window.webkitSpeechRecognition=window.webkitSpeechRecognition||window.SpeechRecognition;delete window.SpeechRecognition;",'android':''}[plat]
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); c=await b.new_context(viewport={"width":375 if plat!="android" else 360,"height":667 if plat!="android" else 740},is_mobile=True,has_touch=True,user_agent=IOS_UA if plat.startswith("ios") else AND_UA); await c.add_init_script(INIT); p=await c.new_page(); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
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
    print('RESULTAT',plat,ui,cid,'leçons',les,'étapes',steps,'blocages',stuck,'erreurs JS',errs[:4]); await b.close()
asyncio.run(main())
