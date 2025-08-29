import re
from playwright.sync_api import sync_playwright, Page, expect
import time
import random

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the app
    page.goto("http://127.0.0.1:8080/")

    # --- Sign up a new user ---
    email = f"testuser{random.randint(10000, 99999)}@example.com"
    password = "password123"

    # Navigate to auth page
    page.goto("http://127.0.0.1:8080/auth")

    # Click on the "Create Account" tab
    page.get_by_role("tab", name="Criar Conta").click()

    # Fill the sign-up form
    page.get_by_label("Email").fill(email)
    page.get_by_label("Senha").fill(password)
    page.get_by_role("button", name="Criar Conta").click()

    # In many Supabase setups, sign-up also creates a session.
    # We will navigate directly to the app root and expect to be logged in.
    time.sleep(1) # a short wait for the async sign-up to process
    page.goto("http://127.0.0.1:8080/")

    # Wait for successful sign-in and navigation to main page
    expect(page.get_by_role("heading", name="Olá, bem-vindo de volta!")).to_be_visible(timeout=10000)

    # --- Test Group Member Visibility ---
    group_name = f"Test Group {random.randint(100, 999)}"
    page.get_by_role("button", name="Criar").click()
    page.get_by_label("Nome do Grupo").fill(group_name)
    page.get_by_role("button", name="Criar Grupo").click()

    time.sleep(1)
    page.get_by_role("button", name=re.compile(group_name)).click()

    expect(page.get_by_text("Membros")).to_be_visible()
    expect(page.get_by_text("Usuário Sem Nome")).to_be_visible()

    # --- Test Transaction Filters ---
    page.get_by_label("Valor *").fill("100")
    page.get_by_label("Categoria *").click()
    page.get_by_text("Alimentação").click()
    page.get_by_label("Descrição").fill("Personal Lunch")
    page.get_by_role("button", name="Adicionar Transação").click()
    time.sleep(1)

    page.get_by_label("Valor *").fill("250")
    page.get_by_label("Categoria *").click()
    page.get_by_text("Transporte").click()
    page.get_by_label("Orçamento").click()
    page.get_by_text(group_name).click()
    page.get_by_label("Descrição").fill("Group Gas")
    page.get_by_role("button", name="Adicionar Transação").click()
    time.sleep(1)

    page.locator('.flex.gap-2.mb-4 > .relative.w-full').click()
    page.get_by_text("Pessoal").click()
    expect(page.get_by_text("Personal Lunch")).to_be_visible()
    expect(page.get_by_text("Group Gas")).not_to_be_visible()

    page.locator('.flex.gap-2.mb-4 > .relative.w-full').click()
    page.get_by_text(group_name).click()
    expect(page.get_by_text("Personal Lunch")).not_to_be_visible()
    expect(page.get_by_text("Group Gas")).to_be_visible()

    # --- Test Dashboard Switcher ---
    page.locator('header').get_by_role("combobox").click()
    page.get_by_text(group_name, exact=True).click()

    balance_card = page.get_by_role("heading", name=re.compile("R\\$ -250,00"))
    expect(balance_card).to_be_visible()

    # --- Final Screenshot ---
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as p:
    run(p)
