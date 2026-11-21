import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
# Le contenu étudié n'est jamais traduit par le traducteur de l'interface (tuile « demain » restée « demain » en interface anglaise),
# et une lettre majuscule seule n'est pas lue « capital A » par la synthèse vocale.
import asyncio
from playwright.async_api import async_playwright

RENDER = r"""async ()=>{
  const d=document.createElement('div');document.body.appendChild(d);const out={};
  const wait=()=>new Promise(r=>setTimeout(r,120));
  R.tiles({t:'tiles',tiles:['À','demain','et','Toi','jours','Super'],prompt:'See you tomorrow!',lang:'fr-FR',answer:'À demain !'},d);await wait();
  out.tiles=[...d.querySelectorAll('.tile')].map(x=>x.textContent);out.title1=d.querySelector('.ltitle').textContent;
  R.choice({t:'choice',kind:'volt',lang:'fr-FR',q:'Il ___ là, et il attend demain.',options:['et','est','Or','Normal'],answer:'est'},d);await wait();
  out.opts=[...d.querySelectorAll('.opt span:not(.k)')].map(x=>x.textContent);out.q=d.querySelector('.qcard').textContent;
  R.match({t:'match',lang:'fr-FR',pairs:[['tomorrow','demain'],['and','et'],['you','Toi']]},d);await wait();
  out.match=[...d.querySelectorAll('.mt')].map(x=>x.textContent).sort();
  d.innerHTML='<span lang="fr-FR">demain</span><span>demain</span>';await wait();
  out.lang=[...d.querySelectorAll('span')].map(x=>x.textContent);
  d.remove();return out;}"""

async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(); p = await b.new_page(); bad = []
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)))
    await p.goto(APP_URL); await p.wait_for_timeout(300)
    await p.evaluate("localStorage.clear();localStorage.setItem('speakeasy-ui','en');localStorage.setItem('speakeasy-accounts',JSON.stringify({current:'a1',list:[{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}]}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({onb:true,pv:6}))")
    await p.reload(); await p.wait_for_timeout(600)
    r = await p.evaluate(RENDER)
    print(r)
    if r['tiles'] != ['À', 'demain', 'et', 'Toi', 'jours', 'Super']: bad.append(('tuiles traduites', r['tiles']))
    if r['opts'] != ['et', 'est', 'Or', 'Normal']: bad.append(('options traduites', r['opts']))
    if 'demain' not in r['q']: bad.append(('énoncé traduit', r['q']))
    if 'demain' not in r['match'] or 'et' not in r['match'] or 'Toi' not in r['match']: bad.append(('paires traduites', r['match']))
    if r['lang'] != ['demain', 'tomorrow']: bad.append(('attribut lang / interface', r['lang']))
    if r['title1'] != 'Translate this sentence': bad.append(("consigne d'interface non traduite", r['title1']))
    # synthèse vocale : lettre seule lue en minuscule, « I » lu « eye », phrases inchangées
    for t, l, exp in [('A', 'en-US', 'a'), ('A.', 'en-US', 'a.'), ('À', 'fr-FR', 'à'), ('I', 'en-US', 'eye'), ('a', 'en-US', 'a'),
                      ('A cat.', 'en-US', 'A cat.'), ('OK', 'en-US', 'OK'), ('À demain !', 'fr-FR', 'À demain !')]:
      got = await p.evaluate("([t,l])=>speakParts(t,l).map(x=>x[0]).join(' | ')", [t, l])
      print('OK ' if got == exp else '!! ', repr(t), l, '→', repr(got))
      if got != exp: bad.append(('voix', t, got))
    print('erreurs JS :', errs)
    print('PROBLEMES :', bad)
    await b.close()
asyncio.run(main())
