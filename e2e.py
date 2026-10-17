import asyncio, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/71709c11-bd5b-57d1-9e5e-06cfefc9e65c/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/opt/pw-browsers/chromium' if False else None)
        errs=[]
        ctxA = await b.new_context(viewport={'width':900,'height':500}, has_touch=True, is_mobile=False)
        ctxB = await b.new_context(viewport={'width':390,'height':780}, has_touch=True, is_mobile=True)
        A = await ctxA.new_page(); B = await ctxB.new_page()
        for pg,n in ((A,'A'),(B,'B')):
            pg.on('console', lambda m,n=n: errs.append((n,m.text)) if m.type=='error' else None)
            pg.on('pageerror', lambda e,n=n: errs.append((n,'PAGEERR '+str(e))))
        await A.goto('http://localhost:8080/'); await B.goto('http://localhost:8080/')
        await A.wait_for_timeout(800)
        await A.screenshot(path=OUT+'menu.png')
        await A.fill('#name','Алиса'); await B.fill('#name','Боб')
        await A.click('#bOnline'); await B.click('#bOnline')
        await A.wait_for_timeout(5500)
        # A moves with keyboard + dash
        await A.keyboard.down('ArrowRight'); await A.wait_for_timeout(600); await A.keyboard.press('Space')
        await A.wait_for_timeout(1500)
        await A.screenshot(path=OUT+'online_A.png'); await B.screenshot(path=OUT+'online_B.png')
        info = await A.evaluate("()=>({mode:__ps.mode, n:__ps.V&&__ps.V.players.length, ph:__ps.V&&__ps.V.phase, ping:__ps.net.ping, names:__ps.V&&__ps.V.players.map(p=>p.name)})")
        print('A',info)
        infoB = await B.evaluate("()=>({mode:__ps.mode, n:__ps.V&&__ps.V.players.length, names:__ps.V&&__ps.V.players.map(p=>p.name)})")
        print('B',infoB)
        # offline
        C = await ctxA.new_page(); C.on('pageerror', lambda e: errs.append(('C','PAGEERR '+str(e))))
        await C.goto('http://localhost:8080/'); await C.click('#bOffline'); await C.wait_for_timeout(4500)
        await C.keyboard.down('KeyD'); await C.wait_for_timeout(700); await C.keyboard.press('Space'); await C.wait_for_timeout(1200)
        await C.screenshot(path=OUT+'offline.png')
        print('errors',errs)
        await b.close()
asyncio.run(main())
