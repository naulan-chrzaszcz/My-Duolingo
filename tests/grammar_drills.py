import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
# Notions de grammaire : chaque gabarit tiré 40 fois (options distinctes, bonne réponse présente, aucune accolade
# restante, choix liés de même taille), paires de traduction (bonne traduction acceptée, traductions fautives refusées),
# traductions des consignes, correspondance avec les unités, puis une séance complète par notion dans chaque langue.
import asyncio
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
CHECK = r"""(ui)=>{const bad=[];const B=m=>{if(bad.length<300)bad.push(m)};let n=0;
const need=ui==='fr'?null:(ui==='ko'?KO_TXT:EN_TXT);
for(const key in DRILL_SETS){const set=DRILL_SETS[key];
 // jeux visibles dans cette langue d'interface : anglais (fr, ko), « Learn French » (en, ko), coréen (fr, en)
 const shown=key==='en'?ui!=='en':key==='fr'?ui!=='fr':ui!=='ko'; if(!shown)continue;
 const base=key==='fr'?'en':'fr'; const tr=s=>{if(ui===base)return;if(!Object.prototype.hasOwnProperty.call(need,s))B(key+' traduction '+ui+' manquante : '+s.slice(0,90))};
 // tailles des choix liés
 const linked=(strs,id)=>{const sz={};strs.forEach(s=>{for(const m of String(s).matchAll(/\{(\d)=([^{}]*)\}/g)){const k=m[1],body=m[2];const len=body.startsWith('@')?(set.lex[body.slice(1)]||[]).length:body.split('|').length;if(sz[k]&&sz[k]!==len)B(id+' : choix lié '+k+' de tailles différentes');sz[k]=len}})};
 for(const no of set.notions){tr(no.t);tr(no.d);
  for(const sub of no.subs){tr(sub.t);tr(sub.memo);sub.r.forEach(tr);
   sub.i.forEach((it,j)=>{const id=sub.id+'#'+j;linked([it[0],...it[1],it[3]||'',...(it[4]||[])],id);
    const rs=Array.isArray(it[2])?it[2]:[it[2]];if(!rs.length||rs.some(x=>!(x>=0&&x<sub.r.length)))B(id+' : n° de règle invalide');
    if(Array.isArray(it[2])){const t1=[it[0],...it[1]].join(' ').match(/\{1=([^{}]*)\}/);const n1=t1?(t1[1].startsWith('@')?(set.lex[t1[1].slice(1)]||[]).length:t1[1].split('|').length):0;if(n1!==it[2].length)B(id+' : liste de règles de '+it[2].length+' pour un choix lié de '+n1);}
    if((it[0].match(/___/g)||[]).length!==1)B(id+' : il faut exactement un ___');
    for(let k=0;k<40;k++){const g=genItem(set,sub,j);if(!g){B(id+' : aucun tirage valable');break}n++;
     const all=[g[0],...g[1],g[3],g._h||'',...(g._a||[])].join(' ');if(/[{}]/.test(all))B(id+' : accolade restante — '+all.slice(0,80));
     if(new Set(g[1]).size!==g[1].length)B(id+' : options en double — '+g[1].join(' / '));
     if(new Set(g[1].map(o=>norm(o,set.lang))).size!==g[1].length)B(id+' : options identiques une fois normalisées — '+g[1].join(' / '));
     if(g[1].some(o=>!String(o).trim()))B(id+' : option vide');}});
   (sub.p||[]).forEach((p,j)=>{const id=sub.id+'@'+j;linked([...Object.values(p.s),...p.t,...(p.x||[])],id);
    for(let k=0;k<25;k++){const ps=(sub.p||[]).filter(x=>x.s[UI]);if(!ps.includes(p))break;const g=genPair(set,sub,ps.indexOf(p));n++;
     const all=g.join(' ')+' '+g._x.join(' ');if(/[{}]/.test(all))B(id+' : accolade restante');
     const ans=g.slice(1);ans.forEach(a=>{if(!checkText(a,ans,set.lang).ok)B(id+' : bonne traduction refusée — '+a)});
     if(!checkText(g[1],[g[1]],set.lang).ok)B(id+' : réponse refusée');
     g._x.forEach(x=>{if(ans.some(a=>norm(a,set.lang)===norm(x,set.lang)))B(id+' : traduction fautive identique à une bonne — '+x);});
     if(g._x.length<3)B(id+' : moins de 3 traductions fautives');}});}}
 // correspondance avec les unités des cours
 for(const cid in set.units){const C=COURSES[cid];if(!C)continue;const ts=new Set(C.units.map(U=>U.t0||U.t));
  for(const t in set.units[cid]){if(!ts.has(t))B(key+' : unité inconnue dans '+cid+' — '+t);set.units[cid][t].forEach(id=>{if(!drillSub(id))B(key+' : règle inconnue '+id)})}}}
return {n,bad}}"""
# v38 : rien de prévisible — au moins 8 gabarits par règle, une bonne réponse qui change d'une phrase à l'autre,
# un ordre d'exercices qui change d'une séance à l'autre et peu de phrases identiques dans une séance sur une seule règle
PREDICT = r"""(cid)=>{const set=drillSetFor(cid);const bad=[];const orders=new Set();
 for(let k=0;k<12;k++)orders.add(drillExercises(cid).map(e=>e.t).join(','));
 if(orders.size<6)bad.push(cid+' : ordre des exercices trop régulier ('+orders.size+' ordres sur 12 séances)');
 for(const no of set.notions)for(const sub of no.subs){
  if(sub.i.length<8)bad.push(sub.id+' : seulement '+sub.i.length+' gabarits');
  const ans=new Map();let tot=0;for(let j=0;j<sub.i.length;j++)for(let k=0;k<10;k++){const g=genItem(set,sub,j);if(!g)continue;tot++;ans.set(g[1][0],(ans.get(g[1][0])||0)+1)}
  const top=Math.max(...ans.values())/tot;if(top>0.55)bad.push(sub.id+' : la même bonne réponse revient '+Math.round(top*100)+' % du temps');
  let dup=0;for(let k=0;k<50;k++){const qs=drillExercises(cid,sub.id).map(e=>e.q);dup+=qs.length-new Set(qs).size}
  if(dup/50>3.5)bad.push(sub.id+' : '+(dup/50).toFixed(1)+' phrases identiques par séance');}
 return bad}"""
