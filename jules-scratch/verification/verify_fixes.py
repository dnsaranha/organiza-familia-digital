from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        email = "dns.aranha@gmail.com"
        password = "d4e8s2"

        try:
            # Go to the auth page
            page.goto("http://127.0.0.1:8080/auth", timeout=60000)

            # --- Sign In ---
            page.get_by_label("Email").fill(email)
            page.get_by_label("Senha").fill(password)
            page.get_by_role("button", name="Entrar").click()

            # Wait for navigation and for the network to be idle
            page.wait_for_url("http://127.0.0.1:8080/", timeout=15000)
            page.wait_for_load_state('networkidle')

            # --- Add a new transaction ---
            page.get_by_label("Valor *").fill("99.99")
            # Click the category select trigger
            page.locator('button[role="combobox"]').first.click()
            # Click the category item using a more robust selector
            page.locator('[role="option"]:has-text("Lazer")').click()

            page.get_by_label("Descrição").fill("E2E Test Item")
            page.get_by_role("button", name="Adicionar Transação").click()

            # Wait for the toast
            expect(page.get_by_text("Transação adicionada!")).to_be_visible(timeout=10000)

            # --- Find and Edit the transaction ---
            transaction_description = "E2E Test Item"
            # Use a more robust selector that finds the parent div of the transaction
            transaction_row = page.locator("div.p-3", has_text=transaction_description)
            expect(transaction_row).to_be_visible()

            transaction_row.get_by_role("button", name="Abrir menu").click()
            page.get_by_role("menuitem", name="Editar").click()

            # Change the description
            edit_form = page.get_by_role("dialog")
            new_description = "E2E Test Item Edited"
            edit_form.get_by_label("Descrição").fill(new_description)
            edit_form.get_by_role("button", name="Salvar Alterações").click()

            # Verify the edit
            expect(page.get_by_text("Transação atualizada!")).to_be_visible(timeout=10000)
            expect(page.get_by_text(new_description)).to_be_visible()

            # --- Delete the transaction ---
            edited_transaction_row = page.locator("div.p-3", has_text=new_description)
            edited_transaction_row.get_by_role("button", name="Abrir menu").click()
            page.get_by_role("menuitem", name="Excluir").click()

            # Confirm deletion
            page.get_by_role("button", name="Excluir").click()

            # Verify the deletion
            expect(page.get_by_text("Transação excluída!")).to_be_visible(timeout=10000)
            expect(page.get_by_text(new_description)).not_to_be_visible()

            print("Verification script ran successfully.")
            page.screenshot(path="jules-scratch/verification/verification.png")

        except Exception as e:
            print(f"An error occurred during verification: {e}")
            page.screenshot(path="jules-scratch/verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
