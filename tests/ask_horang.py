import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _env import *  # APP_URL, SITE, SITE_DB, OUT, TESTS
# v39.2 : « Demande à Horang » — bulle flottante, carte d'entraînement, phrase gardée en leçon, conversation,
# séances sans IA (règle reconnue, notion, révision) et avec IA simulée (prompt, rappel « intro »), réglage, traductions.
import asyncio, json
from playwright.async_api import async_playwright
exec(open(os.path.join(TESTS, 'solver.py')).read())
ui = sys.argv[1] if len(sys.argv) > 1 else 'fr'
# cours testés et demande qui doit retrouver une règle de grammaire (None : cours sans notions)
CASES = {
    'fr': [('en', 'en-daily', 'present perfect'), ('ko', 'ko', '에서'), ('fr', 'fr-volt', None)],
    'en': [('fr', 'fr-fle', 'passé composé'), ('ko', 'ko', '에서')],
    'ko': [('en', 'en-pro', 'present perfect'), ('fr', 'fr-fle', 'passé composé')],
}[ui]
LEAK = r"""()=>{const out=new Set();const root=document.querySelector('#modal .mcard')||document.body;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
const VAL=new Set(window.UI_D?Object.values(UI_D):[]);const FR=/\b(le|la|les|des|une|un|et|ou|pour|avec|dans|sur|tes|ton|ta|tu|est|sont|à|ça|mot|mots|phrase|écoute|leçon|unité|réponds|lis|choisis|erreurs|dernière)\b|[éèêàùçâîô]/i;
while((n=w.nextNode())){const t=n.nodeValue.trim();if(t.length<4)continue;const p=n.parentElement;if(!p||p.closest('[lang]:not(html),.notr,script,style'))continue;
 const r=p.getBoundingClientRect();if(!r.width||VAL.has(t))continue;if(FR.test(t)&&!/[가-힣]/.test(t))out.add(t.slice(0,90))}
 for(const el of root.querySelectorAll('[placeholder],[aria-label]')){for(const a of ['placeholder','aria-label']){const t=el.getAttribute(a);if(t&&FR.test(t)&&!/[가-힣]/.test(t))out.add(a+': '+t.slice(0,80))}}
 return [...out]}"""
FAKE_AI = r"""(()=>{window.__prompts=[];AI.mode='claude';AI.sample={json:async(pr)=>{window.__prompts.push(pr);const C=COURSES[curCid()];
if(pr.includes('"reply"')){if(window.__chatFail)throw new Error('timeout');const set=drillSetFor(curCid());const rule=set?set.notions[0].subs[0].id:'';
 const fix=/went/.test(pr)?['I have went to Paris.','I went to Paris.','Après have, on met le participe passé : gone.']:[];
 return {reply:['Premier point de la réponse de test.','Deuxième point.'],fix,rule,focus:'point de test à entraîner'}}const p=[],c=[],v=[];
const U=C.units.slice(0,3);U.forEach(u=>{(u.p||[]).slice(0,4).forEach(a=>p.push(a.slice()));(u.c||[]).slice(0,4).forEach(x=>c.push([x[0],x[1].slice(),x[2],x[3]||'']));(u.v||[]).slice(0,3).forEach(x=>v.push(x.slice(0,2)))});
const d=U.flatMap(u=>u.dd||[]);return {intro:'Rappel : ceci est le rappel de la notion demandée.',p,c,v,d}}}})()"""
async def finish_session(p, prob, label):
    k = 0
    while await solve(p):
        k += 1
        if k > 80: break
    ended = await p.evaluate("!!document.querySelector('#endc')")
    if not ended: prob.append(f'{label} : séance interrompue après {k} exercices')
    return k, ended
