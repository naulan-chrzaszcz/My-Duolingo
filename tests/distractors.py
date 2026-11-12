import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    for ui,cids in [('fr',['en-daily','en-pro','en-toeic','ko']),('ko',['fr-fle'])]:
      await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6}}))"); await p.reload(); await p.wait_for_timeout(600)
      for cid in cids:
        r=await p.evaluate(f"""(()=>{{const C=COURSES['{cid}'];const out=[];[1,6,12,C.units.length-2].forEach(u=>{{const U=C.units[u];if(!U||U.hg)return;const ctx=ctxFor('{cid}',[U]);for(let i=0;i<3;i++){{const e=make('mcw',ctx);if(e&&e.w)out.push('« '+e.prompt+' » → ['+e.answer+'] '+e.options.filter(o=>o!==e.answer).join(' | '))}}const e=make('mc',ctx);if(e&&!e.w)out.push('  PHRASE « '+e.prompt+' » → ['+e.answer+'] '+e.options.filter(o=>o!==e.answer).join(' | '))}});return out}})()""")
        print('==',ui,cid); [print('  ',x[:230]) for x in r]
    print(errs); await b.close()
asyncio.run(main())
