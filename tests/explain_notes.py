import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
# Bloc « À savoir » : un mot en -ed ou -ing n'est pas forcément un prétérit ou une forme progressive
PAST = "Au prétérit"; ING = "forme progressive"
T = [("I'm lowkey tired today.", None), ("I walked to work.", PAST), ("The train is delayed.", None), ("I need a bed.", None),
  ("He just arrived.", PAST), ("I got married last year.", None), ("We visited Paris and stayed two days.", PAST), ("There were a hundred people.", None),
  ("She is working now.", ING), ("This is interesting.", None), ("I'm really enjoying it.", ING), ("Is it something important?", None)]
# Étiquettes en trop : la majuscule de début de phrase tombe, pas celle d'un sigle, de I ou d'un nom propre
C = [("ID", "ID"), ("TV", "TV"), ("I", "I"), ("I'm", "I'm"), ("Monday", "Monday"), ("The", "the"), ("Hello", "hello"), ("delayed", "delayed")]
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(); p = await b.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:200]))
    await p.goto(APP_URL); await p.wait_for_timeout(400)
    bad = 0
    for s, want in T:
      h = await p.evaluate("s=>explainHtml({t:'type',prompt:'x',lang:'en-US',answer:s,_cid:'en-daily'},{ok:true},null)", s)
      got = [k for k in (PAST, ING) if k in h]
      ok = got == ([want] if want else [])
      bad += not ok
      print('OK ' if ok else '!! ', s.ljust(40), got)
    for w, want in C:
      got = await p.evaluate("w=>tileCase(w)", w)
      bad += got != want
      print('OK ' if got == want else '!! ', w, '→', got)
    print('erreurs JS', errs)
    print('inattendus :', bad); await b.close()
asyncio.run(main())