SESSION = r"""(cid)=>{const set=drillSetFor(cid);const out=[];[undefined,...set.notions.map(n=>n.id),...set.notions.flatMap(n=>n.subs.map(s=>s.id))].forEach(pick=>{const exs=drillExercises(cid,pick);out.push([pick||'tout',exs.length,exs.map(e=>e.t).join(',')]);});return out}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":390,"height":844},is_mobile=True,has_touch=True); p.set_default_timeout(4000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    total=0; problems=[]
    for ui,cids in [('fr',['en-daily','ko']),('en',['fr-fle','ko']),('ko',['en-toeic','fr-fle'])]:
      await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))"); await p.reload(); await p.wait_for_timeout(600)
      r=await p.evaluate(CHECK, ui); total+=r['n']; problems+=[ui+' | '+x for x in r['bad']]
      print(f'== {ui} : {r["n"]} phrases générées, anomalies {len(r["bad"])}')
      for cid in cids:
        pr=await p.evaluate(PREDICT, cid); problems+=[f'{ui} {x}' for x in pr]
        sess=await p.evaluate(SESSION, cid)
        short=[s for s in sess if s[1]<10]
        if short: problems+=[f'{ui} {cid} séance trop courte {s}' for s in short]
        print(f'   {cid} : {len(sess)} séances possibles, ex. {sess[0][2]}')
        # séance « tout mélanger » jouée jusqu'au bout avec les bonnes réponses
        await p.evaluate(f"if(L)closeLesson();closeModal();startDrills('{cid}')"); await p.wait_for_timeout(200); k=0
        while await solve(p):
          k+=1
          if k>40: break
        ok=await p.evaluate("!!document.querySelector('#endc')")
        while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
        print(f'   {cid} : séance jouée, {k} étapes, {"fin OK" if ok else "interrompue"} · réussite enregistrée {await p.evaluate("JSON.stringify(S.drill||{}).length")} car.')
        if not ok: problems.append(f'{ui} {cid} : séance interrompue à {k}')
        # une mauvaise réponse écrite est refusée
        await p.evaluate(f"""(()=>{{const set=drillSetFor('{cid}');const sub=set.notions.flatMap(n=>n.subs).find(s=>s.i.some(i=>i[3]));const it=genItem(set,sub,sub.i.findIndex(i=>i[3]));const ctx=ctxFor(drillCid(set),[],{{noDrill:true}});ctx.c=[it];openSession({{mode:'train',cid:drillCid(set),exs:[make('fill',ctx)]}})}})()""")
        wrong=await p.evaluate("(()=>{const o=L.ex;const set=drillSetFor(L.cid);return o.t})()")
        await p.fill('#tin','zzz'); await p.click('#chk'); cls=await p.evaluate("document.querySelector('#lfoot').className")
        if 'bad' not in cls: problems.append(f'{ui} {cid} : réponse « zzz » acceptée ({wrong})')
        await p.evaluate("closeLesson()")
      # carte d'entraînement et fenêtre de choix
      for sec in sorted(set(['en' if c.startswith('en') else 'fr' if c=='fr-fle' else 'ko' for c in cids])):
        trk={'en':'en-daily','fr':'fr-fle','ko':'ko'}[sec]
        await p.evaluate(f"S.sec='{sec}';S.track['{sec}']='{trk}';save();location.hash='x';location.hash='entrainement';route()"); await p.wait_for_timeout(300)
        has=await p.evaluate("[...document.querySelectorAll('.tcard h3')].map(h=>h.textContent)")
        card=[h for h in has if 'Notions' in h or 'Grammar topics' in h or '문법' in h]
        if not card: problems.append(f'{ui} {sec} : carte des notions absente')
        else:
          await p.evaluate("[...document.querySelectorAll('.tcard')].find(c=>/Notions|Grammar topics|문법/.test(c.textContent)).click()"); await p.wait_for_timeout(300)
          n=await p.evaluate("document.querySelectorAll('#modal [data-n]').length"); ns=await p.evaluate("document.querySelectorAll('#modal [data-s]').length")
          await p.evaluate("document.querySelector('#modal [data-s]').click()"); await p.wait_for_timeout(200)
          memo=await p.evaluate("(document.querySelector('#modal h2')||{}).textContent")
          await p.evaluate("document.querySelector('#dgo').click()"); await p.wait_for_timeout(300)
          st=await p.evaluate("L?L.q.length+1:0")
          print(f'   carte {card[0]!r} : {n} notions, {ns} règles, mémo {memo!r}, séance de {st} exercices')
          if n<5 or st<10: problems.append(f'{ui} {sec} : fenêtre des notions incomplète ({n} notions, séance {st})')
          await p.evaluate("if(L)closeLesson();closeModal()")
    # effets : sons synthétisés, motifs de vibration, éclats de couleurs
    fx=await p.evaluate("""(()=>{S.set.sound=true;S.set.haptic=true;let osc=0;const AC0=window.AudioContext;const o=AC0.prototype.createOscillator;AC0.prototype.createOscillator=function(){osc++;return o.call(this)};
      const vib=[];const v0=navigator.vibrate;navigator.vibrate=x=>{vib.push(JSON.stringify(x));return true};
      const r={};['tap','ok','bad','combo','win','match'].forEach(t=>{const n0=osc;beep(t,3);r[t]=osc-n0});
      AC0.prototype.createOscillator=o;navigator.vibrate=v0;burst(100,100,10);const nb=document.querySelectorAll('.burst i').length;return {r,vib,nb}})()""")
    print('effets :',fx)
    if any(v==0 for v in fx['r'].values()): problems.append('effets sonores muets : '+str(fx['r']))
    if len(set(fx['vib']))<5: problems.append('motifs de vibration trop proches : '+str(fx['vib']))
    if fx['nb']<10: problems.append('éclat de couleurs absent')
    print(f'TOTAL {total} phrases générées')
    for x in problems[:120]: print('!!',x)
    print('PROBLEMES :',problems[:3]); print('erreurs JS :',errs[:5]); await b.close()
asyncio.run(main())
