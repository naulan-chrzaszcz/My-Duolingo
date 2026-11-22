import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
# v39.1 : bilan de la semaine (à la première ouverture de la semaine, puis depuis le profil) et
# histoire écrite avec les mots à retenir. Claude est simulé (window.claude) ; chaque prompt est relevé.
CLAUDE = """window.__calls=0;window.__prompts=[];window.claude={use:async()=>({json:async p=>{window.__calls++;window.__prompts.push(p);
  if(p.includes('"objectifs"'))return {bilan:'Belle semaine : tu as été régulière.',objectifs:['Objectif A','Objectif B','Objectif C']};
  if(p.includes('"cast"'))return {t:'Le rapport',ic:'📄',cast:{Anna:['W','👩'],Ben:['M','🧑']},items:[{s:'Anna',t:'The deadline is Friday.',fr:'La date limite est vendredi.'},{s:'Ben',t:'I will send the invoice today.',fr:'J envoie la facture aujourd hui.'},{q:'When is the deadline?',o:['Friday','Monday','Sunday'],a:0},{s:'Anna',t:'Great, and the suitcase?',fr:'Super, et la valise ?'},{s:'Ben',t:'It is in my car.',fr:'Elle est dans ma voiture.'}]};
  const U=COURSES['en-daily'].units;return {p:[...U[0].p.slice(0,4),...U[1].p.slice(0,4)],c:U[0].c.slice(0,3),v:U[0].v.slice(0,4)}}})};"""
# profil : série de 3 jours, 450 XP sur 3 jours la semaine passée, 2 erreurs dans l'unité « Au café », 4 mots à retenir
PROFILE = """(ui,extra)=>{const w={};[0,2,4].forEach((i,k)=>{const d=weekStart(1);d.setDate(d.getDate()+i);w[dkey(d)]=[100,150,200][k]});
  const t=weekStart(1).getTime()+864e5;const now=Date.now();
  localStorage.clear();localStorage.setItem('speakeasy-ui',ui);localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));
  localStorage.setItem('speakeasy-v1:a1',JSON.stringify(Object.assign({onb:true,pv:6,sec:ui==='fr'?'en':'ko',streak:3,lastDay:dkey(),pzSeen:true,week:w,likes:['work'],
    elog:{'en-daily':[{t:'type',q:'Un café, s il vous plaît',a:'A coffee, please.',g:'A coffe',u:'Au café',ts:t},{t:'type',q:'Merci',a:'Thank you.',g:'Tank you',u:'Au café',ts:t+1000},{t:'mc',q:'vieux',a:'old',g:'new',u:'',ts:now-40*864e5}]},
    bank:{en:[{id:'b1',w:'deadline',tr:'date limite',added:1,box:1,due:now+864e5},{id:'b2',w:'invoice',tr:'facture',added:3,box:0,due:0},{id:'b3',w:'suitcase',tr:'valise',added:2,box:0,due:0},{id:'b4',w:'meeting',tr:'réunion',added:4,box:2,due:now+3*864e5}]}},extra)))}"""
