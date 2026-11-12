import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
T=[("it's a 10 minutes walk",["It's a ten-minute walk."],'en-US',True),("its a ten minute walk",["It's a ten-minute walk."],'en-US',True),("i have 2 brothers and 1 sister",["I have two brothers and one sister."],'en-US',True),
("she is twenty one",["She is 21."],'en-US',True),("there are two hundred and fifty people",["There are 250 people."],'en-US',True),("can i have bill please",["Can I have the bill, please?"],'en-US',True),
("i would like coffe",["I'd like a coffee."],'en-US',True),("he is",["She is"],'en-US',False),("i like dogs",["I like cats."],'en-US',False),("the meeting was postponned untill tommorow",["The meeting was postponed until tomorrow."],'en-US',True),
("where is the train station",["Where is the bank?"],'en-US',False),("i am not hungry",["I am hungry."],'en-US',False),("i dont agree",["I agree."],'en-US',False),
("j'ai 25 ans",["J'ai vingt-cinq ans."],'fr-FR',True),("il est 8 heures",["Il est huit heures."],'fr-FR',True),("j'ai quatre vingt dix ans",["J'ai 90 ans."],'fr-FR',True),("elle a soixante et onze ans",["Elle a 71 ans."],'fr-FR',True),("je voudrais cafe s'il vous plait",["Je voudrais un café, s'il vous plaît."],'fr-FR',True),
("je suis fatigue",["Je ne suis pas fatigué."],'fr-FR',False),("안녕하세요 저는 민지에요",["안녕하세요, 저는 민지예요."],'ko-KR',True),("감사합니다",["고맙습니다"],'ko-KR',False),("커피",["커피 주세요"],'ko-KR',False)]
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(); p=await b.new_page()
    await p.goto(APP_URL); await p.wait_for_timeout(400)
    await p.evaluate("localStorage.setItem('speakeasy-ui','en')"); await p.reload(); await p.wait_for_timeout(400); await p.evaluate("L={cid:'fr-fle'}")
    bad=0
    for v,ans,lang,exp in T:
      r=await p.evaluate("([v,a,l])=>checkText(v,a,l,false)",[v,ans,lang]); ok=bool(r.get('ok'))
      if ok!=exp: bad+=1
      print('OK ' if ok==exp else '!! ', 'accepté' if ok else 'refusé ', ('(faute de frappe)' if r.get('typo') else '').ljust(18), repr(v),'↔',ans[0])
    print('strict (dictée Voltaire) :',await p.evaluate("checkText('les lettre que j ai ecrites',['Les lettres que j\\'ai écrites.'],'fr-FR',true)"))
    print('inattendus :',bad); await b.close()
asyncio.run(main())
