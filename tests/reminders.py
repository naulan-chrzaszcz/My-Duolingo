import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,json,sqlite3
from playwright.async_api import async_playwright
U=SITE+''
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(args=['--no-proxy-server']); c=await b.new_context(**pw.devices['iPhone 13'],permissions=['notifications']); p=await c.new_page(); p.set_default_timeout(6000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(U); await p.wait_for_timeout(800)
    # profil LOCAL avec de la progression (comme créé quand le serveur répondait 403)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'Nono'+String(Date.now()).slice(-4),emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en',xp:345,gems:77,streak:3,dn:{'en-daily':{0:262143,1:31}}}))")
    await p.reload(); await p.wait_for_timeout(1500)
    await p.evaluate("location.hash='reglages/notifications'"); await p.wait_for_timeout(500)
    row=lambda: p.evaluate("[...document.querySelectorAll('.setrow')].find(r=>r.textContent.includes('Rappel quotidien')).innerText.replace(/\\n/g,' | ')")
    print('1. profil local :',await row())
    await p.click('#sOnline'); await p.wait_for_timeout(300); await p.fill('#op','secret12'); await p.click('#ook'); await p.wait_for_timeout(1800)
    print('2. passé en ligne :',await p.evaluate("[curAcc().name,!!curAcc().srv,S.xp,S.gems,doneCount('en-daily')]"))
    db=sqlite3.connect(SITE_DB); r=db.execute("select name,xp,length(state) from users").fetchall(); print('   sur le serveur :',r)
    await p.evaluate("location.hash='parcours';location.hash='reglages/notifications'"); await p.wait_for_timeout(600)
    print('3. ligne rappel :',await row())
    # notifications : sur ce navigateur de test, pas de vrai service de push → on simule l'abonnement
    await p.evaluate("""(async()=>{const reg=await navigator.serviceWorker.ready;reg.pushManager.subscribe=async()=>({endpoint:'https://web.push.apple.com/test-'+Date.now(),toJSON(){return {endpoint:this.endpoint,keys:{}}},unsubscribe:async()=>true});reg.pushManager.getSubscription=async()=>null;})()""")
    await p.select_option('#sRemH','20'); await p.click('#sRemB'); await p.wait_for_timeout(1500)
    print('4. après « Activer » :',await row(),'| S.set.remind',await p.evaluate("S.set.remind"),'| toasts',await p.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.textContent)"))
    print('   abonnements serveur :',sqlite3.connect(SITE_DB).execute("select hour,tz,substr(endpoint,1,40) from subs").fetchall())
    # vibrations : le déclencheur iOS est bien créé puis retiré
    print('5. vibration iPhone :',await p.evaluate("(()=>{S.set.haptic=true;let n=0;const o=HTMLElement.prototype.click;HTMLElement.prototype.click=function(){if(this.tagName==='LABEL'&&this.querySelector('input[switch]'))n++;return o.call(this)};haptic(1);HTMLElement.prototype.click=o;return [n,document.querySelectorAll('input[switch]').length]})()"))
    print('erreurs',errs); await b.close()
asyncio.run(main())
