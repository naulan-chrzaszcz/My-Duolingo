import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(viewport={"width":1034,"height":700}); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e.stack)[:500]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','fr');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6,sec:'en',bank:{en:[{id:'w1',w:'Test',tr:'test',added:1,box:0,due:0},{id:'w2',w:'deadline',tr:'',added:1,box:0,due:0},{id:'w3',w:'suitcase',tr:'valise',ex:'My suitcase is heavy.',exTr:'Ma valise est lourde.',added:1,box:0,due:0},{id:'w4',w:'to look forward to',tr:'avoir hâte de',added:1,box:0,due:0}]}}))")
    await p.reload(); await p.wait_for_timeout(600)
    # « S'entraîner » en haut de la fenêtre, et toujours visible après avoir fait défiler une longue liste
    await p.evaluate("S.bank.en=S.bank.en.concat(Array.from({length:60},(_,i)=>({id:'x'+i,w:'word '+i,tr:'mot '+i,added:1,box:0,due:Date.now()+864e5})));save();bankView()"); await p.wait_for_timeout(300)
    pos=await p.evaluate("(()=>{const b=document.querySelector('#btrain'),l=document.querySelector('#blist');return [b.getBoundingClientRect().top<l.getBoundingClientRect().top,!b.disabled]})()")
    await p.evaluate("document.querySelector('.mcard').scrollTop=99999"); await p.wait_for_timeout(200)
    vis=await p.evaluate("(()=>{const b=document.querySelector('#btrain').getBoundingClientRect(),m=document.querySelector('.mcard').getBoundingClientRect();return b.top>=m.top-1&&b.bottom<=m.bottom+1})()")
    print('bouton en haut :',pos,'visible après défilement :',vis)
    prob=[] if (pos[0] and pos[1] and vis) else ['bouton S\'entraîner mal placé '+str(pos)+' '+str(vis)]
    await p.evaluate("closeModal();S.bank.en=S.bank.en.filter(w=>!w.id.startsWith('x'));save()")
    await p.evaluate("bankSession('en')"); await p.wait_for_timeout(300)
    for _ in range(3):
      await p.evaluate("if(L){L=null;document.querySelector('#lesson').classList.add('hidden')};bankSession('en')")
      print('QCM :',await p.evaluate("[L.ex,...L.q].filter(e=>e.t==='mc').map(e=>e.prompt+' → '+e.options.join(' | '))"))
    await p.evaluate("if(L){L=null;document.querySelector('#lesson').classList.add('hidden')};bankSession('en')")
    print('file :',await p.evaluate("[L.ex.t,...L.q.map(e=>e.t)].join(',')"))
    for i in range(12):
      if not await p.evaluate("!!L&&L.state==='answer'"): break
      s=await p.evaluate("[L.ex.t,(document.querySelector('.ltitle')||{}).textContent,(document.querySelector('#skip')||{}).textContent,L.q.length]")
      await p.click('#skip'); await p.wait_for_timeout(300)
      if await p.evaluate("!!L&&L.state==='feedback'"): await p.click('#cont'); await p.wait_for_timeout(200)
      print(s,'→',await p.evaluate("L?[L.ex&&L.ex.t,L.state,L.q.length,(document.querySelector('.ltitle')||{}).textContent]:'fermé'"),'| fin',await p.evaluate("!!document.querySelector('#endc')"))
    # QCM « Comment dit-on ce mot ? » : jamais moins de 4 choix, même ponctuation finale, pièges de l'IA d'abord,
    # vocabulaire du FLE pour Voltaire, même terminaison en coréen ; un mot en révision s'écrit avant d'être revu
    await p.evaluate("if(L){L=null;document.querySelector('#lesson').classList.add('hidden')}")
    chk=await p.evaluate("""(()=>{const pb=[];const end=x=>(x.trim().match(/[?!.…]$/)||[''])[0];
      const sess=(sec,list)=>{S.bank[sec]=list;bankSession(sec);const q=[L.ex,...L.q];L=null;document.querySelector('#lesson').classList.add('hidden');return q};
      const mcs=q=>q.filter(e=>e.t==='mc');
      for(let i=0;i<5;i++){
        const q=sess('en',[{id:'a',w:'stakeholder',tr:'partie prenante',box:0,due:0,traps:['shareholder','stockholder','bystander']},{id:'b',w:'Break a leg!',tr:'Bonne chance !',box:0,due:0},{id:'c',w:'nevertheless',tr:'néanmoins',box:0,due:0}]);
        mcs(q).forEach(e=>{if(e.options.length!==4)pb.push('QCM à '+e.options.length+' choix : '+e.answer);if(e.options.some(o=>end(o)!==end(e.answer)))pb.push('ponctuation différente : '+e.options.join(' | '))});
        const st=mcs(q).find(e=>e.answer==='stakeholder');if(!st||!['shareholder','stockholder','bystander'].every(t=>st.options.includes(t)))pb.push('pièges IA ignorés : '+(st&&st.options.join(' | ')));
        if(mcs(q).some(e=>e.answer==='Break a leg!'))pb.push('QCM sans pièges crédibles pour Break a leg!');
        if(!q.some(e=>e.t==='type'&&e.answer==='Break a leg!'))pb.push('Break a leg! sans écriture');
        const v=sess('fr',[{id:'v',w:'quoique',tr:'bien que',box:0,due:0}]);const vm=mcs(v)[0];
        if(!vm||vm.options.length!==4)pb.push('Voltaire, un seul mot : QCM '+(vm?vm.options.join(' | '):'absent'));
        const k=sess('ko',[{id:'k1',w:'감사합니다',tr:'merci',box:0,due:0},{id:'k2',w:'회의',tr:'réunion',box:0,due:0}]);
        mcs(k).forEach(e=>{if(e.answer==='감사합니다')pb.push('coréen : QCM 감사합니다 avec '+e.options.join(' | '));if(e.options.some(o=>/다$/.test(o)))pb.push('coréen : terminaison différente '+e.options.join(' | '))});
        const r=sess('en',[{id:'r1',w:'deadline',tr:'date limite',box:2,due:0},{id:'r2',w:'invoice',tr:'facture',box:1,due:0},{id:'n1',w:'suitcase',tr:'valise',box:0,due:0}]);
        if(!['r1','r2'].every(id=>r.findIndex(e=>e._bank===id)===r.findIndex(e=>e._bank===id&&e.t==='type')))pb.push('révision : le mot est montré avant d’être écrit '+r.map(e=>e.t+':'+e._bank).join(','));
        if(r.slice(0,2).some(e=>e.t!=='type'))pb.push('révision : l’écriture ne vient pas en premier '+r.map(e=>e.t+':'+e._bank).join(','));
        if(mcs(r).some(e=>e._bank!=='n1'))pb.push('révision : QCM pour un mot en révision');
        if(!mcs(r).length)pb.push('nouveau mot sans QCM');
      }
      return [...new Set(pb)]})()""")
    prob+=chk
    print('PROBLEMES :',prob)
    print(errs); await b.close()
asyncio.run(main())