async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        p = await b.new_page(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        p.set_default_timeout(4000); errs = []; p.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await p.route('https://**', lambda r: r.abort())
        await p.goto(APP_URL); await p.wait_for_timeout(300)
        await p.evaluate(f"localStorage.clear();localStorage.setItem('speakeasy-ui','{ui}');localStorage.setItem('speakeasy-accounts',JSON.stringify({{current:'a1',list:[{{id:'a1',name:'T',emoji:'🐯',color:'#7C4DFF',pin:''}}]}}));localStorage.setItem('speakeasy-v1:a1',JSON.stringify({{onb:true,pv:6,gems:200,xp:500}}))")
        await p.reload(); await p.wait_for_timeout(700)
        await p.evaluate("Object.keys(COURSES).forEach(c=>{S.dn[c]={};COURSES[c].units.slice(0,4).forEach((U,u)=>S.dn[c][u]=262143)});save()")
        prob = []; leaks = set()
        for sec, cid, q in CASES:
            await p.evaluate(f"if(L)closeLesson();closeModal();AI.mode='local';S.sec='{sec}';S.track['{sec}']='{cid}';save();location.hash='parcours';route()"); await p.wait_for_timeout(300)
            # 1. bulle visible sur le Parcours, au-dessus de la barre du bas, sans chevaucher le bouton de retour à l'étape
            box = await p.evaluate("(()=>{const f=document.querySelector('#askFab');if(!f)return null;const r=f.getBoundingClientRect(),n=document.querySelector('#bottomnav').getBoundingClientRect();const pf=document.querySelector('.pathfab:not(.hidden)');const q=pf&&pf.getBoundingClientRect();return {b:r.bottom,nav:n.top,w:r.width,over:q?!(q.bottom<=r.top||q.top>=r.bottom||q.right<=r.left||q.left>=r.right):false}})()")
            if not box or box['w'] < 40: prob.append(f'{cid} : bulle absente sur le Parcours')
            elif box['b'] > box['nav'] or box['over']: prob.append(f'{cid} : bulle mal placée {box}')
            # 2. une leçon : la phrase est retenue, on la garde, la fin de séance propose Horang
            await p.evaluate(f"(()=>{{const C=COURSES['{cid}'];const u=Math.max(1,C.units.findIndex((U,i)=>i>0&&!U.hg));openSession({{mode:'lesson',cid:'{cid}',u,n:2,exs:buildLesson('{cid}',u,2)}})}})()"); await p.wait_for_timeout(200)
            # le solveur passe le pied de page aussitôt : on « abandonne » des questions jusqu'à trouver le bouton
            pinned = False; k = 0
            while k < 80:
                if not pinned and await p.evaluate("L&&L.state==='answer'&&L.ex.t!=='match'"):
                    await p.evaluate("check(true)"); await p.wait_for_timeout(150)
                    if await p.evaluate("!!document.querySelector('#fxpin')"):
                        await p.click('#fxpin'); pinned = True
                        lab = await p.evaluate("document.querySelector('#fxpin').getAttribute('aria-pressed')")
                        if lab != 'true': prob.append(f'{cid} : bouton « Garder » sans effet')
                if not await solve(p): break
                k += 1
            if not pinned: prob.append(f'{cid} : aucun bouton « Garder pour Horang » en leçon')
            if not await p.evaluate("!!document.querySelector('#endAsk')"): prob.append(f'{cid} : pas de ligne Horang en fin de leçon')
            else:
                await p.click('#endAsk'); await p.wait_for_timeout(300)
            if not await p.evaluate("!!document.querySelector('#askLog')"):
                prob.append(f'{cid} : la conversation ne s\'ouvre pas depuis la fin de leçon')
                await p.evaluate("closeModal();askOpen()"); await p.wait_for_timeout(200)
            for t in await p.evaluate(LEAK): leaks.add(t)
            nseen = await p.evaluate("document.querySelectorAll('.askchip.askseen').length")
            if nseen < 1: prob.append(f'{cid} : aucune phrase « vue à l\'instant » proposée')
            # 3. phrase vue → révision (sans IA)
            if nseen: await p.click('.askchip.askseen'); await p.wait_for_timeout(300)
            for t in await p.evaluate(LEAK): leaks.add(t)
            if not await p.evaluate("!!document.querySelector('#askLog [data-a=ai]')"): prob.append(f'{cid} : pas d\'exercices proposés pour la phrase vue')
            else:
                await p.click('#askLog [data-a=ai]'); await p.wait_for_timeout(700)
                ok = await p.evaluate("!!L&&L.mode==='train'&&!!L.ask")
                if not ok: prob.append(f'{cid} : la séance « phrase vue » ne démarre pas')
                else:
                    n, _ = await finish_session(p, prob, f'{cid}/phrase vue'); print(f'  {cid} phrase vue : {n} exercices')
                while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
            # 4. demande écrite → règle reconnue → 12 phrases sur la règle
            if q:
                await p.evaluate("if(L)closeLesson();closeModal();askOpen()"); await p.wait_for_timeout(200)
                await p.fill('#askIn', q); await p.click('.askgo'); await p.wait_for_timeout(400)
                rule = await p.evaluate("(document.querySelector('#askLog .askmsg.h:last-child b.notr')||{}).textContent||''")
                if not await p.evaluate("!!document.querySelector('#askLog [data-a=r]')"): prob.append(f'{cid} : « {q} » ne retrouve aucune règle')
                else:
                    print(f'  {cid} « {q} » → {rule}')
                    await p.click('#askLog [data-a=r]'); await p.wait_for_timeout(400)
                    n, _ = await finish_session(p, prob, f'{cid}/règle'); print(f'  {cid} règle : {n} exercices')
                    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
                # notion proposée en idée
                await p.evaluate("if(L)closeLesson();closeModal();askOpen()"); await p.wait_for_timeout(200)
                await p.click('#askLog [data-n]'); await p.wait_for_timeout(300)
                if not await p.evaluate("!!document.querySelector('#askLog [data-a=n]')"): prob.append(f'{cid} : idée de notion sans exercices')
                else:
                    await p.click('#askLog [data-a=n]'); await p.wait_for_timeout(400)
                    if not await p.evaluate("!!L"): prob.append(f'{cid} : la séance de notion ne démarre pas')
                    await p.evaluate("if(L)closeLesson()")
            # 5. demande hors cours sans IA : message d'aide, pas de séance
            await p.evaluate("if(L)closeLesson();closeModal();askOpen()"); await p.wait_for_timeout(200)
            await p.fill('#askIn', 'zzqx wwkp'); await p.click('.askgo'); await p.wait_for_timeout(400)
            if await p.evaluate("!!document.querySelector('#askLog .askmsg.h:last-child [data-a]')"): prob.append(f'{cid} : demande sans rapport → exercices proposés quand même')
            for t in await p.evaluate(LEAK): leaks.add(t)
            # 6. avec IA (simulée) : Horang répond (mode chat), corrige une phrase, se replie sur le cours si Claude échoue
            await p.evaluate("closeModal()"); await p.evaluate(FAKE_AI)
            await p.evaluate("askOpen()"); await p.wait_for_timeout(200)
            await p.fill('#askIn', 'I have went to Paris'); await p.click('.askgo'); await p.wait_for_timeout(500)
            chat = await p.evaluate("(()=>{const m=document.querySelector('#askLog .askmsg.h:last-child');return {ul:m.querySelectorAll('.askul li').length,fix:!!m.querySelector('.askfix s'),right:(m.querySelector('.askright')||{}).textContent,rule:!!m.querySelector('.askrule'),ex:!!m.querySelector('[data-a=ai]'),r:!!m.querySelector('[data-a=r]')}})()")
            prc = await p.evaluate("window.__prompts.slice(-1)[0]||''")
            if chat['ul'] < 2 or not chat['fix'] or chat['right'] != 'I went to Paris.' or not chat['ex']: prob.append(f'{cid} : réponse de Claude mal affichée {chat}')
            if q and (not chat['rule'] or not chat['r']): prob.append(f'{cid} : règle proposée par Claude non reprise {chat}')
            if 'I have went to Paris' not in prc or ('identifiant : titre' not in prc) != (q is None): prob.append(f'{cid} : prompt du mode chat incomplet')
            for t in await p.evaluate(LEAK): leaks.add(t)
            await p.click('#askLog .askmsg.h:last-child [data-a=ai]'); await p.wait_for_timeout(800)
            pr = await p.evaluate("window.__prompts.slice(-1)[0]||''")
            if 'point de test à entraîner' not in pr or 'I went to Paris.' not in pr: prob.append(f'{cid} : la séance ne reprend pas le point et la correction de Claude')
            if await p.evaluate("!!document.querySelector('#cgo')"): await p.click('#cgo'); await p.wait_for_timeout(300)
            n, _ = await finish_session(p, prob, f'{cid}/correction'); print(f'  {cid} correction : {n} exercices')
            while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
            await p.evaluate("if(L)closeLesson();closeModal();window.__chatFail=true;askOpen()"); await p.wait_for_timeout(200)
            await p.fill('#askIn', q or 'accord du participe passé'); await p.click('.askgo'); await p.wait_for_timeout(500)
            if not await p.evaluate("!!document.querySelector('#askLog .askmsg.h:last-child .askw')&&!!document.querySelector('#askLog .askmsg.h:last-child [data-a=ai]')"): prob.append(f'{cid} : pas de repli quand Claude échoue')
            await p.evaluate("window.__chatFail=false;closeModal()")
            # 6 bis. séance sur mesure : la demande et la phrase vue sont dans le prompt, rappel puis séance
            await p.evaluate("closeModal()"); await p.evaluate(FAKE_AI)
            await p.evaluate("askOpen()"); await p.wait_for_timeout(200)
            await p.fill('#askIn', q or 'accord du participe passé'); await p.click('.askgo'); await p.wait_for_timeout(400)
            if not await p.evaluate("!!document.querySelector('#askLog [data-a=ai]')"): prob.append(f'{cid} : IA active mais pas d\'« Exercices sur mesure »')
            else:
                await p.click('#askLog [data-a=ai]'); await p.wait_for_timeout(800)
                pr = await p.evaluate("window.__prompts.slice(-1)[0]||''")
                if 'Demande à Horang' not in pr or (q or 'participe') not in pr or '"intro"' not in pr: prob.append(f'{cid} : prompt IA sans la demande : {pr[:120]}')
                if 'vient de voir' not in pr: prob.append(f'{cid} : prompt IA sans les phrases vues')
                if not await p.evaluate("!!document.querySelector('#cgo')"): prob.append(f'{cid} : pas de rappel « Le point avec Horang »')
                else:
                    for t in await p.evaluate(LEAK): leaks.add(t)
                    await p.click('#cgo'); await p.wait_for_timeout(300)
                    if not await p.evaluate("!!L&&L.ai==='ia'"): prob.append(f'{cid} : séance IA non lancée')
                    n, _ = await finish_session(p, prob, f'{cid}/IA'); print(f'  {cid} IA : {n} exercices')
                    while await p.evaluate("!!document.querySelector('#endc')"): await p.click('#endc')
            await p.evaluate("if(L)closeLesson();closeModal();AI.mode='local';AI.sample=null;PINS.length=0")
            # 7. carte de l'écran Entraînement
            await p.evaluate("location.hash='entrainement';route()"); await p.wait_for_timeout(250)
            ok = await p.evaluate("(()=>{const c=[...document.querySelectorAll('.tcard')].find(x=>x.querySelector('.tric svg')&&x.textContent.includes(document.querySelector('#askFab').getAttribute('aria-label')));if(!c)return false;c.click();return !!document.querySelector('#askLog')})()")
            if not ok: prob.append(f'{cid} : carte « Demande à Horang » absente ou inactive')
            await p.evaluate("closeModal()")
        # 8. réglage : la bulle se masque et revient
        await p.evaluate("location.hash='reglages/preferences';route()"); await p.wait_for_timeout(250)
        await p.click('#sAsk'); await p.evaluate("location.hash='parcours';route()"); await p.wait_for_timeout(200)
        if await p.evaluate("!!document.querySelector('#askFab')"): prob.append('réglage : la bulle reste affichée')
        await p.evaluate("location.hash='reglages/preferences';route()"); await p.wait_for_timeout(200)
        await p.click('#sAsk'); await p.evaluate("location.hash='parcours';route()"); await p.wait_for_timeout(200)
        if not await p.evaluate("!!document.querySelector('#askFab')"): prob.append('réglage : la bulle ne revient pas')
        # 9. bulle absente des autres écrans et pendant une leçon
        await p.evaluate("location.hash='ligue';route()"); await p.wait_for_timeout(200)
        if await p.evaluate("!!document.querySelector('#askFab')"): prob.append('bulle affichée sur la Ligue')
        if ui != 'fr' and leaks: prob.append('textes non traduits : ' + ' | '.join(sorted(leaks)[:6]))
        print('erreurs JS :', errs[:3])
        print('PROBLEMES :', prob)
        await b.close()
asyncio.run(main())
