import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,json,datetime,urllib.request
from playwright.async_api import async_playwright
U=SITE+''
def call(a,body):
    r=urllib.request.Request(U+'api/account.php?a='+a,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    return json.loads(urllib.request.build_opener(urllib.request.ProxyHandler({})).open(r,timeout=10).read())
today=datetime.date.today(); mon=today-datetime.timedelta(days=today.weekday()); W=lambda k:(mon-datetime.timedelta(days=7*k)).isoformat()
async def main():
  # compte de test « Léa » : 2e la semaine dernière, déjà des XP cette semaine
  j=call('register',{'name':'Léa','password':'secret12','emoji':'🐯','color':'#7C4DFF'}); tok=j['token']
  st={'onb':True,'pv':6,'sec':'en','xp':1500,'gems':30,'streak':6,'week':{},'ts':5}
  call('save',{'token':tok,'state':json.dumps(st),'ts':5,'wxp':700,'week':W(1),'xp':1500,'streak':6})
  for n,x,lw in [('Zoé-Marguerite-Alex',40,0),('Tom',900,950),('Yuki',15,0),('Omar',260,120)]:
    t=call('register',{'name':n,'password':'secret12','emoji':'🦊','color':'#FF7A45'})['token']
    if lw: call('save',{'token':t,'state':'{}','ts':1,'wxp':lw,'week':W(1),'xp':lw,'streak':2})
    call('save',{'token':t,'state':'{}','ts':1,'wxp':x,'week':W(0),'xp':x*7,'streak':x%9})
  async with async_playwright() as pw:
    b=await pw.chromium.launch(args=['--no-proxy-server'])
    for ui,scheme,dev in [('fr','light','iPhone 13'),('ko','dark','Pixel 7'),('en','light','iPhone SE')]:
      c=await b.new_context(**pw.devices[dev],color_scheme=scheme); p=await c.new_page(); p.set_default_timeout(6000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
      await p.goto(U); await p.wait_for_timeout(1200)
      await p.evaluate(f"localStorage.setItem('speakeasy-ui','{ui}')"); await p.reload(); await p.wait_for_timeout(1200)
      await p.evaluate("(()=>{const b=document.querySelector('#flogin');b&&b.click()})()"); await p.wait_for_timeout(600)
      await p.fill('#ln','Léa'); await p.fill('#lp','secret12'); await p.click('#lok'); await p.wait_for_timeout(2500)
      print(ui,'connexion :',await p.evaluate("[(curAcc()||{}).name,S.xp,S.gems]"),'| fenêtre résultat :',await p.evaluate("(document.querySelector('#modal:not(.hidden) h2')||{}).textContent"))
      await p.evaluate("closeModal();location.hash='ligue'"); await p.wait_for_timeout(2500)
      print('   fenêtre résultat (ligue) :',await p.evaluate("(document.querySelector('#modal:not(.hidden) .mcenter')||{innerText:''}).innerText.replace(/\\n+/g,' | ')"),'| gemmes',await p.evaluate("S.gems"),'| lgSeen',await p.evaluate("S.lgSeen"))
      await p.screenshot(path=f'{OUT}/lg_{ui}_modal.png'); await p.evaluate("closeModal()"); await p.wait_for_timeout(300)
      await p.evaluate("document.querySelector('.lgcard').scrollIntoView()"); await p.wait_for_timeout(300); await p.screenshot(path=f'{OUT}/lg_{ui}_w.png')
      print('   classement :',(await p.evaluate("document.querySelector('.lgcard').innerText")).replace('\n',' | ')[:420])
      await p.click('.lgtabs [data-t="a"]'); await p.wait_for_timeout(300); await p.screenshot(path=f'{OUT}/lg_{ui}_a.png')
      print('   débordement horizontal :',await p.evaluate("document.documentElement.scrollWidth>innerWidth+1"),'| erreurs',errs)
      # 2e ouverture : la fenêtre de résultat ne revient pas et les gemmes ne sont pas données deux fois
      await p.reload(); await p.wait_for_timeout(3500); print('   rechargement : fenêtre',await p.evaluate("(document.querySelector('#modal:not(.hidden) h2')||{}).textContent"),'| gemmes',await p.evaluate("S.gems"))
      await c.close()
    await b.close()
asyncio.run(main())
