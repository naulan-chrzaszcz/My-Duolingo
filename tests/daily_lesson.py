import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
# v39 : centres d'intérêt et leçon du jour.
# La leçon du jour s'ouvre une fois par jour, à l'ouverture, si une série est en cours et que l'IA est disponible ;
# la fermer ne coûte aucun appel. Claude est simulé (window.claude) : chaque appel et chaque prompt sont relevés.
CLAUDE = """window.__calls=0;window.__prompts=[];window.claude={use:async()=>({json:async p=>{window.__calls++;window.__prompts.push(p);
  const U=window.COURSES?COURSES['en-daily'].units:[];
  return {p:[...U[0].p.slice(0,4),...U[1].p.slice(0,4)],c:U[0].c.slice(0,3),v:U[0].v.slice(0,4)}}})};"""
PROFILE = """(extra)=>{localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));
  localStorage.setItem('speakeasy-v1:a1',JSON.stringify(Object.assign({onb:true,pv:6,sec:'en',streak:3,lastDay:dkey(),likes:['food','games'],likeFree:'la K-pop'},extra)))}"""
POP = "!!document.querySelector('#dlgo')&&!document.querySelector('#modal').classList.contains('hidden')"
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); prob=[]; errs=[]
    ctx=await b.new_context(); await ctx.add_init_script(CLAUDE)
    p=await ctx.new_page(); p.set_default_timeout(8000); p.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await p.goto(APP_URL); await p.wait_for_timeout(400)
    async def load(extra='{}'):
      await p.evaluate("("+PROFILE+")("+extra+")"); await p.reload(); await p.wait_for_timeout(3600)
    # 1) série en cours + IA : la fenêtre s'ouvre, avec les centres d'intérêt ; « Plus tard » ne coûte rien
    await load()
    r=await p.evaluate(f"[{POP},[...document.querySelectorAll('.dlpop .likechip')].map(x=>x.textContent),window.__calls]")
    print('ouverture :',r)
    if not r[0]: prob.append('leçon du jour absente avec une série en cours')
    if r[1]!=['Cuisine','Jeux vidéo','la K-pop']: prob.append('centres d\'intérêt affichés : '+str(r[1]))
    await p.click('#dllater'); await p.wait_for_timeout(300)
    r=await p.evaluate("[document.querySelector('#modal').classList.contains('hidden'),S.dlDay===dkey(),window.__calls]")
    if r!=[True,True,0]: prob.append('« Plus tard » : '+str(r))
    # 2) une seule fois par jour, même après un rechargement ou un retour dans l'app
    await p.reload(); await p.wait_for_timeout(3600)
    await p.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(1800)
    if await p.evaluate(POP): prob.append('leçon du jour proposée deux fois le même jour')
    # 3) le lendemain, au retour dans l'app installée (page restée en mémoire) : proposée à nouveau
    await p.evaluate("S.dlDay='2000-01-01';save();document.dispatchEvent(new Event('visibilitychange'))"); await p.wait_for_timeout(1800)
    if not await p.evaluate(POP): prob.append('leçon du jour absente au retour dans l\'app un autre jour')
    # 4) « Commencer » : un seul appel, leçon inédite avec la consigne du jour et les centres d'intérêt
    await p.click('#dlgo'); await p.wait_for_timeout(1500)
    r=await p.evaluate("[window.__calls,!!(L&&L.daily),!!(L&&L.ai==='ia'),(window.__prompts[0]||'').includes('Leçon du jour : une leçon INÉDITE'),(window.__prompts[0]||'').includes(\"Centres d'intérêt de l'élève : Cuisine, Jeux vidéo, la K-pop.\")]")
    print('commencer :',r)
    if r!=[1,True,True,True,True]: prob.append('leçon du jour lancée : '+str(r))
    await p.evaluate("closeLesson&&closeLesson()")
    # 5) pas de série : rien
    await load("{streak:0}")
    if await p.evaluate(POP): prob.append('leçon du jour proposée sans série')
    # 6) sans centre d'intérêt : bouton pour les choisir, puis retour à la fenêtre avec les choix
    await load("{likes:[],likeFree:''}")
    if not await p.evaluate("!!document.querySelector('#dllikes')"): prob.append('pas de bouton « Choisir mes centres d\'intérêt »')
    else:
      await p.click('#dllikes'); await p.wait_for_timeout(200)
      await p.click('[data-l="travel"]'); await p.click('[data-l="music"]'); await p.fill('#likeFree','  le jazz  ')
      await p.click('#likeOk'); await p.wait_for_timeout(300)
      r=await p.evaluate(f"[S.likes,S.likeFree,{POP},[...document.querySelectorAll('.dlpop .likechip')].map(x=>x.textContent)]")
      print('choix depuis la fenêtre :',r)
      if r!=[['travel','music'],'le jazz',True,['Voyage','Musique','le jazz']]: prob.append('choix depuis la leçon du jour : '+str(r))
    # 7) au plus 6 thèmes
    await p.evaluate("interestsPicker()"); await p.wait_for_timeout(200)
    for id in ['food','sport','screen','games','work','tech']: await p.click(f'[data-l="{id}"]')
    r=await p.evaluate("document.querySelectorAll('.likechip.sel').length")
    if r!=6: prob.append(f'{r} thèmes sélectionnés au lieu de 6 au plus')
    await p.click('#likeSkip')
    # 8) un thème imposé remplace les centres d'intérêt dans la demande
    r=await p.evaluate("[aiRequest('en-daily',COURSES['en-daily'].units.slice(0,3),null,'',null).likes,aiRequest('en-daily',COURSES['en-daily'].units.slice(0,3),null,'la mer',null).likes]")
    if r!=[['Voyage','Musique','le jazz'],[]]: prob.append('centres d\'intérêt dans la demande : '+str(r))
    # 9) Paramètres › Préférences : ligne « Centres d'intérêt »
    await p.evaluate("location.hash='reglages/preferences'"); await p.wait_for_timeout(500)
    if not await p.evaluate("!!document.querySelector('#sLikes')"): prob.append('ligne Centres d\'intérêt absente des préférences')
    else:
      await p.click('#sLikes'); await p.wait_for_timeout(200)
      if not await p.evaluate("!!document.querySelector('#likeOk')"): prob.append('choix des centres d\'intérêt non ouvert depuis les préférences')
      await p.click('#likeSkip')
    # 10) accueil d'un nouveau profil : étape des centres d'intérêt entre l'objectif et le niveau
    await load("{onb:false,streak:0,likes:[],likeFree:''}")
    await p.click('#n1'); await p.wait_for_timeout(200); await p.click('#n2'); await p.wait_for_timeout(200)
    if not await p.evaluate("!!document.querySelector('#likeOk')"): prob.append('étape des centres d\'intérêt absente de l\'accueil')
    else:
      await p.click('[data-l="nature"]'); await p.click('#likeOk'); await p.wait_for_timeout(200)
      r=await p.evaluate("[S.likes,!!document.querySelector('[data-p]')]")
      if r!=[['nature'],True]: prob.append('accueil après les centres d\'intérêt : '+str(r))
    await ctx.close()
    # 11) sans IA : jamais de fenêtre, et la journée n'est pas « consommée »
    c2=await b.new_context(); q=await c2.new_page(); q.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await q.goto(APP_URL); await q.wait_for_timeout(400)
    await q.evaluate("("+PROFILE+")({})"); await q.reload(); await q.wait_for_timeout(3600)
    r=await q.evaluate(f"[{POP},S.dlDay||'']")
    if r!=[False,'']: prob.append('sans IA : '+str(r))
    await c2.close()
    print('PROBLEMES :',prob)
    print('erreurs JS :',errs); await b.close()
asyncio.run(main())
