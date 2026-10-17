import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/71709c11-bd5b-57d1-9e5e-06cfefc9e65c/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs=[]
        ctx = await b.new_context(viewport={'width':390,'height':780}, has_touch=True, is_mobile=True, locale='ru-RU')
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8080/'); await pg.wait_for_timeout(800)
        await pg.click('#bWard'); await pg.wait_for_timeout(600); await pg.screenshot(path=OUT+'v2_wardrobe.png')
        await pg.click('#bWBack'); await pg.wait_for_timeout(300)
        await pg.fill('#name','Вилкин'); await pg.click('#bOffline'); await pg.wait_for_timeout(6500)
        await pg.evaluate("()=>{const c=document.getElementById('c');const o={pointerId:7,bubbles:true,pointerType:'touch',isPrimary:true};c.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:100,clientY:600}));c.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:130,clientY:580}));}")
        await pg.wait_for_timeout(500); await pg.tap('#dash'); await pg.wait_for_timeout(700)
        await pg.screenshot(path=OUT+'v2_offline.png')
        print('offline', await pg.evaluate("()=>({m:__ps.mode,ph:__ps.V.phase,n:__ps.V.players.length,rs:__ps.V.rs})"))
        await pg.click('#bExit'); await pg.wait_for_timeout(500)
        await pg.click('#bOnline'); await pg.wait_for_timeout(3000)
        await pg.screenshot(path=OUT+'v2_quick_lobby.png')
        await pg.wait_for_timeout(15000)
        print('quick after 18s', await pg.evaluate("()=>({m:__ps.mode,ph:__ps.V.phase,n:__ps.V.players.length})"))
        await pg.screenshot(path=OUT+'v2_quick_play.png')
        print(errs)
        await b.close()
asyncio.run(main())