WK = "!!document.querySelector('#wkOk')&&!document.querySelector('#modal').classList.contains('hidden')"
def nb(x):
  # l'app met des espaces insécables avant « : » et dans les guillemets (typographie française)
  if isinstance(x,str): return x.replace('\xa0',' ')
  if isinstance(x,list): return [nb(y) for y in x]
  return x
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); prob=[]; errs=[]
    ctx=await b.new_context(); await ctx.add_init_script(CLAUDE)
    p=await ctx.new_page(); p.set_default_timeout(8000); p.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await p.goto(APP_URL); await p.wait_for_timeout(400)
    async def load(extra='{}',ui='fr',page=None):
      q=page or p
      await q.evaluate("("+PROFILE+")('"+ui+"',"+extra+")"); await q.reload(); await q.wait_for_timeout(3800)
    # 1) première ouverture de la semaine : bilan, rédigé par l'IA, puis la leçon du jour quand on le ferme
    await load()
    r=await p.evaluate(f"[{WK},[...document.querySelectorAll('.wkstats b')].map(x=>x.textContent),(document.querySelector('.wkbilan')||{{}}).textContent,[...document.querySelectorAll('.wkobj li')].map(x=>x.textContent),S.wkLast&&S.wkLast.src,S.wkSeen===dkey(weekStart(0))]")
    r=nb(r); print('bilan :',r)
    if r!=[True,['450','3/7'],'Belle semaine : tu as été régulière.',['Objectif A','Objectif B','Objectif C'],'ia',True]: prob.append('bilan de la semaine avec IA : '+str(r))
    q0=await p.evaluate("window.__prompts.find(x=>x.includes('\"objectifs\"'))||''")
    for frag in ["Sa semaine passée : 450 XP (semaine d'avant : 0 XP), 3 jours d'activité sur 7, série de 3 jours, 2 mots à retenir à revoir.","[type] Un café, s il vous plaît | attendu : A coffee, please. | donné : A coffe","Centres d'intérêt de l'élève : Travail et carrière."]:
      if frag not in q0: prob.append('demande du bilan sans : '+frag[:60])
    if 'vieux' in q0: prob.append('erreur d\'une autre semaine envoyée dans le bilan')
    await p.click('#wkOk'); await p.wait_for_timeout(1500)
    if not await p.evaluate("!!document.querySelector('#dlgo')"): prob.append('leçon du jour absente après le bilan')
    await p.evaluate("closeModal()")
    # 2) une seule fois par semaine
    await p.reload(); await p.wait_for_timeout(3800)
    if await p.evaluate(WK): prob.append('bilan reproposé dans la même semaine')
    # 3) à revoir depuis le profil
    await p.evaluate("closeModal();location.hash='profil'"); await p.wait_for_timeout(600)
    await p.click('#tWeek'); await p.wait_for_timeout(200)
    r=nb(await p.evaluate("(document.querySelector('.wkbilan')||{}).textContent"))
    if r!='Belle semaine : tu as été régulière.': prob.append('bilan du profil : '+str(r))
    await p.evaluate("closeModal()")
    # 4) pas d'activité la semaine passée : pas de bilan
    await load("{week:{}}")
    if await p.evaluate(WK): prob.append('bilan sans activité la semaine passée')
    await p.evaluate("closeModal()")
    # 5) histoire avec les mots à retenir : à revoir d'abord, puis les plus récents
    await load("{wkSeen:dkey(weekStart(0)),dlDay:dkey()}")
    await p.evaluate("window.__calls=0;window.__prompts=[];bankView()"); await p.wait_for_timeout(500)
    if not await p.evaluate("!!document.querySelector('#bstory')"): prob.append('bouton « Une histoire avec mes mots » absent')
    else:
      await p.click('#bstory'); await p.wait_for_timeout(1500)
      r=await p.evaluate("[window.__calls,(window.__prompts[0]||'').includes(\"Mots que l'élève doit revoir : invoice, suitcase, meeting, deadline. Utilise-les tous\"),(window.__prompts[0]||'').includes(\"Centres d'intérêt de l'élève : Travail et carrière.\"),(S.genStories.en||[]).length,((S.genStories.en||[])[0]||{}).words,!!(L&&L.mode==='story')]")
      print('histoire :',r)
      if r!=[1,True,True,1,['invoice','suitcase','meeting','deadline'],True]: prob.append('histoire avec mes mots : '+str(r))
      await p.evaluate("if(L){closeLesson&&closeLesson()}")
    # 6) moins de 3 mots : pas de bouton
    await p.evaluate("closeModal();S.bank.en=S.bank.en.slice(0,2);bankView()"); await p.wait_for_timeout(300)
    if await p.evaluate("!!document.querySelector('#bstory')"): prob.append('bouton histoire avec moins de 3 mots')
    await ctx.close()
    # 7) sans IA : bilan construit avec les chiffres, sans appel ; pas de bouton d'histoire
    c2=await b.new_context(); q=await c2.new_page(); q.on('pageerror',lambda e:errs.append(str(e)[:300]))
    await q.goto(APP_URL); await q.wait_for_timeout(400); await load(page=q)
    r=await q.evaluate(f"[{WK},[...document.querySelectorAll('.wkbilan span')].map(x=>x.textContent),[...document.querySelectorAll('.wkobj li')].map(x=>x.textContent),S.wkLast&&S.wkLast.src,!!document.querySelector('.wkload')]")
    r=nb(r); print('bilan sans IA :',r)
    if r!=[True,["La semaine dernière : 450 XP en 3 jours d'activité.","Tes erreurs portaient surtout sur : traduction écrite."],["Pratiquer au moins 5 jours cette semaine","Revoir l'unité « Au café »","Réviser tes 2 mots à retenir"],'local',False]: prob.append('bilan sans IA : '+str(r))
    await q.evaluate("closeModal();bankView()"); await q.wait_for_timeout(600)
    if await q.evaluate("!!document.querySelector('#bstory')"): prob.append('bouton histoire sans IA')
    # 8) interface en anglais : bilan sans IA traduit phrase par phrase
    await load("{sec:'fr'}",'en',q)
    r=await q.evaluate("[...document.querySelectorAll('.wkbilan span,.wkobj li,.wkpop h2,.wkpop h3')].map(x=>x.textContent)")
    print('bilan en anglais :',r)
    if not r or any(any(w in x for w in ['semaine','Pratiquer','Réviser','bilan','objectifs']) for x in r): prob.append('bilan non traduit : '+str(r))
    await c2.close()
    print('PROBLEMES :',prob)
    print('erreurs JS :',errs); await b.close()
asyncio.run(main())
