import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
MOCK=r"""
(()=>{const log=window.__tts=[];let speaking=false,q=[];
 const voices=[{name:'Google français',lang:'fr-FR',localService:false},{name:'fr-fr-x-frc-local',lang:'fr-FR',localService:true},{name:'Google US English',lang:'en-US',localService:false},{name:'Samsung English',lang:'en_US',localService:true}];
 const ss={get speaking(){return speaking},get pending(){return q.length>0},paused:false,getVoices:()=>voices,onvoiceschanged:null,
  cancel(){log.push('cancel');q=[];speaking=false;},resume(){},
  speak(u){log.push('speak:'+u.lang+':'+(u.voice?u.voice.name:'-')+':'+u.text.slice(0,25));q.push(u);if(!speaking)next();}};
 function next(){const u=q.shift();if(!u){speaking=false;return;}speaking=true;setTimeout(()=>{speaking=false;u.dispatchEvent(new Event('end'));next();},120);}
 class U extends EventTarget{constructor(t){super();this.text=t;}}
 Object.defineProperty(window,'speechSynthesis',{value:ss});window.SpeechSynthesisUtterance=U;})();"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); dev=pw.devices['Pixel 7']
    c=await b.new_context(**dev); await c.add_init_script(MOCK); p=await c.new_page(); p.set_default_timeout(4000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'Léa',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en'}))")
    await p.reload(); await p.wait_for_timeout(600)
    print('Android détecté :',await p.evaluate("[ANDROID,IOS]"),'| bandeau :',await p.evaluate("(document.querySelector('.install')||{}).innerText"))
    await p.evaluate("const e=new Event('beforeinstallprompt');e.prompt=async()=>{window.__prompted=1};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e)"); await p.wait_for_timeout(300)
    print('  avec l\'événement :',await p.evaluate("!!document.querySelector('#instgo')")); await p.screenshot(path=OUT+'/and_install.png')
    await p.click('#instgo'); await p.wait_for_timeout(300); print('  installation demandée :',await p.evaluate("[window.__prompted,S.set.hideInstall,!!document.querySelector('.install')]"))
    # voix
    await p.evaluate("window.__tts.length=0;say('Hello, my name is Léa.','en-US');say('Bonjour','fr-FR')"); await p.wait_for_timeout(400)
    print('TTS :',await p.evaluate("window.__tts"))
    await p.evaluate("window.__tts.length=0;sayDialog([['M','Hi there'],['W','Hello'],['M','How are you?']],'en-US')"); await p.wait_for_timeout(700)
    print('dialogue :',await p.evaluate("window.__tts"),'| en mémoire',await p.evaluate("TTS_Q.size"))
    await p.evaluate("say('안녕하세요','ko-KR')"); await p.wait_for_timeout(200)
    print('voix coréenne absente → message :',await p.evaluate("[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' | ')"))
    # bouton retour
    await p.evaluate("openSession({mode:'lesson',cid:'en-daily',u:0,n:0,exs:buildLesson('en-daily',0,0)})"); await p.wait_for_timeout(300)
    await p.go_back(); await p.wait_for_timeout(400)
    print('retour pendant une leçon →',await p.evaluate("[!!L,(document.querySelector('#modal h2')||{}).textContent,location.hash]"))
    await p.go_back(); await p.wait_for_timeout(400)
    print('retour sur la fenêtre « ne pars pas » →',await p.evaluate("[!!L,document.querySelector('#modal').classList.contains('hidden'),location.hash]"))
    await p.evaluate("closeLesson()"); await p.wait_for_timeout(300)
    await p.evaluate("location.hash='entrainement'"); await p.wait_for_timeout(300); await p.evaluate("rulesSheet('en-pro')"); await p.wait_for_timeout(200)
    await p.go_back(); await p.wait_for_timeout(400); print('retour sur une fenêtre →',await p.evaluate("[document.querySelector('#modal').classList.contains('hidden'),location.hash]"))
    await p.go_back(); await p.wait_for_timeout(400); print('retour sans fenêtre (navigation normale) →',await p.evaluate("location.hash"))
    # leçon complète sans interférence de l'historique
    await p.evaluate("openSession({mode:'lesson',cid:'en-daily',u:0,n:1,exs:buildLesson('en-daily',0,1)})"); k=0
    while await solve(p):
        k+=1
        if k>40: break
    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    await p.wait_for_timeout(300); print('leçon entière :',k,'étapes | hash',await p.evaluate("location.hash"),'| pile historique',await p.evaluate("history.length"))
    print('erreurs',errs); await b.close()
asyncio.run(main())
