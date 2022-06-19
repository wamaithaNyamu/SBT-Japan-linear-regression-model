# TODO:
# 1. get filter target url
# 2. determine max pages
# 3. dynamic url
# 4. get all links
# 5. individual page
# 6. multiprocessing
# 7. final data

import asyncio
from pyppeteer import launch

url = "https://www.sbtjapan.com/used-cars/?make=toyota&model=vitz&steering=all&type=0&sub_body_type=0&drive=0&year_f=2016&cc_f=0&cc_t=0&mile_f=0&mile_t=0&trans=0&savel=0&saveu=0&fuel=0&color=0&bodyLength=0&loadClass=0&engineType=0&location=0&port=0&search_box=1&locationIds=0&d_country=26&d_port=52&ship_type=0&FreightChk=yes&currency=2&inspection=yes&insurance=1&sort=46#listbox"
max_pages = 11
async def main():
    browser = await launch({'headless': False})
    page = await browser.newPage()
    await page.setViewport({"width":2000,"height":2000,"deviceScaleFactor":2})
    await page.goto(url)
    all_stock_ids = await page.querySelectorAll("stock_num")
    print("Ids are ",all_stock_ids)
    await page.screenshot({'path': 'example.png'})
    await browser.close()

asyncio.get_event_loop().run_until_complete(main())


# Challenge
# programmatically get the max pages value
