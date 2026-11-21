# v38.2 : bloc « À savoir » — repères de grammaire sans fausse note, notes écrites par phrase (champ « pe »),
# astuce de l'unité d'où vient la phrase, et « vrai mot à la place d'un autre » refusé comme faute de frappe.
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
import asyncio
from playwright.async_api import async_playwright
R = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
KO = json.load(open(os.path.join(R, 'i18n/ko.json')))

# (phrase, langue, repères attendus, repères interdits)
CASES = [
  ("We finished updating the website before Friday.", 'en-US', ['ed'], ['prog']),
  ("I go to bed late on weekends.", 'en-US', [], ['ed']),
  ("I need two bottles of milk.", 'en-US', [], ['ed']),
  ("My grandparents are retired.", 'en-US', [], ['ed']),
  ("Are pets allowed?", 'en-US', [], ['ed']),
  ("The flight has been delayed due to bad weather.", 'en-US', ['pp'], ['ed']),
  ("I had my car repaired.", 'en-US', [], ['ed', 'pp']),
  ("I think she will succeed.", 'en-US', ['will'], ['ed']),
  ("She opened the door and screamed.", 'en-US', ['ed'], []),
  ("It was interesting.", 'en-US', [], ['prog']),
  ("Is everything OK at work?", 'en-US', [], ['prog']),
  ("I'm looking for a two-room apartment.", 'en-US', ['prog'], []),
  ("We're having a barbecue on Sunday.", 'en-US', ['progfut'], ['prog']),
  ("I'm going to change jobs.", 'en-US', ['going'], ['prog']),
  ("I read before going to sleep.", 'en-US', [], ['going']),
  ("We have a limited budget.", 'en-US', [], ['pp', 'ed']),
  ("We have to speed things up.", 'en-US', [], ['pp']),
  ("I should have warned you.", 'en-US', ['modal'], ['pp']),
  ("Have you ever eaten sushi?", 'en-US', ['pp'], []),
  ("The company will launch its new product in May.", 'en-US', ['will'], ['modal']),
  ("May I have a glass of water?", 'en-US', ['modal'], []),
  ("I do the dishes.", 'en-US', [], ['do']),
  ("What time do you close?", 'en-US', ['do'], []),
  ("I'd like a coffee, please.", 'en-US', ['like'], ['modal']),
  ("I prefer tea rather than coffee.", 'en-US', [], ['cmp']),
  ("My brother is taller than me.", 'en-US', ['cmp'], []),
  ("J'ai mangé une pomme.", 'fr-FR', ['pc'], []),
  ("Vous êtes allés au cinéma ?", 'fr-FR', ['pc'], []),
  ("C'est un bus.", 'fr-FR', [], ['pc']),
  ("Il est au lit.", 'fr-FR', [], ['pc']),
  ("Vous avez du thé ?", 'fr-FR', ['part'], ['pc']),
  ("Nous sommes trois.", 'fr-FR', [], ['pc']),
  ("La réunion a lieu à dix heures.", 'fr-FR', [], ['pc']),
  ("Je suis fatigué.", 'fr-FR', [], ['pc']),
  ("J'ai mal au dos.", 'fr-FR', [], ['pc']),
  ("Vous parlez anglais ?", 'fr-FR', [], ['pron']),
  ("Un café, s'il vous plaît.", 'fr-FR', [], ['pron']),
  ("Je me lève à sept heures.", 'fr-FR', ['pron'], []),
  ("Elle serait plus heureuse à la campagne.", 'fr-FR', [], ['pron']),
  ("Elle s'est couchée tôt.", 'fr-FR', ['pc'], []),
  ("La gare est loin de la maison.", 'fr-FR', [], ['part']),
  ("Je vais au cinéma.", 'fr-FR', ['au'], ['proche']),
  ("Je vais prendre le menu.", 'fr-FR', ['proche'], []),
  ("Au revoir !", 'fr-FR', [], ['au']),
  ("요리하는 걸 좋아해요.", 'ko-KR', [], ['ko.part:요리하는']),
  ("와이파이 비밀번호가 뭐예요?", 'ko-KR', ['ko.part:비밀번호가'], ['ko.part:와이파이']),
  ("저는 학생이에요.", 'ko-KR', ['ko.part:저는'], []),
]

