import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,json
from playwright.async_api import async_playwright
JS=r"""()=>{const bad=[];const B=(c,m)=>{if(bad.length<400)bad.push(c+' | '+m)};let n=0;
const uniq=(a,lang)=>new Set(a.map(x=>norm(String(x),lang))).size===a.length;
for(const cid in COURSES){const C=COURSES[cid],lang=C.lang;const seenT=new Set();
 C.units.forEach((U,u)=>{const id=cid+' u'+(u+1)+' «'+U.t+'»';
  if(!U.t||!U.d)B(id,'titre/description manquant');if(seenT.has(U.t))B(id,'titre en double');seenT.add(U.t);
  if(typeof U.lv!=='number'||U.lv<0||U.lv>3)B(id,'niveau invalide '+U.lv);
  // toute unité doit pouvoir générer ses 18 étapes
  for(let s=0;s<NPU;s++){let L;try{L=buildLesson(cid,u,s)}catch(e){B(id,'étape '+s+' : exception '+e.message);continue}
   if(!L||L.length<4)B(id,'étape '+s+' : '+(L?L.length:0)+' exercices');
   (L||[]).forEach(ex=>{n++;const t=ex.t;
    if(t==='pic'&&!hasPic(ex.answer))B(id,'pic : image inconnue '+ex.answer);if(t==='photo'&&!ex.img&&!p1Svg(ex.answer))B(id,'photo sans dessin — '+ex.answer);
    if(['mc','choice','part2','conv','read','photo','hg','pic','picw'].includes(t)){
      if(!ex.options||ex.options.length<2)B(id,t+' : moins de 2 options');
      else{if(!ex.options.includes(ex.answer))B(id,t+' : bonne réponse absente des options — '+ex.answer);
       if(ex.options.some(o=>o==null||String(o).trim()===''))B(id,t+' : option vide');
       const lg=lang; /* QCM de grammaire et d'orthographe : les variantes (peut-être / peut être, 며칠 / 몇 일, ci-joint / ci joint) sont le sujet de l'exercice et se choisissent d'un clic, on compare donc le texte exact */ const same=t==='choice'?new Set(ex.options).size===ex.options.length:uniq(ex.options,lg); if(!same)B(id,t+' : options en double — '+ex.options.join(' / '));}
      if(t==='choice'&&!String(ex.q||'').trim())B(id,'choice sans question');}
    if(t==='tiles'||t==='listenTiles'||t==='tilesRev'){const al=ex.ansLang||ex.lang;const w=words(ex.answer);const pool=ex.tiles.slice();let ok=true;for(const x of w){const i=pool.indexOf(x);if(i<0){ok=false;break}pool.splice(i,1)}
      if(!ok)B(id,t+' : étiquettes insuffisantes — '+ex.answer);else if(norm(w.join(' '),al)!==norm(ex.answer,al))B(id,t+' : réponse non reconstituable — '+ex.answer);
      if(!w.length)B(id,t+' : réponse vide');if(/[()]/.test(ex.answer)&&!/#\d/.test(ex.answer)&&!/\(e\)/.test(ex.answer))B(id,t+' : parenthèse dans la réponse — '+ex.answer);}
    if(t==='type'||t==='listen'||t==='dictee'){if(!ex.answer)B(id,t+' sans réponse');else{const r=checkText(ex.answer,[ex.answer,...(ex.alts||[])],ex.lang);if(!r.ok)B(id,t+' : la bonne réponse est refusée — '+ex.answer);}}
    if(t==='match'){const l=ex.pairs.map(p=>p[0]),r=ex.pairs.map(p=>p[1]);if(new Set(l).size!==l.length||new Set(r).size!==r.length)B(id,'match : paire en double — '+JSON.stringify(ex.pairs));}
    if(t==='spot'){if(ex.before==null||ex.chunk==null||!ex.right)B(id,'spot incomplet — '+ex.q);if(ex.faulty&&ex.chunk===ex.right)B(id,'spot : faute identique à la bonne forme');}
    if(t==='build'){if(!ex.parts||!ex.parts.every(x=>ex.tiles.includes(x)))B(id,'build : lettres manquantes '+ex.syl);}
    if(t==='conv'&&!(ex.d&&ex.d.length))B(id,'conv sans dialogue');if(t==='read'&&!ex.x)B(id,'read sans texte');
   });}
  // contenus bruts
  (U.c||[]).forEach(c=>{if(!(c[2]>=0&&c[2]<c[1].length))B(id,'QCM : index invalide — '+c[0]);if(!c[3])B(id,'QCM sans explication — '+c[0]);if(new Set(c[1]).size!==c[1].length)B(id,'QCM : options identiques — '+c[0]);});
  (U.p||[]).forEach(p=>{if(!p[0]||!p[1])B(id,'phrase incomplète '+JSON.stringify(p));});
  const vs=(U.v||[]);if(new Set(vs.map(v=>v[0])).size!==vs.length)B(id,'vocabulaire : mot source en double — '+vs.map(v=>v[0]).join(', '));if(new Set(vs.map(v=>v[1])).size!==vs.length)B(id,'vocabulaire : traduction en double — '+vs.map(v=>v[1]).join(', '));
  ['l'].forEach(k=>(U[k]||[]).forEach(x=>{if(!(x[2]>=0&&x[2]<x[1].length))B(id,'Part 2 index invalide');}));
  ['cv','rd'].forEach(k=>(U[k]||[]).forEach(x=>(x.q||[]).forEach(q=>{if(!(q[2]>=0&&q[2]<q[1].length))B(id,k+' index invalide');})));
  (U.ph||[]).forEach(x=>{if(!(x[3]>=0&&x[3]<x[2].length))B(id,'photo index invalide');});
  (U.pk||[]).forEach(k=>{if(!hasPic(k))B(id,'image de vocabulaire inconnue '+k);});if(new Set(U.pk||[]).size!==(U.pk||[]).length)B(id,'image en double');
 });}
// histoires
for(const sec in STORIES)STORIES[sec].forEach(st=>{const id='histoire '+sec+' «'+st.t+'»';if(!st.items||st.items.length<4)B(id,'trop courte');let nq=0;st.items.forEach(it=>{if(it.q!==undefined){nq++;if(!(it.a>=0&&it.a<it.o.length))B(id,'question : index invalide');if(new Set(it.o).size!==it.o.length)B(id,'options en double');}else{if(!it.t)B(id,'réplique vide');if(!st.cast[it.s])B(id,'personnage inconnu '+it.s);}});if(!nq)B(id,'aucune question');});
return {n,bad}}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    out={}
    for ui in ['fr','en','ko']:
      await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))"); await p.reload(); await p.wait_for_timeout(600)
      r=await p.evaluate(JS); out[ui]=r['bad']
      print('==',ui,'exercices générés',r['n'],'| anomalies',len(r['bad']))
      for x in r['bad'][:70]: print('  ',x[:230])
    json.dump(out,open(OUT+'/v_data.json','w'),ensure_ascii=False,indent=0); print('erreurs JS',errs[:5]); await b.close()
asyncio.run(main())
