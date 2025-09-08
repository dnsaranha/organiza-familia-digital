from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Login
    page.goto("http://127.0.0.1:8081/auth")
    page.get_by_label("Email").fill("dns.aranha@gmail.com")
    page.get_by_label("Senha").fill("d4e8s2")
    page.get_by_role("button", name="Entrar").click()

    # Wait for the content to load
    welcome_text = page.get_by_text("Olá, bem-vindo de volta! 👋")
    expect(welcome_text).to_be_visible(timeout=30000)
    time.sleep(5) # give it more time to load

    # --- Home Page ---
    page.goto("http://127.0.0.1:8081/")
    expect(welcome_text).to_be_visible(timeout=30000)
    time.sleep(5)
    # Mobile view
    page.set_viewport_size({"width": 375, "height": 667})
    page.screenshot(path="jules-scratch/verification/home-mobile.png")
    # Desktop view
    page.set_viewport_size({"width": 1280, "height": 720})
    page.screenshot(path="jules-scratch/verification/home-desktop.png")

    # --- Reports Page ---
    page.goto("http://127.0.0.1:8081/reports")
    expect(page.get_by_role("heading", name="Relatórios")).to_be_visible(timeout=30000)
    time.sleep(5)
    # Mobile view
    page.set_viewport_size({"width": 375, "height": 667})
    page.screenshot(path="jules-scratch/verification/reports-mobile.png")
    # Desktop view
    page.set_viewport_size({"width": 1280, "height": 720})
    page.screenshot(path="jules-scratch/verification/reports-desktop.png")

    # --- Investments Page ---
    page.goto("http://127.0.0.1:8081/investments")
    expect(page.get_by_role("heading", name="Carteira de Investimentos")).to_be_visible(timeout=30000)
    time.sleep(5)
    # Mobile view
    page.set_viewport_size({"width": 375, "height": 667})
    page.screenshot(path="jules-scratch/verification/investments-mobile.png")
    # Desktop view
    page.set_viewport_size({"width": 1280, "height": 720})
    page.screenshot(path="jules-scratch/verification/investments-desktop.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
