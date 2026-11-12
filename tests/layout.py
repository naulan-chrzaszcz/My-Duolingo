import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,sys,json
from playwright.async_api import async_playwright
ui=sys.argv[1]
AUDIT=r"""(dark)=>{const out=[];const W=innerWidth;
 const vis=el=>{const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return null;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<.3)return null;return r};
 const scrollX=el=>{for(let p=el.parentElement;p;p=p.parentElement){const o=getComputedStyle(p).overflowX;if((o==='auto'||o==='scroll')&&p.scrollWidth>p.clientWidth+2)return true}return false};
 if(document.documentElement.scrollWidth>W+1)out.push('PAGE déborde horizontalement : '+document.documentElement.scrollWidth+' > '+W);
 const top=document.querySelector('#lesson:not(.hidden)')||(!document.querySelector('#modal').classList.contains('hidden')&&document.querySelector('#modal'))||document.body;
 for(const el of top.querySelectorAll('button,h1,h2,h3,p,span,small,b,a,label,div.qcard,div.tile,select,input,textarea')){const r=vis(el);if(!r)continue;if(el.closest('.notr.langpick'))continue;
  const txt=(el.innerText||el.value||'').trim().slice(0,50);if(!txt)continue;
  if((r.right>W+2||r.left<-2)&&!scrollX(el)&&r.top<innerHeight*3&&getComputedStyle(el).position!=='fixed'&&!el.closest('.toast,.confetti'))out.push('HORS ÉCRAN ['+el.tagName+'.'+el.className+'] «'+txt+'» droite='+Math.round(r.right));
  const cs=getComputedStyle(el);if(el.children.length===0&&el.scrollWidth>el.clientWidth+2&&cs.overflowX!=='visible'&&cs.textOverflow!=='ellipsis'&&el.tagName!=='INPUT'&&el.tagName!=='TEXTAREA'&&el.tagName!=='SELECT')out.push('TEXTE COUPÉ ['+el.tagName+'.'+el.className+'] «'+txt+'»');
  if(el.tagName==='BUTTON'&&el.scrollHeight>el.clientHeight+6&&cs.overflowY!=='visible')out.push('BOUTON TROP PETIT ['+el.className+'] «'+txt+'»');}
 // chevauchement : barre de navigation / pied de leçon masquant un bouton d'action
 if(dark){const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
  const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[, /]+/).map(Number);return{c:p.slice(0,3),a:p[3]===undefined?1:p[3]}};
  const bgOf=el=>{let acc=null;for(let p=el;p;p=p.parentElement){const cs=getComputedStyle(p);if(cs.backgroundImage&&cs.backgroundImage!=='none'){const m=cs.backgroundImage.match(/rgba?\([^)]+\)/);if(m){const g=parse(m[0]);if(g&&g.a>.5)return g.c}return null}const b=parse(cs.backgroundColor);if(b&&b.a>.9)return b.c;if(b&&b.a>.05)return null}return [21,18,31]};
  const w=document.createTreeWalker(top,NodeFilter.SHOW_TEXT);let n;const seen=new Set();
  while((n=w.nextNode())){const t=n.nodeValue.trim();if(t.length<2||!/[\p{L}\p{N}]/u.test(t))continue;const el=n.parentElement;if(!el||!vis(el)||el.closest('svg,.confetti'))continue;let op=1;for(let p=el;p;p=p.parentElement)op*=+getComputedStyle(p).opacity;if(op<.6)continue;
   const fg=parse(getComputedStyle(el).color);const bg=bgOf(el);if(!fg||!bg)continue;const L1=lum(fg.c),L2=lum(bg);const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
   if(cr<2.6){const k=el.className+'|'+getComputedStyle(el).color+'|'+bg;if(seen.has(k))continue;seen.add(k);out.push('CONTRASTE '+cr.toFixed(1)+' ['+el.tagName+'.'+el.className+'] «'+t.slice(0,40)+'» texte '+getComputedStyle(el).color+' sur rgb('+bg+')');}}}
 return out}"""
ALL={}
async def grab(p,tag,dark):
    try:
        for t in await p.evaluate(AUDIT,dark): ALL.setdefault(t,tag)
    except Exception as e: print('audit err',tag,str(e)[:100])
