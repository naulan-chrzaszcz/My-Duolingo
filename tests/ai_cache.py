import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
# Réserve des réponses de l'IA (v38.2) : les exercices sont toujours générés à nouveau (un appel par séance),
# la traduction d'un mot, une explication ou une correction ne sont payées qu'une fois, puis resservies
# sans appeler Claude, y compris après un rechargement ou hors ligne. Claude est simulé : chaque appel est compté.
STUB = """(fail)=>{window.__calls=0;window.__fail=fail;AI.mode='claude';AI.sample={json:async p=>{window.__calls++;
  if(window.__fail==='throw')throw new Error('hors ligne');if(window.__fail==='bad')return {};
  if(/"w":\\[\\[/.test(p))return {w:[['deadline','date limite','The deadline is Friday.','La date limite est vendredi.',['headline','dateline','lifeline']]]};
  if(/histoire|story/i.test(p)&&!/"p"/.test(p))return {t:'x'};
  const U=COURSES['en-daily'].units;const n=window.__calls;
  return {p:[['Version '+n,'Version '+n],...U[0].p.slice(0,3),...U[1].p.slice(0,3)],c:U[0].c.slice(0,3),v:U[0].v.slice(0,4)}}}}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(); p.set_default_timeout(8000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en'}))")
    await p.reload(); await p.wait_for_timeout(600)
    prob=[]
    await p.evaluate("("+STUB+")(null)"); await p.evaluate("cacheClear()")
    U="COURSES['en-daily'].units"
    # exercices : jamais en réserve, 5 lancements de la même séance = 5 appels, 5 générations différentes
    r=await p.evaluate(f"""(async()=>{{const v=[];for(let i=0;i<5;i++){{const G=await aiGenerate('en-daily',{U}.slice(0,8),null,'',null);v.push(G?G.p[0][0]:null)}}return [window.__calls,v,await cacheCount()]}})()""")
    print('5 séances identiques : appels',r[0],'versions',r[1],'réserves',r[2])
    if r[0]!=5 or len(set(r[1]))!=5 or r[2]!=0: prob.append('exercices mis en réserve '+str(r))
    # une réponse inutilisable n'est jamais gardée
    await p.evaluate("("+STUB+")('bad')")
    r=await p.evaluate("(async()=>{const a=await aiEnrich('en-US',['nevertheless']),b=await aiEnrich('en-US',['nevertheless']);return [window.__calls,a,b]})()")
    if r[0]!=2 or r[1] or r[2]: prob.append('réponse inutilisable gardée '+str(r))
    # un mot à retenir : une seule version, pièges compris
    await p.evaluate("("+STUB+")(null)")
    r=await p.evaluate("(async()=>{const a=await aiEnrich('en-US',['deadline']),b=await aiEnrich('en-US',['deadline']);return [window.__calls,b&&b[0][1],b&&b[0].traps]})()")
    print('mot :',r)
    if r[0]!=1 or r[1]!='date limite' or r[2]!=['headline','dateline','lifeline']: prob.append('mot à retenir : '+str(r))
    # après un rechargement, la réserve est toujours là (IndexedDB)
    await p.reload(); await p.wait_for_timeout(600); await p.evaluate("("+STUB+")(null)")
    r=await p.evaluate("(async()=>{const b=await aiEnrich('en-US',['deadline']);return [window.__calls,b&&b[0][1]]})()")
    print('après rechargement :',r)
    if r!=[0,'date limite']: prob.append('réserve perdue au rechargement '+str(r))
    # hors ligne : la réserve est resservie
    await p.evaluate("("+STUB+")('throw')")
    r=await p.evaluate("(async()=>{const b=await aiEnrich('en-US',['deadline']);return b&&b[0][1]})()")
    if r!='date limite': prob.append('hors ligne : réserve non resservie '+str(r))
    await p.evaluate("("+STUB+")(null)")
    # histoires : jamais en réserve (une histoire resservie ferait un doublon dans la liste)
    r=await p.evaluate("(async()=>{window.__calls=0;const q={mode:'story',lang:'en-US',level:'A2',theme:'x'};await aiAsk(storyPrompt(q),q,{});await aiAsk(storyPrompt(q),q,{});return window.__calls})()")
    if r!=2: prob.append(f'histoire mise en réserve ({r} appels au lieu de 2)')
    # au plus AI_CACHE.max demandes gardées
    r=await p.evaluate("(async()=>{AI_CACHE.max=5;for(let i=0;i<8;i++)await aiEnrich('en-US',['word'+i]);const n=await cacheCount();AI_CACHE.max=60;return n})()")
    print('réserves gardées (max 5) :',r)
    if r>5: prob.append(f'{r} réserves gardées au lieu de 5 au plus')
    # IndexedDB indisponible (navigation privée) : l'IA est appelée normalement, sans erreur
    q=await b.new_page(); q.set_default_timeout(8000); q.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await q.add_init_script("Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true})")
    await q.goto(APP_URL); await q.wait_for_timeout(600); await q.evaluate("("+STUB+")(null)")
    r=await q.evaluate("(async()=>{const a=await aiEnrich('en-US',['deadline']),b=await aiEnrich('en-US',['deadline']);return [window.__calls,!!a,!!b]})()")
    print('sans IndexedDB :',r)
    if r!=[2,True,True]: prob.append('sans IndexedDB : '+str(r))
    print('PROBLEMES :',prob)
    print('erreurs JS :',errs); await b.close()
asyncio.run(main())
