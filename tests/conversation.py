import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
# v39.2 : conversation en situation avec Horang. Claude est simulé (window.claude) : il répond « Line n »
# (n = nombre de répliques de l'élève), propose « Help n », termine après 4 répliques, puis corrige.
CLAUDE = """window.__calls=0;window.__prompts=[];window.claude={use:async()=>({json:async p=>{window.__calls++;window.__prompts.push(p);
  if(p.includes('"fautes"'))return {bilan:'Très bien, continue.',fautes:[['I has a cat','I have a cat','J ai un chat','have avec I']],mieux:[['I want coffee','I would like a coffee']],mots:[['to book','réserver'],['receipt','reçu']]};
  if(p.includes('"aide"')){const n=(p.match(/\\nE : /g)||[]).length;return {r:'Line '+n,fr:'Ligne '+n,aide:'Help '+n,fin:n>=4}}
  return null}})};"""
PROFILE = """(extra)=>{localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));
  localStorage.setItem('speakeasy-v1:a1',JSON.stringify(Object.assign({onb:true,pv:6,sec:'en',streak:2,lastDay:yest(),xp:100,why:'job',pzSeen:true,dlDay:dkey(),wkSeen:dkey(weekStart(0))},extra)))}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); prob=[]; errs=[]
    ctx=await b.new_context(); await ctx.add_init_script(CLAUDE)
    p=await ctx.new_page(); p.set_default_timeout(8000); p.on('pageerror',lambda e:errs.append(str(e)[:300]))
    p.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    await p.goto(APP_URL); await p.wait_for_timeout(400)
    await p.evaluate("("+PROFILE+")({})"); await p.reload(); await p.wait_for_timeout(1500)
    async def say_(t):
      await p.fill('#chIn',t); await p.click('#chSend'); await p.wait_for_timeout(500)
    # 1) carte dans l'onglet Entraînement
    await p.evaluate("location.hash='entrainement'"); await p.wait_for_timeout(600)
    if 'Conversation avec Horang' not in await p.evaluate("document.body.innerText"): prob.append('carte « Conversation avec Horang » absente')
    # 2) choix de la situation : celles de l'objectif d'abord (travail)
    await p.evaluate("chatPicker()"); await p.wait_for_timeout(400)
    r=await p.evaluate("[...document.querySelectorAll('[data-sc]')].slice(0,3).map(x=>x.dataset.sc)")
    if r!=['phone','interview','meeting']: prob.append('situations proposées pour le travail : '+str(r))
    await p.click('[data-sc="cafe"]'); await p.wait_for_timeout(800)
    r=await p.evaluate("[!!document.querySelector('#chat'),[...document.querySelectorAll('.chmsg.p .chb span')].map(x=>x.textContent),window.__calls]")
    print('ouverture :',r)
    if r!=[True,['Line 0'],1]: prob.append('ouverture de la conversation : '+str(r))
    q0=await p.evaluate("window.__prompts[0]")
    for frag in ["Situation : « Commander au café (l'élève parle avec le serveur ou la serveuse) ».","La conversation commence : écris la première réplique de ton personnage.","Objectif de l'élève : utiliser la langue dans son travail."]:
      if frag not in q0: prob.append('première demande sans : '+frag[:50])
    # 3) aide et traduction, sans appel de plus
    await p.click('#chHelp'); await p.wait_for_timeout(150)
    r=await p.evaluate("(document.querySelector('.chsug')||{}).textContent")
    if r!='Help 0': prob.append('aide : '+str(r))
    await p.click('.chsug'); await p.wait_for_timeout(100)
    if await p.evaluate("document.querySelector('#chIn').value")!='Help 0': prob.append('l\'aide ne remplit pas la réponse')
    await p.click('#chTr'); await p.wait_for_timeout(100)
    r=await p.evaluate("[!document.querySelector('.chtr').classList.contains('hidden'),document.querySelector('.chtr').textContent,window.__calls]")
    if r!=[True,'Ligne 0',1]: prob.append('traduction : '+str(r))
    # 4) répliques de l'élève ; « Terminer » à partir de 3 ; fin naturelle après la 4e
    await say_('I has a cat')
    r=await p.evaluate("[[...document.querySelectorAll('.chmsg.e .chb')].map(x=>x.textContent),document.querySelector('#chEnd').disabled,window.__prompts[1].includes('P : Line 0\\nE : I has a cat')]")
    if r!=[['I has a cat'],True,True]: prob.append('première réplique de l\'élève : '+str(r))
    await say_('I want coffee'); await say_('Yes please')
    if await p.evaluate("document.querySelector('#chEnd').disabled"): prob.append('« Terminer » désactivé après 3 répliques')
    await say_('Thank you'); await p.wait_for_timeout(1200)
    r=await p.evaluate("[!!document.querySelector('.chres'),(document.querySelector('.chxp')||{}).textContent,S.xp,S.streak,S.lastDay===dkey(),S.chats,(S.mist['en-daily']||[]).map(m=>m.t+':'+m.answer+':'+m.prompt),[...document.querySelectorAll('.chfix b')].map(x=>x.textContent)]")
    print('fin :',r)
    if r!=[True,'+60 XP',160,3,True,1,['type:I have a cat:J ai un chat'],['I have a cat','I would like a coffee']]: prob.append('fin de la conversation : '+str(r))
    qf=await p.evaluate("window.__prompts.find(x=>x.includes('\"fautes\"'))||''")
    if 'E : I has a cat' not in qf or 'E : Thank you' not in qf: prob.append('correction sans toute la conversation')
    # 5) mots utiles → mots à retenir
    await p.click('[data-w="0"]'); await p.wait_for_timeout(300)
    r=await p.evaluate("(S.bank.en||[]).map(w=>w.w+':'+w.tr)")
    if r!=['to book:réserver']: prob.append('mot ajouté : '+str(r))
    await p.click('#chClose'); await p.wait_for_timeout(300)
    if await p.evaluate("!!document.querySelector('#chat')"): prob.append('conversation encore ouverte après « Fermer »')
    # 6) fin à la main après 3 répliques ; quitter sans correction ne donne pas d'XP
    await p.evaluate("startChat('Au restaurant','Au restaurant')"); await p.wait_for_timeout(600)
    for t in ['Hello','A table for two','Thanks']: await say_(t)
    await p.click('#chEnd'); await p.wait_for_timeout(1200)
    r=await p.evaluate("[(document.querySelector('.chxp')||{}).textContent,S.xp,S.chats]")
    if r!=['+50 XP',210,2]: prob.append('fin à la main : '+str(r))
    await p.click('#chClose'); await p.wait_for_timeout(200)
    await p.evaluate("startChat('Au restaurant','Au restaurant')"); await p.wait_for_timeout(600)
    await say_('Hello'); await p.click('#chX'); await p.wait_for_timeout(400)
    r=await p.evaluate("[!!document.querySelector('#chat'),S.xp,S.chats]")
    if r!=[False,210,2]: prob.append('quitter sans correction : '+str(r))
    # 7) écran à la taille d'un iPhone : barre de saisie visible, pas de débordement horizontal
    await p.set_viewport_size({"width":390,"height":700})
    await p.evaluate("startChat('Au café','Au café')"); await p.wait_for_timeout(600)
    r=await p.evaluate("(()=>{const bar=document.querySelector('.chatbar').getBoundingClientRect();return [bar.bottom<=window.innerHeight+1,document.querySelector('#chat').scrollWidth<=window.innerWidth]})()")
    if r!=[True,True]: prob.append('mise en page sur iPhone : '+str(r))
    await p.evaluate("closeUi()")
    await ctx.close()
    # 8) sans IA : invitation à connecter Claude
    c2=await b.new_context(); q=await c2.new_page(); q.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await q.goto(APP_URL); await q.wait_for_timeout(400); await q.evaluate("("+PROFILE+")({})"); await q.reload(); await q.wait_for_timeout(1200)
    await q.evaluate("chatPicker()"); await q.wait_for_timeout(500)
    r=await q.evaluate("[!!document.querySelector('#chCl'),!!document.querySelector('[data-sc]')]")
    if r!=[True,False]: prob.append('sans IA : '+str(r))
    await c2.close()
    print('PROBLEMES :',prob)
    print('erreurs JS :',errs); await b.close()
asyncio.run(main())
