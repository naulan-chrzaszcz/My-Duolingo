import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(); p.set_default_timeout(3000); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.route('https://images.unsplash.com/**',lambda r:r.abort())
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    for ui,secs in [('fr',['en','fr','ko']),('ko',['en','fr'])]:
      await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))"); await p.reload(); await p.wait_for_timeout(500)
      await p.evaluate("Object.keys(COURSES).forEach(c=>{S.dn[c]={};COURSES[c].units.forEach((U,u)=>S.dn[c][u]=262143)});S.bank={en:[{id:'a',w:'Test',tr:'test',added:1,box:0,due:0},{id:'b',w:'deadline',tr:'',ex:'The deadline is Friday.',added:1,box:0,due:0}],fr:[{id:'c',w:'valise',tr:'',added:1,box:0,due:0}],ko:[{id:'d',w:'커피',tr:'café',added:1,box:0,due:0}]};save()")
      for sec in secs:
        tracks=await p.evaluate(f"SECTIONS.find(s=>s.id==='{sec}').tracks")
        for trk in tracks:
          await p.evaluate(f"S.sec='{sec}';S.track['{sec}']='{trk}';location.hash='entrainement';route()"); await p.wait_for_timeout(200)
          n=await p.evaluate("document.querySelectorAll('.tcard').length"); tested=0
          for i in range(n):
            for kind in ['sound','mic']:
              await p.evaluate("S.listenOff=0;S.speakOff=0;if(L){L=null;document.querySelector('#lesson').classList.add('hidden')}closeModal();route()"); await p.wait_for_timeout(80)
              await p.evaluate(f"document.querySelectorAll('.tcard')[{i}].click()"); await p.wait_for_timeout(250)
              if not await p.evaluate("!!L&&!!L.q"): continue
              e0=len(errs)
              r=await p.evaluate(f"""(()=>{{for(let k=0;k<40&&L&&L.ex;k++){{const want='{kind}'==='mic'?L.ex.t==='speak':isAudioEx(L.ex);if(want){{const t=L.ex.t;pauseAudio('{kind}');return [t,L?L.ex&&L.ex.t:'fin',L?L.state:'-']}}if(!L.q.length)return null;nextEx();}}return null}})()""")
              if r: tested+=1
              if len(errs)>e0: print('ERREUR',ui,trk,i,kind,r,errs[-1])
              elif r and r[2] not in ('answer','-') and not await p.evaluate("!!document.querySelector('#endc')"): print('BLOQUÉ',ui,trk,i,kind,r)
          print(ui,trk,'cartes',n,'pauses testées',tested)
    print('erreurs',errs[:5]); await b.close()
asyncio.run(main())
