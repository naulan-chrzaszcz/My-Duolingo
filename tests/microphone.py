import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
SILENT="""(()=>{class R{constructor(){this.lang='';}start(){window.__micStarts=(window.__micStarts||0)+1;}stop(){}abort(){window.__aborted=1;this.onend&&this.onend();}};window.webkitSpeechRecognition=R;window.SpeechRecognition=undefined;})();"""
GOOD="""(()=>{class R{constructor(){}start(){setTimeout(()=>{this.onstart&&this.onstart();this.onaudiostart&&this.onaudiostart();this.onspeechstart&&this.onspeechstart();const t=window.__say||'';const res=[[{transcript:t}]];res[0].isFinal=true;this.onresult&&this.onresult({results:res});this.onend&&this.onend();},300)}stop(){}abort(){}};window.webkitSpeechRecognition=R;window.SpeechRecognition=R;})();"""
STAND="Object.defineProperty(navigator,'standalone',{get:()=>true});"
seed="localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en'}))"
async def run(pw,label,init,ua=None):
    b=await pw.chromium.launch(); c=await b.new_context(**pw.devices['iPhone 13']) if ua else await b.new_context(); await c.add_init_script(init); p=await c.new_page(); p.set_default_timeout(4000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(200); await p.evaluate(seed); await p.reload(); await p.wait_for_timeout(500)
    await p.evaluate("trainSpeak(['en-daily'])"); await p.wait_for_timeout(300)
    vis=lambda s: p.evaluate(f"(()=>{{const e=document.querySelector('{s}');return !!e&&!e.classList.contains('hidden')&&e.offsetParent!==null}})()")
    print(label,'| bouton micro visible',await vis('#micb'),'| dictée visible',await vis('#dictb'),'| SR actif',await p.evaluate("!!SR"))
    if await vis('#micb'):
        await p.evaluate("window.__say=L.ex.text"); await p.click('#micb'); await p.wait_for_timeout(5800)
        print('   après 6 s :',(await p.evaluate("(document.querySelector('#micst')||{}).textContent"))[:90],'| Vérifier actif',await p.evaluate("!!document.querySelector('#chk')&&!document.querySelector('#chk').disabled"),await p.evaluate("(document.querySelector('#micst')||{}).textContent"),'| dictée visible',await vis('#dictb'),'| état',await p.evaluate("L.state"),'| drapeau',await p.evaluate("localStorage.getItem('speakeasy-micko')"))
    if await vis('#dictb'):
        await p.fill('#dictin',await p.evaluate("L.ex.text")); await p.click('#dictok'); await p.wait_for_timeout(600)
        print('   dictée du clavier →',(await p.evaluate("(document.querySelector('#micst')||{}).textContent"))[:80],'| Vérifier actif',await p.evaluate("[L.state,(document.querySelector('.lfoot')||{innerText:''}).innerText.slice(0,60)]"))
    # exercice suivant : directement la dictée si le micro a échoué
    if await p.evaluate("L&&L.state==='feedback'"): await p.click('#cont'); await p.wait_for_timeout(300)
    print('   exercice suivant : micro',await vis('#micb'),'dictée',await vis('#dictb'),'| erreurs',errs)
    await b.close()
async def main():
  async with async_playwright() as pw:
    await run(pw,'1. iPhone, app écran d\'accueil',GOOD+STAND,ua=True)
    await run(pw,'2. micro qui ne répond jamais (bug iOS)',SILENT,ua=True)
    await run(pw,'3. micro qui fonctionne',GOOD,ua=True)
asyncio.run(main())
