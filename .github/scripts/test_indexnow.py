import unittest
from indexnow import page_url, sitemap_urls, check_page


class IndexNowTests(unittest.TestCase):
    def test_public_pages(self):
        for path in ("/", "/faq-appeals.html", "/faq-administrative.html", "/articles/art-1.html"):
            self.assertEqual(page_url("https://saadamil.com" + path), "https://saadamil.com" + path)

    def test_reject_private_external_and_noncanonical_urls(self):
        for url in ("http://saadamil.com/", "https://evil.example/", "https://saadamil.com/#faq",
                    "https://saadamil.com/faq-appeals.html?x=1", "https://saadamil.com/admin.html",
                    "https://saadamil.com/api/secret.html", "https://saadamil.com/data/client.html",
                    "https://saadamil.com/%61dmin.html", "https://saadamil.com/x/../admin.html",
                    "https://saadamil.com/llms.txt", "https://saadamil.com:443/",
                    "https://saadamil.com/%2561dmin.html"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                page_url(url)

    def test_sitemap_limits_and_duplicates(self):
        def xml(urls):
            return ('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
                    ''.join('<url><loc>' + u + '</loc></url>' for u in urls) + '</urlset>').encode()
        self.assertEqual(sitemap_urls(xml(["https://saadamil.com/"])), ["https://saadamil.com/"])
        for urls in ([], ["https://saadamil.com/"] * 2,
                     [f"https://saadamil.com/{i}.html" for i in range(101)]):
            with self.assertRaises(ValueError):
                sitemap_urls(xml(urls))

    def test_noindex_and_wrong_canonical_stop_submission(self):
        url = "https://saadamil.com/"
        valid = b'<link rel="canonical" href="https://saadamil.com/">'
        headers = {"Content-Type": "text/html; charset=utf-8"}
        self.assertEqual(check_page(url, valid, headers)["status"], 200)
        for html in (b'', valid * 2, valid + b'<meta name="robots" content="noindex,follow">',
                     valid + b'<meta name="bingbot" content="none">'):
            with self.assertRaises(ValueError):
                check_page(url, html, headers)
        with self.assertRaises(ValueError):
            check_page(url, valid, dict(headers, **{"X-Robots-Tag": "noindex"}))


if __name__ == "__main__":
    unittest.main()
