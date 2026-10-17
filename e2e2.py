import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/71709c11-bd5b-57d1-9e5e-06cfefc9e65c/scratchpad/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs=[]
        ctx = await b.new_context(viewport={'width':390,'height':780}, has_touch=True, is_mobile=True, locale='ru-RU')
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8080/'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT+'menu_mobile.png', full_page=False)
        await pg.fill('#name','Вилкин'); await pg.click('#bOffline')
        await pg.wait_for_timeout(1200)
        await pg.screenshot(path=OUT+'count.png')
        await pg.wait_for_timeout(2600)
        # synthetic joystick drag
        await pg.evaluate("""()=>{const c=document.getElementById('c');const o={pointerId:7,bubbles:true,pointerType:'touch',isPrimary:true};
          c.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:100,clientY:600}));
          c.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:150,clientY:560}));}""")
        iv = await pg.evaluate("()=>__ps.iv()"); print('joystick vec', iv)
        await pg.wait_for_timeout(900)
        await pg.tap('#dash'); await pg.wait_for_timeout(500)
        await pg.screenshot(path=OUT+'play_mobile.png')
        await pg.evaluate("()=>{document.getElementById('c').dispatchEvent(new PointerEvent('pointerup',{pointerId:7,bubbles:true}))}")
        await pg.wait_for_timeout(8000)
        await pg.screenshot(path=OUT+'play_mobile2.png')
        print('errors',errs)
        await b.close()
asyncio.run(main())