TR={'fr':[('en','en-daily'),('en','en-toeic'),('fr','fr-volt'),('ko','ko')],'en':[('fr','fr-fle'),('fr','fr-volt'),('ko','ko')],'ko':[('en','en-pro'),('en','en-toeic'),('fr','fr-fle'),('fr','fr-volt')]}[ui]
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); errs=[]
    for W,scheme in [(320,'light'),(390,'dark')]:
      dark=scheme=='dark'
      c=await b.new_context(viewport={"width":W,"height":700},is_mobile=True,has_touch=True,color_scheme=scheme,device_scale_factor=2); p=await c.new_page(); p.set_default_timeout(3000); p.on('pageerror',lambda e:errs.append(str(e)[:200]))
      await p.route('https://images.unsplash.com/**',lambda r:r.abort())
      await p.goto(APP_URL); await p.wait_for_timeout(300)
      await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'Marie-Christine',emoji:'🐯',color:'#7C4DFF',pin:''}},{{id:'a2',name:'Bob',emoji:'🐼',color:'#22B573',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6,gems:12345,xp:98765,streak:365,lastDay:new Date().toISOString().slice(0,10),freeze:2}}))")
      await p.reload(); await p.wait_for_timeout(600)
      await p.evaluate("Object.keys(COURSES).forEach(c=>{S.dn[c]={};COURSES[c].units.forEach((U,u)=>S.dn[c][u]=u<3?262143:u<5?4095:0)});S.bank={};save()")
      tag0=f'{W}px/{scheme}'
      for sec,trk in TR:
        for v in ["parcours","entrainement","histoires","ligue","boutique","profil","stats"]:
          await p.evaluate(f"if(L)closeLesson();closeModal();S.sec='{sec}';S.track['{sec}']='{trk}';save();location.hash='{v}';route()"); await p.wait_for_timeout(250); await grab(p,f'{tag0} {trk}/{v}',dark)
          if W==320 or dark: await p.screenshot(path=f'{OUT}/L_{ui}_{W}_{trk}_{v}.png')
        await p.evaluate("location.hash='parcours';route();document.querySelectorAll('.unit').forEach(u=>u.classList.remove('folded'))"); await grab(p,f'{tag0} {trk}/parcours déplié',dark)
        for js in [f"nodeSheet('{trk}',0,1)",f"nodeSheet('{trk}',4,13)",f"nodeSheet('{trk}',6,0)",f"guide('{trk}',0)",f"guide('{trk}',5)",f"rulesSheet('{trk}')",f"placeIntro('{trk}')","bankView()","themePicker()","myWords()","sectionPicker()","accountPicker()","accountForm(null)","exportAcc()","importAcc()","unitPicker(curCid())","storyGenPicker('"+sec+"')","langPicker(()=>{})","quitAsk&&0","hangulChart&&S.sec==='ko'&&hangulChart()"]:
          try:
            await p.evaluate("closeModal()"); await p.evaluate(js); await p.wait_for_timeout(200); await grab(p,f'{tag0} {trk}/{js}',dark)
          except Exception as e: pass
        await p.evaluate("closeModal()")
        types=await p.evaluate(f"(()=>{{const C=COURSES['{trk}'];const ctx=ctxFor('{trk}',C.units);ctx.allHj=C.units.flatMap(x=>x.hj||[]);const T=['mc','mcw','tiles','tilesRev','listenTiles','type','listen','speak','match','choice','dictee','spot','part2','conv','read','photo','jamo','jamoRev','hear','readw','build'];window.__ex=[];T.forEach(t=>{{for(let i=0;i<3;i++){{try{{const e=make(t,ctx);if(e)window.__ex.push(e)}}catch(e){{}}}}}});window.__ex=window.__ex.concat(writeTasks('{trk}',2,0),writeTasks('{trk}',9,1));return window.__ex.map(e=>e.t)}})()")
        for i,t in enumerate(types):
          await p.evaluate(f"if(L)closeLesson();openSession({{mode:'train',cid:'{trk}',exs:[window.__ex[{i}]]}})"); await p.wait_for_timeout(120); await grab(p,f'{tag0} {trk}/exercice {t}',dark)
          if i%3==0 and dark: await p.screenshot(path=f'{OUT}/X_{ui}_{trk}_{t}.png')
          try:
            await p.click('#skip',timeout=800); await p.wait_for_timeout(150); await grab(p,f'{tag0} {trk}/correction {t}',dark)
            if i%3==0 and dark: await p.screenshot(path=f'{OUT}/X_{ui}_{trk}_{t}_fb.png')
            await p.click('#cont',timeout=800); await p.wait_for_timeout(250); await grab(p,f'{tag0} {trk}/fin',dark)
          except Exception: pass
        await p.evaluate("if(L)closeLesson();closeModal()")
        await p.evaluate(f"playStory('{sec}',allStories('{sec}')[0])"); await p.wait_for_timeout(150)
        for i in range(5):
          try: await p.click('#snext',timeout=600); await p.wait_for_timeout(60)
          except Exception: break
        await grab(p,f'{tag0} {trk}/histoire',dark); await p.evaluate("closeLesson()")
      await c.close()
    json.dump(ALL,open(f'{OUT}/layout_{ui}.json','w'),ensure_ascii=False,indent=0)
    print(ui,len(ALL),'anomalies | erreurs JS',errs[:5]); await b.close()
asyncio.run(main())
