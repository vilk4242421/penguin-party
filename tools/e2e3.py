import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/71709c11-bd5b-57d1-9e5e-06cfefc9e65c/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        ctxA = await b.new_context(viewport={'width':900,'height':520}, locale='ru-RU')
        ctxB = await b.new_context(viewport={'width':390,'height':780}, has_touch=True, is_mobile=True, locale='ru-RU')
        A = await ctxA.new_page(); B = await ctxB.new_page()
        for pg,n in ((A,'A'),(B,'B')):
            pg.on('pageerror', lambda e,n=n: errs.append((n,'PAGEERR '+str(e))))
            pg.on('console', lambda m,n=n: errs.append((n,m.text)) if m.type=='error' and 'sdk.js' not in m.text and '404' not in m.text else None)
        await A.goto('http://localhost:8080/'); await B.goto('http://localhost:8080/')
        await A.wait_for_timeout(1200)
        await A.screenshot(path=OUT+'v2_menu.png')
        await A.fill('#name','Алиса'); await B.fill('#name','Боб')
        await A.click('#bFriends'); await A.click('#bCreate'); await A.wait_for_timeout(2500)
        await A.screenshot(path=OUT+'v2_lobby_host.png')
        code = await A.evaluate("()=>document.getElementById('roomcode')&&document.getElementById('roomcode').textContent")
        print('code',code)
        await B.click('#bFriends'); await B.fill('#code',code or 'XXXX'); await B.click('#bJoin'); await B.wait_for_timeout(2500)
        await B.screenshot(path=OUT+'v2_lobby_guest.png')
        await A.keyboard.down('ArrowRight'); await A.wait_for_timeout(400); await A.keyboard.up('ArrowRight')
        await A.screenshot(path=OUT+'v2_lobby_host2.png')
        # start
        btns = await A.evaluate("()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.id+':'+b.textContent.trim().slice(0,20))")
        print(btns)
        await A.click('#lbStart'); await A.wait_for_timeout(6500)
        await A.keyboard.down('KeyA'); await A.wait_for_timeout(500); await A.keyboard.press('Space'); await A.wait_for_timeout(800)
        await A.screenshot(path=OUT+'v2_play_A.png'); await B.screenshot(path=OUT+'v2_play_B.png')
        print(await A.evaluate("()=>({m:__ps.mode,ph:__ps.V&&__ps.V.phase,n:__ps.V&&__ps.V.players.length})"))
        print('errors',errs)
        await b.close()
asyncio.run(main())
