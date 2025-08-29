import re
from playwright.sync_api import sync_playwright, Page, expect
import time
import random

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Set mobile viewport for testing responsive design
    page.set_viewport_size({"width": 375, "height": 667})

    email = f"testuser{random.randint(10000, 99999)}@example.com"
    password = "password123"

    # Navigate to auth page
    page.goto("http://127.0.0.1:8081/auth")

    # --- Sign Up ---
    # Switch to the "Create Account" tab
    page.get_by_role("tab", name="Criar Conta").click()

    # Fill the sign-up form
    page.get_by_label("Email").fill(email)
    page.get_by_label("Senha").fill(password)
    page.get_by_role("button", name="Criar Conta").click()

    # Add a small delay to ensure the signup request is processed.
    time.sleep(2)

    # --- Sign In ---
    # The form should be on the same page. Switch to the "Sign In" tab.
    page.get_by_role("tab", name="Entrar").click()

    # Fill the sign-in form
    page.get_by_label("Email").fill(email)
    page.get_by_label("Senha").fill(password)
    page.get_by_role("button", name="Entrar").click()

    # Wait for the main page to load by looking for a reliable element
    expect(page.get_by_role("button", name="Selecionar Orçamento")).to_be_visible(timeout=15000)

    # --- Final Screenshot ---
    # Take a screenshot to visually verify the header layout on mobile
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as p:
    run(p)
