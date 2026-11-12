import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio,json,sys
from playwright.async_api import async_playwright
DEV={'iphoneSE':dict(viewport={'width':375,'height':667},device_scale_factor=2,is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'),
     'iphone15PM':dict(viewport={'width':430,'height':932},device_scale_factor=3,is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'),
     'pixel7':dict(viewport={'width':412,'height':915},device_scale_factor=2.6,is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'),
     'galaxy360':dict(viewport={'width':360,'height':740},device_scale_factor=3,is_mobile=True,has_touch=True,user_agent='Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36')}
CHECK=r"""()=>{const W=innerWidth,out={small:[],tiny:[],over:[],nolabel:[],imgs:[]};
const top=document.querySelector('#lesson:not(.hidden)')||(!document.querySelector('#modal').classList.contains('hidden')&&document.querySelector('#modal'))||document.body;
const vis=e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return r.width>1&&r.height>1&&cs.visibility!=='hidden'&&cs.display!=='none'&&r.bottom>0&&r.top<innerHeight*4?r:null};
for(const e of top.querySelectorAll('button,a,select,input,[onclick],.opt,.tile,.node,.tcard,.chip,.chipbtn,.switch')){const r=vis(e);if(!r)continue;
 const t=(e.innerText||e.getAttribute('aria-label')||e.value||e.placeholder||'').trim().replace(/\s+/g,' ').slice(0,30);
 if((r.width<36||r.height<36)&&!e.closest('.lgl,.notr.dots'))out.small.push(e.tagName+'.'+(e.className||'').toString().slice(0,20)+' «'+t+'» '+Math.round(r.width)+'×'+Math.round(r.height));
 if(!t&&!e.querySelector('img,svg')&&e.tagName!=='INPUT')out.nolabel.push(e.tagName+'.'+(e.className||'').toString().slice(0,30));
 if(r.right>W+1&&!e.closest('[style*=overflow],.tracks,.chips,.lgtabs')){let p=e.parentElement,sc=false;while(p){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'){sc=true;break}p=p.parentElement}if(!sc)out.over.push(t+' →'+Math.round(r.right))}}
const w=document.createTreeWalker(top,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const t=n.nodeValue.trim();if(t.length<3)continue;const el=n.parentElement;if(!el||!vis(el))continue;const fs=parseFloat(getComputedStyle(el).fontSize);if(fs<12)out.tiny.push(Math.round(fs)+'px «'+t.slice(0,30)+'» .'+el.className)}
for(const im of top.querySelectorAll('img')){if(!im.alt&&vis(im))out.imgs.push(im.src.slice(-40))}
out.scrollW=document.documentElement.scrollWidth;out.W=W;out.dom=document.getElementsByTagName('*').length;
['small','tiny','nolabel','over','imgs'].forEach(k=>out[k]=[...new Set(out[k])].slice(0,12));return out}"""
async def main():
  dev=sys.argv[1]; scheme=sys.argv[2]; ui=sys.argv[3] if len(sys.argv)>3 else 'fr'
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); c=await b.new_context(**DEV[dev],color_scheme=scheme,locale={'fr':'fr-FR','en':'en-US','ko':'ko-KR'}[ui]); p=await c.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.route('https://images.unsplash.com/**',lambda r:r.abort())
    t0=await p.evaluate("Date.now()") if False else None
    await p.goto(APP_URL); await p.wait_for_timeout(700)
    perf=await p.evaluate("(()=>{const n=performance.getEntriesByType('navigation')[0];return {dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd)}})()")
    await p.screenshot(path=f'{OUT}/A/{dev}_{scheme}_00first.png')
    res={'perf':perf}
    await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'Marie-Christine',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6,sec:'en',xp:1234,gems:340,streak:12,lastDay:new Date().toISOString().slice(0,10),dn:{{'en-daily':{{0:262143,1:262143,2:4095}}}},bank:{{en:[{{id:'w',w:'deadline',tr:'date limite',added:1,box:0,due:0}}]}}}}))")
    await p.reload(); await p.wait_for_timeout(800)
    screens=[('01parcours',"location.hash='parcours'"),('02train',"location.hash='entrainement'"),('03stories',"location.hash='histoires'"),('04league',"location.hash='ligue'"),('05shop',"location.hash='boutique'"),('06profile',"location.hash='profil'"),('07stats',"location.hash='stats'"),
      ('08unitsheet',"location.hash='parcours';setTimeout(()=>nodeSheet('en-daily',2,5),50)"),('09guide',"guide('en-daily',1)"),
      ('10mc',"openSession({mode:'train',cid:'en-daily',exs:[make('mcw',ctxFor('en-daily',[COURSES['en-daily'].units[2]]))]})"),
      ('11tiles',"openSession({mode:'train',cid:'en-daily',exs:[make('tilesRev',ctxFor('en-daily',[COURSES['en-daily'].units[2]]))]})"),
      ('12type',"openSession({mode:'train',cid:'en-daily',exs:[make('type',ctxFor('en-daily',[COURSES['en-daily'].units[2]]))]})"),
      ('13speak',"openSession({mode:'train',cid:'en-daily',exs:[make('speak',ctxFor('en-daily',[COURSES['en-daily'].units[2]]))]})"),
      ('14match',"openSession({mode:'train',cid:'en-daily',exs:[make('match',ctxFor('en-daily',[COURSES['en-daily'].units[2]]))]})"),
      ('15conv',"openSession({mode:'train',cid:'en-toeic',exs:[make('conv',ctxFor('en-toeic',COURSES['en-toeic'].units))]})"),
      ('16story',"playStory('en',allStories('en')[3])")]
    for name,js in screens:
      await p.evaluate("if(L){L=null;document.querySelector('#lesson').classList.add('hidden')}closeModal()"); await p.evaluate(js); await p.wait_for_timeout(450)
      if name in('10mc','11tiles','12type'):
        await p.screenshot(path=f'{OUT}/A/{dev}_{scheme}_{name}.png')
        try:
          await p.click('#skip',timeout=800); await p.wait_for_timeout(300); name=name+'_fb'
        except Exception: pass
      res[name]=await p.evaluate(CHECK)
      await p.screenshot(path=f'{OUT}/A/{dev}_{scheme}_{name}.png')
    res['errs']=errs
    json.dump(res,open(f'{OUT}/A/{dev}_{scheme}.json','w'),ensure_ascii=False,indent=0)
    print(dev,scheme,'OK',perf,'erreurs',errs[:3]); await b.close()
asyncio.run(main())
