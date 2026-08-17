import asyncio
import os
import json
from pathlib import Path
from playwright.async_api import async_playwright

SCREENSHOTS = Path("/tmp/browser/admin_check")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        # Configurações de autenticação injetadas pelo Lovable
        storage_key = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
        session_json = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")
        auth_status = os.environ.get("LOVABLE_BROWSER_AUTH_STATUS")

        print(f"Status da autenticação: {auth_status}")

        # Se tivermos uma sessão injetada, vamos usá-la
        if auth_status == "injected" and storage_key and session_json:
            await page.goto("http://localhost:8080")
            await page.evaluate(
                f"window.localStorage.setItem({json.dumps(storage_key)}, {json.dumps(session_json)})"
            )
            print("Sessão Supabase injetada com sucesso.")
        
        # Acessar a página de login para testar o fluxo manual ou ver o estado atual
        await page.goto("http://localhost:8080/login", wait_until="networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_login_page.png"))
        print(f"Página de login aberta: {page.url}")

        # Se não estiver logado como admin, tentar logar
        if "/admin" not in page.url:
            print("Tentando realizar login como admin...")
            await page.get_by_placeholder("seu@email.com").fill("admin@theroyalcut.com")
            await page.get_by_placeholder("••••••••").fill("RoyalAdmin2026!")
            
            # Clicar no botão de login (usando o texto que deve estar lá)
            await page.get_by_role("button", name="Entrar na Irmandade").click()
            
            # Aguardar um pouco para o processamento e o diagnóstico
            await asyncio.sleep(5)
            await page.screenshot(path=str(SCREENSHOTS / "2_after_login_attempt.png"))
            
            # Verificar se houve erro ou redirecionamento
            print(f"URL após tentativa de login: {page.url}")
            
            # Se houver painel de diagnóstico, capturar log
            try:
                diag_panel = page.locator("text=Diagnóstico do Sistema")
                if await diag_panel.is_visible():
                    await page.screenshot(path=str(SCREENSHOTS / "3_diagnostic_visible.png"))
                    logs = await page.locator("pre").inner_text()
                    print("Logs de diagnóstico encontrados:")
                    print(logs)
            except Exception as e:
                print("Nenhum painel de diagnóstico visível.")

        # Tentar acessar /admin diretamente se o redirecionamento falhou mas a sessão pode estar ativa
        if "/admin" not in page.url:
            print("Tentando acesso direto a /admin...")
            await page.goto("http://localhost:8080/admin", wait_until="networkidle")
            await asyncio.sleep(3)
            await page.screenshot(path=str(SCREENSHOTS / "4_admin_direct_access.png"))
            print(f"URL final após acesso direto: {page.url}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
