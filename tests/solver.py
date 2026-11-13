import asyncio,sys
from playwright.async_api import async_playwright
async def solve(p):
    st=await p.evaluate("L&&L.state")
    if st=='feedback':
        await p.click('#cont'); return True
    t=await p.evaluate("L&&L.state==='answer'?L.ex.t:null")
    if not t: return False
    if t=='match':
        pairs=await p.evaluate("L.ex.pairs.length")
        for i in range(pairs):
            await p.click(f'.mt[data-s=l][data-i="{i}"]'); await p.click(f'.mt[data-s=r][data-i="{i}"]')
        await p.wait_for_timeout(500); return True
    if t=='write':
        if await p.evaluate("L.ex.mode==='transcribe'"):
            n=await p.evaluate("L.ex.items.length")
            for i in range(n): await p.fill(f'#lbody input[data-i="{i}"]', await p.evaluate(f"L.ex.items[{i}].ko"))
        else:
            await p.fill('#tin', await p.evaluate("(L.ex.model||'')+' '+(L.ex.req||[]).join(' ')+' '+'word '.repeat(L.ex.min)"))
        await p.click('#chk')
        for _ in range(50):
            if await p.evaluate("L&&L.state==='feedback'"): break
            await p.wait_for_timeout(100)
        await p.click('#cont'); return True
    if t=='build':
        order=await p.evaluate("(()=>{const used=[];return L.ex.parts.map(x=>{for(let i=0;i<L.ex.tiles.length;i++){if(!used.includes(i)&&L.ex.tiles[i]===x){used.push(i);return i}}})})()")
        for i in order: await p.click(f'#bank .tile[data-i="{i}"]')
    elif t=='spot':
        f=await p.evaluate("L.ex.faulty")
        await p.click('.spotw[data-k="B"]' if f else '.spotw.nofault')
    elif t in('mc','choice','part2','conv','read','photo','hg','pic','picw'):
        idx=await p.evaluate("L.ex.options.indexOf(L.ex.answer)")
        await p.click(f'.opt[data-i="{idx}"]')
    elif t in('tiles','tilesRev','listenTiles'):
        order=await p.evaluate("""(()=>{const w=words(L.ex.answer);const used=[];return w.map(x=>{for(let i=0;i<L.ex.tiles.length;i++){if(!used.includes(i)&&L.ex.tiles[i]===x){used.push(i);return i}}return -1})})()""")
        for i in order: await p.click(f'#bank .tile[data-i="{i}"]')
    elif t in('type','listen','dictee','fill'):
        await p.fill('#tin', await p.evaluate("L.ex.answer"))
    elif t=='speak':
        await p.click('#skip'); return True
    await p.click('#chk')
    ok=await p.evaluate("document.querySelector('#lfoot').className")
    if 'ok' not in ok: print("NOT OK",t,await p.evaluate("L.ex.answer"))
    await p.click('#cont'); return True
