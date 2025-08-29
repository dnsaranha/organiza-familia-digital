import re
from playwright.sync_api import sync_playwright, Page, expect
import time
import random

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Set a desktop viewport
    page.set_viewport_size({"width": 1280, "height": 800})

    email = f"testuser{random.randint(10000, 99999)}@example.com"
    password = "password123"

    # --- Login ---
    page.goto("http://127.0.0.1:8081/auth")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Senha").fill(password)

    page.get_by_role("tab", name="Criar Conta").click()
    page.get_by_role("button", name="Criar Conta").click()
    time.sleep(2)

    page.get_by_role("tab", name="Entrar").click()
    page.get_by_role("button", name="Entrar").click()

    expect(page.get_by_role("button", name="Selecionar Orçamento")).to_be_visible(timeout=15000)

    # --- Add Transactions to test scroll ---
    for i in range(15):
        page.get_by_label("Valor *").fill(str(random.randint(10, 100)))
        page.get_by_label("Categoria *").click()
        # Use different categories to make it more realistic
        category = "Alimentação" if i % 2 == 0 else "Transporte"
        page.get_by_text(category).click()
        page.get_by_label("Descrição").fill(f"Test Transaction {i+1}")
        page.get_by_role("button", name="Adicionar Transação").click()
        # Wait for the toast to confirm before adding the next one
        expect(page.get_by_text("Transação adicionada com sucesso!")).to_be_visible()

    # --- Test Collapsible Functionality ---
    transaction_list_card = page.locator("div.card", has_text="Histórico de Transações")

    # The content is inside a CollapsibleContent, which is a div
    collapsible_content = transaction_list_card.locator("div[data-state='open']")

    # 1. Check if it's initially open
    expect(collapsible_content).to_be_visible()

    # 2. Find and click the trigger to close it
    trigger_button = transaction_list_card.get_by_role("button", name="Toggle")
    trigger_button.click()

    # 3. Check if it's closed
    # We need to wait for the animation to finish
    time.sleep(0.5)
    expect(collapsible_content).not_to_be_visible()

    # 4. Click the trigger again to open it
    trigger_button.click()

    # 5. Check if it's open again
    time.sleep(0.5)
    expect(collapsible_content).to_be_visible()

    # --- Final Screenshot ---
    # Take a screenshot to visually verify the scrollable and collapsible list
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as p:
    run(p)
