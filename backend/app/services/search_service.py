"""
搜索服务模块
提供基于DuckDuckGo的搜索功能
"""
import asyncio
import logging
import re
import random
import time
import html
from typing import List, Dict, Optional

import requests
from bs4 import BeautifulSoup
from duckduckgo_search import DDGS

try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

try:
    from seleniumbase import Driver
    SELENIUMBASE_AVAILABLE = True
except ImportError:
    SELENIUMBASE_AVAILABLE = False

logger = logging.getLogger(__name__)


class SearchService:
    """搜索服务类"""
    
    def __init__(self, max_results: int = 5, safe_search: str = "moderate", region: str = "cn") -> None:
        self.max_results = max_results
        self.safe_search = safe_search
        self.region = region
    
    def search(self, query: str, max_results: Optional[int] = None) -> List[Dict[str, str]]:
        try:
            results = DDGS().text(
                query,
                max_results=max_results or self.max_results,
                safesearch=self.safe_search,
                region=self.region
            )
            
            search_results = [{
                "title": r.get("title", ""),
                "href": r.get("href", ""),
                "body": r.get("body", "")
            } for r in results]
            
            logger.info(f"搜索完成，查询: {query}, 结果数量: {len(search_results)}")
            return search_results
        except Exception as e:
            logger.error(f"搜索出错: {e}")
            raise Exception(f"搜索服务异常: {e}") from e
    
    async def search_async(self, query: str, max_results: Optional[int] = None) -> List[Dict[str, str]]:
        return await asyncio.get_event_loop().run_in_executor(None, self.search, query, max_results)
    
    def format_results(self, results: List[Dict[str, str]]) -> str:
        if not results: return "未找到相关搜索结果"
        return "\n".join(f"{i}. 标题: {r['title']}\n   链接: {r['href']}\n   摘要: {r['body']}\n" for i, r in enumerate(results, 1))
    
    def _get_random_user_agent(self) -> str:
        return random.choice([
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ])

    def _clean_and_format_content(self, content: str, title: str = "") -> str:
        if not content: return ""
        content = html.unescape(content)
        content = re.sub(r'\n{3,}', '\n\n', re.sub(r'[ \t]+', ' ', content)).strip()
        
        lines, formatted_lines, in_list = content.split('\n'), [], False
        for line in lines:
            line = line.strip()
            if not line:
                if in_list: in_list = False
                formatted_lines.append(''); continue
            
            if re.match(r'^[•·▪▫○●◦‣⁃0-9a-zA-Z.)\]]+\s+', line):
                if not in_list:
                    in_list = True
                    if formatted_lines and formatted_lines[-1]: formatted_lines.append('')
                formatted_lines.append(f"- {re.sub(r'^[•·▪▫○●◦‣⁃0-9a-zA-Z.)\]]+\s*', '', line)}")
            else:
                if in_list: in_list = False; formatted_lines.append('')
                formatted_lines.append(line)
        
        content = '\n'.join(formatted_lines)
        if title and title.strip() and not content.startswith(title.strip()) and not content.startswith('# '):
            content = f"# {title.strip()}\n\n{content}"
        
        content = re.sub(r'\n([ ]{4,}|\t+)([^\n]+)', r'\n> \2', content)
        content = '\n'.join(f"`{l}`" if len(l) > 10 and sum(1 for c in l if c in '{}(=<>/\ ') / len(l) > 0.2 else l for l in content.split('\n'))
        
        merged, cur = [], ""
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                if cur: merged.append(cur); cur = ""
                merged.append("")
            elif cur and not re.match(r'^[A-Z•·▪▫○●#\-\d]', line) and not cur.endswith(('.', '!', '?', ':')):
                cur += f" {line}"
            else:
                if cur: merged.append(cur)
                cur = line
        if cur: merged.append(cur)
        
        content = re.sub(r'\n\n+', '\n\n', '\n'.join(merged).strip())
        return '\n\n'.join(content.split('\n\n')[:10]) if len(content) > 5000 else content

    def _extract_content_with_requests(self, url: str, max_chars: int) -> Dict[str, str]:
        try:
            session = requests.Session()
            session.headers.update({'User-Agent': self._get_random_user_agent(), 'Accept-Language': 'zh-CN,zh;q=0.9'})
            time.sleep(random.uniform(1, 2))
            
            response = session.get(url, timeout=20)
            response.raise_for_status()
            response.encoding = response.apparent_encoding or 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            title = soup.find('title').get_text().strip() if soup.find('title') else url.split('/')[-1]
            for tag in soup(["script", "style", "link", "meta", "noscript", "iframe"]): tag.decompose()
            
            content = ""
            for s in ['.RichContent-inner', '.rich_media_content', 'main', 'article', '.content', '#content', 'body']:
                if el := soup.select_one(s):
                    content = el.get_text(separator='\n', strip=True)
                    if len(content) > 100: break
            
            content = self._clean_and_format_content(content, title)
            if len(content) > max_chars: content = f"{content[:max_chars]}...(截断)"
            
            return {"url": url, "title": title, "content": content}
        except Exception as e:
            logger.error(f"解析网页失败 {url}: {e}")
            raise Exception(f"解析网页失败: {e}") from e

    async def _extract_with_playwright(self, url: str, max_chars: int) -> Dict[str, str]:
        if not PLAYWRIGHT_AVAILABLE: raise Exception("Playwright未安装")
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page(user_agent=self._get_random_user_agent())
                await page.goto(url, wait_until='domcontentloaded', timeout=30000)
                await page.wait_for_timeout(2000)
                
                title, content = await page.title(), ""
                for s in ['main', 'article', '.content', 'body']:
                    if el := await page.query_selector(s):
                        content = await el.inner_text()
                        if len(content) > 100: break
                
                await browser.close()
                content = self._clean_and_format_content(content, title)
                return {"url": url, "title": title or "网页", "content": content or "未能提取内容"}
        except Exception as e:
            raise Exception(f"Playwright提取失败: {e}") from e

    def load_url_content(self, url: str, max_chars: int = 5000) -> Dict[str, str]:
        try:
            return self._extract_content_with_requests(url, max_chars)
        except Exception:
            if PLAYWRIGHT_AVAILABLE:
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    return loop.run_until_complete(self._extract_with_playwright(url, max_chars))
                except Exception: pass
        raise Exception(f"无法访问网页 {url}")
    
    async def load_url_content_async(self, url: str, max_chars: int = 5000) -> Dict[str, str]:
        return await asyncio.get_event_loop().run_in_executor(None, self.load_url_content, url, max_chars)


search_service = SearchService()
