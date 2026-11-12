import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def story(p):
    for _ in range(80):
        if await p.evaluate("!L||L.state!=='story'"): break
        await p.evaluate("(()=>{const q=[...document.querySelectorAll('.sq')].pop();const nb=document.querySelector('#snext');if(nb&&nb.disabled&&q){const it=L.story.items[L.done-1];q.querySelector('.opt[data-k=\"'+it.a+'\"]').click()}})()")
        await p.click('#snext'); await p.wait_for_timeout(30)
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); c=await b.new_context(**pw.devices['Pixel 7']); p=await c.new_page(); p.set_default_timeout(4000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto('about:blank'); await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','en');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'fr'}))"); await p.reload(); await p.wait_for_timeout(500)
    h0=await p.evaluate("history.length")
    ids=await p.evaluate("allStories('fr').map(s=>s.id)")
    for sid in ids:
      await p.evaluate(f"if(L)closeLesson();closeModal();playStory('fr',allStories('fr').find(s=>s.id==='{sid}'))"); await story(p)
      while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
    # fenêtres ouvertes/fermées très vite + changements d'onglet
    for i in range(30):
      await p.evaluate("closeModal();rulesSheet(curCid());closeModal();bankView();closeModal();location.hash=['parcours','entrainement','ligue'][%d%%3]"%i)
    await p.wait_for_timeout(500)
    print('après 22 histoires + 90 fenêtres : toujours sur le site',await p.evaluate("location.protocol"),'| entrées historique',h0,'→',await p.evaluate("history.length"))
    # le retour ferme une fenêtre ouverte
    await p.evaluate("rulesSheet(curCid())"); await p.wait_for_timeout(200); await p.go_back(); await p.wait_for_timeout(300)
    print('retour sur une fenêtre → fermée :',await p.evaluate("document.querySelector('#modal').classList.contains('hidden')"),'| sur le site :',await p.evaluate("location.protocol"))
    await p.evaluate("openSession({mode:'lesson',cid:'fr-fle',u:0,n:0,exs:buildLesson('fr-fle',0,0)})"); await p.wait_for_timeout(200); await p.go_back(); await p.wait_for_timeout(300)
    print('retour pendant une leçon → question « ne pars pas » :',await p.evaluate("(document.querySelector('#modal:not(.hidden) h2')||{}).textContent"),'| leçon toujours ouverte',await p.evaluate("!!L"))
    await p.go_back(); await p.wait_for_timeout(300); print('2e retour → fenêtre fermée, leçon continue :',await p.evaluate("[document.querySelector('#modal').classList.contains('hidden'),!!L]"))
    await p.evaluate("closeLesson()"); await p.wait_for_timeout(200)
    # après fermeture d'une fenêtre, un retour revient à l'onglet précédent (pas de retour « mort »)
    await p.evaluate("location.hash='entrainement'"); await p.wait_for_timeout(150); await p.evaluate("location.hash='ligue'"); await p.wait_for_timeout(150)
    await p.evaluate("rulesSheet(curCid())"); await p.wait_for_timeout(150); await p.evaluate("document.querySelector('#modal .mx').click()"); await p.wait_for_timeout(200)
    await p.go_back(); await p.wait_for_timeout(400); print('fenêtre fermée par ✕ puis retour → onglet :',await p.evaluate("location.hash"),'(attendu #entrainement)')
    print('erreurs',errs); await b.close()
asyncio.run(main())
