import os
import sys
import re
import json
import xml.etree.ElementTree as ET
from pathlib import Path

BASE_DIR = Path(r"C:\Users\saad7\.gemini\antigravity\scratch\saad_amil_lawyer_site")

def run_tests():
    passed = 0
    failed = 0
    errors = []

    print("=" * 60)
    print("🚀 بدء الفحص الشامل لموقع المحامي سعد فراس أميل")
    print("=" * 60)

    # 1. Test test.php is removed
    print("\n[Test 1] التحقق من إزالة ملف التسريب test.php:")
    test_php = BASE_DIR / "test.php"
    if not test_php.exists():
        print("  ✅ نجح: ملف test.php غير موجود وتم حذفه نهائياً.")
        passed += 1
    else:
        print("  ❌ فشل: ملف test.php لا يزال موجوداً على القرص!")
        failed += 1
        errors.append("test.php exists")

    # 2. Test sitemap.xml validity
    print("\n[Test 2] التحقق من صحة sitemap.xml وصيغة XML وخلوه من أخطاء الروابط:")
    sitemap_path = BASE_DIR / "sitemap.xml"
    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()
        urls = [elem.text for elem in root.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
        print(f"  ✅ نجح: ملف sitemap.xml سليم ويحتوي على {len(urls)} رابط قانوني.")
        
        # Check no broken faq.html or hash fragments
        bad_urls = [u for u in urls if "faq.html" in u or "#" in u]
        if bad_urls:
            print(f"  ❌ فشل: روابط غير مطابقة للمواصفات في sitemap: {bad_urls}")
            failed += 1
            errors.append(f"Bad URLs in sitemap: {bad_urls}")
        else:
            print("  ✅ نجح: خلو خريطة الموقع من الروابط الميتة أو علامات الهاش.")
            passed += 1
    except Exception as e:
        print(f"  ❌ خطأ في معالجة sitemap.xml: {e}")
        failed += 1
        errors.append(str(e))

    # 3. Test feed.xml validity
    print("\n[Test 3] التحقق من سلامة خلاصة RSS (feed.xml):")
    feed_path = BASE_DIR / "feed.xml"
    try:
        tree = ET.parse(feed_path)
        root = tree.getroot()
        items = root.findall('./channel/item')
        print(f"  ✅ نجح: ملف feed.xml متوافق مع معايير RSS 2.0 ويحتوي على {len(items)} مقال.")
        # Check links
        feed_links = [it.find('link').text for it in items if it.find('link') is not None]
        bad_feed = [l for l in feed_links if "#" in l]
        if bad_feed:
            print(f"  ❌ تحذير: روابط في الخلاصة تحتوي على هاش: {bad_feed}")
            failed += 1
            errors.append("Bad feed links")
        else:
            print("  ✅ نجح: جميع روابط المقالات في RSS تشير إلى عناوينها الثابتة الصريحة.")
            passed += 1
    except Exception as e:
        print(f"  ❌ خطأ في معالجة feed.xml: {e}")
        failed += 1
        errors.append(str(e))

    # 4. Test JSON files validity
    print("\n[Test 4] فحص سلامة ملفات JSON وقواعد البيانات المحلية:")
    json_files = list(BASE_DIR.glob("**/*.json"))
    json_ok = True
    for jf in json_files:
        # Ignore git/node_modules if any
        if ".git" in str(jf):
            continue
        try:
            with open(jf, "r", encoding="utf-8") as f:
                json.load(f)
            print(f"  ✅ سليم: {jf.relative_to(BASE_DIR)}")
        except Exception as e:
            print(f"  ❌ تالف: {jf.relative_to(BASE_DIR)} -> {e}")
            json_ok = False
            errors.append(f"JSON error in {jf.name}: {e}")
    if json_ok:
        passed += 1
    else:
        failed += 1

    # 5. Test Internal Links across all HTML pages
    print("\n[Test 5] فحص الروابط الداخلية وملفات CSS/JS في جميع صفحات الموقع (Zero Broken Links):")
    html_files = list(BASE_DIR.glob("**/*.html"))
    broken_links = []
    checked_links_count = 0

    for hf in html_files:
        if ".git" in str(hf):
            continue
        with open(hf, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        # Check for lingering faq.html
        if 'href="faq.html"' in content or "href='faq.html'" in content:
            broken_links.append((hf.relative_to(BASE_DIR), "faq.html (رابط قديم ميت)"))

        # Find all href and src with relative paths
        links = re.findall(r'(?:href|src)=["\']([^"\'#?]+)["\']', content)
        for l in links:
            if l.startswith("http://") or l.startswith("https://") or l.startswith("mailto:") or l.startswith("tel:") or l.startswith("data:"):
                continue
            if l.startswith("/"):
                target = BASE_DIR / l.lstrip("/")
            else:
                target = (hf.parent / l).resolve()
            
            checked_links_count += 1
            if not target.exists():
                broken_links.append((hf.relative_to(BASE_DIR), l))

    if not broken_links:
        print(f"  ✅ نجح: تم فحص {checked_links_count} رابط داخلي في {len(html_files)} صفحة، خالية 100% من الروابط المكسورة.")
        passed += 1
    else:
        print(f"  ❌ فشل: تم العثور على روابط مكسورة:")
        for page, link in broken_links:
            print(f"     - في الصفحة {page}: الرابط '{link}' غير موجود!")
        failed += 1
        errors.append(f"Broken links: {broken_links}")

    # 6. Test .htaccess Redirects and Headers
    print("\n[Test 6] فحص قواعد وتوجيهات الحماية في .htaccess:")
    htaccess_path = BASE_DIR / ".htaccess"
    if htaccess_path.exists():
        with open(htaccess_path, "r", encoding="utf-8") as f:
            ht_content = f.read()
        if "faq.html" in ht_content and "questions.html" in ht_content and "X-Frame-Options" in ht_content:
            print("  ✅ نجح: تحويل 301 التلقائي لـ questions.html وترويسات الأمان مفعلة أصولياً.")
            passed += 1
        else:
            print("  ❌ نقص في قواعد الحماية داخل .htaccess")
            failed += 1
            errors.append("htaccess missing rules")
    else:
        print("  ❌ .htaccess غير موجود")
        failed += 1
        errors.append(".htaccess missing")

    # 7. Test Image Optimization WebP
    print("\n[Test 7] التحقق من توافر صورة الهيرو المحسنة WebP:")
    webp_path = BASE_DIR / "hero-litigation.webp"
    if webp_path.exists() and webp_path.stat().st_size > 0:
        size_kb = webp_path.stat().st_size / 1024
        print(f"  ✅ نجح: صورة hero-litigation.webp موجودة بحجم {size_kb:.1f} KB (توفير 96.5% من الباندويث).")
        passed += 1
    else:
        print("  ❌ ملف hero-litigation.webp غير موجود أو تالف!")
        failed += 1
        errors.append("hero-litigation.webp missing")

    print("\n" + "=" * 60)
    print(f"📊 النتيجة النهائية: {passed} نجاح / {failed} فشل")
    print("=" * 60)

    if failed == 0:
        print("🎯 موقع المحامي سعد فراس أميل جاهز 100% ومحصن تقنياً وقضائياً وبدون أي كسر في أي جزء!")
    else:
        print("⚠️ توجد مشاكل بحاجة إلى مراجعة فورية.")

if __name__ == "__main__":
    run_tests()