async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(); p = await b.new_page()
    errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:120]))
    await p.goto(APP_URL); await p.wait_for_timeout(400)
    await p.evaluate("localStorage.setItem('speakeasy-ui','fr')"); await p.reload(); await p.wait_for_timeout(400)
    bad = 0
    # 1. repères de grammaire sur des phrases pièges
    for T, lang, want, never in CASES:
      got = await p.evaluate("([t,l])=>grammarKeys(t,l).map(x=>x[0]+(x[2]?':'+x[2]:''))", [T, lang])
      miss = [w for w in want if w not in got]; wrong = [n for n in never if n in got]
      ok = not miss and not wrong; bad += not ok
      print('OK ' if ok else '!! ', repr(T).ljust(58), got, ('manque ' + str(miss)) if miss else '', ('en trop ' + str(wrong)) if wrong else '')
    # 2. notes par phrase : chaque clé est une phrase du thème, traduite pour l'interface coréenne
    pe = await p.evaluate("""()=>{const out=[];for(const [cid,C] of Object.entries(COURSES))C.units.forEach((U,u)=>{if(!U.pe)return;
      const T=new Set((U.p||[]).map(x=>x[1]));for(const [k,v] of Object.entries(U.pe))out.push([cid,u,k,v,T.has(k)]);});return out}""")
    print('notes par phrase :', len(pe))
    for cid, u, k, v, inP in pe:
      if not inP: bad += 1; print('!! note sans phrase', cid, u, repr(k))
      if cid in ('en-daily', 'en-pro', 'en-toeic', 'fr-fle', 'fr-volt') and v not in KO['content']: bad += 1; print('!! note sans traduction coréenne', repr(v[:60]))
      if len(v) > 220: bad += 1; print('!! note trop longue', repr(v[:60]))
    if not pe: bad += 1; print('!! aucune note par phrase')
    # 3. « The fish for me. » révisée dans une leçon d'une autre unité : la note de la phrase, pas l'astuce de la leçon
    h = await p.evaluate("""()=>{const U=COURSES['en-daily'].units, u=U.findIndex(x=>(x.p||[]).some(p=>p[1]==='The fish for me.')),
      o=U.findIndex(x=>/try it on/.test(x.tip||''));
      const ex={t:'listen',lang:'en-US',answer:'The fish for me.',text:'The fish for me.',_cid:'en-daily',_u:u};
      return explainHtml(ex,{ok:true,speak:'The fish for me.'},{cid:'en-daily',mode:'lesson',u:o})}""")
    ok = 'for me (pour moi)' in h and 'try it on' not in h; bad += not ok
    print('OK ' if ok else '!! ', 'révision de « The fish for me. » :', h[:160].replace('\n', ' '))
    # astuce d'une autre unité jamais affichée, astuce de la bonne unité seulement si elle parle de la phrase
    t = await p.evaluate("""()=>[tipFits("« Can I try it on? » : on/off/up sont des particules.","The fish for me.","en-US"),
      tipFits("Pour commander poliment : « I'd like… » ou « Could I have… ».","I'd like a coffee, please.","en-US"),
      tipFits("주세요 (s'il vous plaît) est la formule magique pour commander.","커피 두 잔 주세요.","ko-KR")]""")
    ok = t == [False, True, True]; bad += not ok; print('OK ' if ok else '!! ', 'astuces :', t)
    # 4. un vrai mot à la place d'un autre n'est pas une faute de frappe
    for v, ans, lang, exp in [("to fish for me", ["The fish for me.", "I'll have the fish."], 'en-US', False),
                              ("teh fish for me", ["The fish for me."], 'en-US', True),
                              ("i would like a cofee please", ["I would like a coffee, please."], 'en-US', True),
                              ("its a ten minute walk", ["It's a ten-minute walk."], 'en-US', True),
                              ("i have three brother", ["I have three brothers."], 'en-US', True),
                              ("the meeting is form ten to noon", ["The meeting is from ten to noon."], 'en-US', False)]:
      r = await p.evaluate("([v,a,l])=>checkText(v,a,l,false)", [v, ans, lang]); ok = bool(r.get('ok')) == exp; bad += not ok
      print('OK ' if ok else '!! ', 'accepté' if r.get('ok') else 'refusé ', ('(faute de frappe)' if r.get('typo') else '').ljust(18), repr(v), '↔', ans[0])
    print('erreurs JS :', errs)
    print('anomalies', bad)
    await b.close()
asyncio.run(main())
