from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()

    # Clear storage state to ensure a clean session
    context.clear_cookies()

    page = context.new_page()

    try:
        page.goto("http://localhost:5173/")

        # Look for the login button with the correct text
        login_button = page.locator('button:has-text("Get Started with Google")')

        # Wait for the button to be visible
        expect(login_button).to_be_visible(timeout=15000) # Increased timeout

        print("Landed on the login page as expected.")
        page.screenshot(path="jules-scratch/verification/login_page.png")

    except Exception as e:
        print(f"An error occurred: {e}")
        # Try to capture the state of the page even if there's an error
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
