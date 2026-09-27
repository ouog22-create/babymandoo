"""Local browser smoke test. Run with a Playwright-enabled Python environment."""
import struct
import zlib
from pathlib import Path
from playwright.sync_api import expect, sync_playwright


URL = "http://127.0.0.1:8765/"

def png(rgb, width=12, height=18):
    def chunk(kind, data):
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    pixels = b"".join(b"\x00" + bytes(rgb) * width for _ in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">2I5B", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(pixels))
        + chunk(b"IEND", b"")
    )


WARM = png((232, 177, 132))
COOL = png((75, 110, 185), 18, 12)


def run():
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        )
        context = browser.new_context(accept_downloads=True, viewport={"width": 1440, "height": 900})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(URL)
        page.locator("#reference-empty").wait_for(state="visible")
        page.screenshot(path="/tmp/fifty-days-desktop.png", full_page=True)

        page.locator("#add-reference").click()
        page.locator("#field-title").fill("창가의 아기")
        page.locator("#field-tags").fill("자연광, 클로즈업")
        page.locator("#field-composition").fill("눈높이에서 얼굴 클로즈업")
        page.locator("#field-lighting").fill("창문 왼쪽 자연광")
        page.locator("#reference-image").set_input_files({"name": "test.png", "mimeType": "image/png", "buffer": WARM})
        page.locator("#editor-save").click()
        page.locator(".reference-card").wait_for()
        page.locator(".reference-card").click()
        assert "창문 왼쪽 자연광" in page.locator("#detail-body").inner_text()
        page.locator("#detail-dialog [data-close]").first.click()
        page.locator("#add-reference").click()
        page.locator("#field-title").fill("담요 위의 아기")
        page.locator("#reference-image").set_input_files([
            {"name": "second.png", "mimeType": "image/png", "buffer": WARM},
            {"name": "third.png", "mimeType": "image/png", "buffer": COOL},
        ])
        page.locator("#editor-save").click()
        page.locator(".reference-card").nth(2).wait_for()
        assert page.locator(".reference-card").count() == 3
        assert page.locator(".chip.auto").count() == 9
        assert page.locator("#group-toolbar").is_visible()
        page.locator('[data-group="lighting"]').click()
        assert page.locator(".reference-group").count() >= 1
        page.locator('[data-group="similar"]').click()
        assert page.locator(".reference-group").count() >= 2
        page.locator("#reclassify").click()
        expect(page.locator("#reclassify")).to_have_text("↻ 다시 분석")

        page.locator('a[href="#storyboard"]').first.click()
        page.locator("#add-shot").click()
        page.locator("#field-title").fill("첫 미소")
        page.locator("#field-goal").fill("자연스러운 표정")
        page.locator("#field-props").fill("아이보리 담요, 모자")
        page.locator('input[name="referenceIds"]').first.check()
        page.locator("#editor-save").click()
        page.locator(".shot-card").wait_for()
        assert "레퍼런스 1" in page.locator(".shot-card").inner_text()
        page.locator(".status-select").select_option("완료")
        page.locator("#stat-progress").get_by_text("100").wait_for()
        page.locator("#open-checklist").click()
        assert page.locator(".checklist-item").count() == 2
        page.locator(".checklist-item input").first.check()
        page.locator("#checklist-dialog [data-close]").first.click()
        page.reload()
        assert page.locator(".shot-card").count() == 1
        assert page.locator("#stat-progress").inner_text().startswith("100")
        expect(page.locator('[data-group="similar"]')).to_have_attribute("aria-pressed", "true")
        assert page.locator(".chip.auto").count() == 9
        page.locator("#open-data").click()
        with page.expect_download() as download_info:
            page.locator("#export-data").click()
        assert download_info.value.suggested_filename.endswith(".json")
        download_info.value.save_as("/tmp/fifty-days-backup.json")
        page.locator("#data-dialog [data-close]").click()
        page.screenshot(path="/tmp/fifty-days-storyboard.png", full_page=True)

        page.locator("#add-shot").click()
        page.locator("#field-title").fill("두 기기 촬영 컷")
        page.locator("#field-device").select_option("두 기기")
        page.locator("#editor-save").click()
        page.locator(".shot-card").nth(1).wait_for()
        second = page.locator(".shot-card").last
        assert second.locator("[data-device-check]").count() == 2
        second.locator('[data-device-check="fuji"]').check()
        expect(second.locator(".status-select")).to_have_value("촬영 중")
        second.locator('[data-device-check="phone"]').check()
        expect(second.locator(".status-select")).to_have_value("완료")
        page.locator("#toggle-focus").click()
        assert page.locator("#focus-view").is_visible()
        page.locator("#toggle-focus").click()
        page.on("dialog", lambda dialog: dialog.accept())
        second.locator("[data-delete-shot]").click()
        assert page.locator(".shot-card").count() == 1
        page.locator("#open-data").click()
        page.locator("#import-file").set_input_files("/tmp/fifty-days-backup.json")
        page.locator("#data-dialog").wait_for(state="hidden")
        assert page.locator("#nav-ref-count").inner_text() == "3"
        assert page.locator(".shot-card").count() == 1

        mobile = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        mobile_page = mobile.new_page()
        mobile_page.goto(URL)
        mobile_page.locator("#references-page").wait_for(state="visible")
        mobile_page.screenshot(path="/tmp/fifty-days-mobile.png", full_page=True)
        mobile_page.on("dialog", lambda dialog: dialog.accept())
        mobile_page.locator("#mobile-data").click()
        mobile_page.locator("#import-file").set_input_files("/tmp/fifty-days-backup.json")
        mobile_page.locator("#data-dialog").wait_for(state="hidden")
        mobile_page.locator(".reference-card").nth(2).wait_for()
        mobile_page.screenshot(path="/tmp/fifty-days-mobile-references.png", full_page=True)
        mobile_page.locator('.mobile-nav a[href="#storyboard"]').click()
        mobile_page.locator(".shot-card").wait_for()
        mobile_page.screenshot(path="/tmp/fifty-days-mobile-storyboard.png", full_page=True)
        assert mobile_page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        assert not errors, errors
        print("PASS: upload, auto classification, grouping, shot link, status, checklist, persistence, backup, mobile layout")
        browser.close()


if __name__ == "__main__":
    run()
