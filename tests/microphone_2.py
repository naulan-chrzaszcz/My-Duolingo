import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'microphone.py')).read().split('async def run')[0])
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); c=await b.new_context(**pw.devices['iPhone 13']); await c.add_init_script(GOOD.replace("start(){","start(){window.__st=(window.__st||0)+1;")); p=await c.new_page(); errs=[]; p.on('pageerror',lambda e:errs.append(str(e)[:300])); p.on('console',lambda m:errs.append('c:'+m.text[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(200); await p.evaluate(seed); await p.reload(); await p.wait_for_timeout(500)
    await p.evaluate("trainSpeak(['en-daily'])"); await p.wait_for_timeout(300)
    await p.evaluate("window.__say=L.ex.text"); await p.click('#micb'); await p.wait_for_timeout(1000)
    print(await p.evaluate("[window.__st,L.state,(document.querySelector('#micst')||{}).textContent,(document.querySelector('#micb')||{}).textContent]"),errs)
    await b.close()
asyncio.run(main())
