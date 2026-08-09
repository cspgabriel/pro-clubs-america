import asyncio
import json
import sys
import os
from playwright.async_api import async_playwright

output_dir = os.path.dirname(os.path.abspath(__file__))

async def download_club_by_id(club_id, platform="common-gen5"):
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe',
            args=['--disable-http2']
        )
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        page = await context.new_page()
        try:
            await page.goto('https://www.ea.com/pt-br/games/ea-sports-fc/clubs/rankings', timeout=15000)
        except Exception:
            pass
            
        await asyncio.sleep(2)
        
        info_url = f"https://proclubs.ea.com/api/fc/clubs/info?platform={platform}&clubIds={club_id}"
        stats_url = f"https://proclubs.ea.com/api/fc/members/career/stats?platform={platform}&clubId={club_id}"
        matches_url = f"https://proclubs.ea.com/api/fc/clubs/matches?platform={platform}&clubIds={club_id}&matchType=gameType9"
        
        print(f"Fetching data for Club ID: {club_id} on platform: {platform}...")
        
        info = await page.evaluate(f"async () => {{ try {{ const r = await fetch('{info_url}', {{ headers: {{ 'Referer': 'https://www.ea.com/' }} }}); return await r.json(); }} catch(e) {{ return null; }} }}")
        players = await page.evaluate(f"async () => {{ try {{ const r = await fetch('{stats_url}', {{ headers: {{ 'Referer': 'https://www.ea.com/' }} }}); return await r.json(); }} catch(e) {{ return null; }} }}")
        matches = await page.evaluate(f"async () => {{ try {{ const r = await fetch('{matches_url}', {{ headers: {{ 'Referer': 'https://www.ea.com/' }} }}); return await r.json(); }} catch(e) {{ return null; }} }}")
        
        result = {
            'club_id': club_id,
            'platform': platform,
            'info': info,
            'players': players,
            'recent_matches': matches
        }
        
        out_file = os.path.join(output_dir, f"club_{club_id}_full_stats.json")
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
            
        print(f"Done! Stats saved to: {out_file}")
        await browser.close()

if __name__ == '__main__':
    cid = sys.argv[1] if len(sys.argv) > 1 else '123762'
    plat = sys.argv[2] if len(sys.argv) > 2 else 'common-gen5'
    asyncio.run(download_club_by_id(cid, plat))
