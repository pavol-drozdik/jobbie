"""Fetch Slovak secondary schools from eduZoznam.sk browse pages.

Run: python supabase/scripts/fetch_eduzoznam_secondary.py
Output: supabase/seeds/sk-schools-secondary-eduzoznam.csv
"""
from __future__ import annotations

import csv
import re
import sys
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

UA = "JobbieSeedBot/1.0 (school-catalog; +https://jobbie.sk)"
BASE = "https://www.eduzoznam.sk/pokracuj/index.php"

ROW_RE = re.compile(
    r"<a href='[^']*__key=\d+[^']*'>([^<]+)</a></td><td>([^<]*)</td><td>([^<]+)</td>",
    re.IGNORECASE,
)

SECONDARY_NAME_MARKERS = (
    "gymnáz",
    "gymnaz",
    "stredná odborn",
    "stredna odborn",
    "stredná priemyseln",
    "stredna priemyseln",
    "stredná šport",
    "stredna sport",
    "stredná zdravot",
    "stredna zdrot",
    "stredná pedagog",
    "konzervat",
    "odborné učili",
    "odborne ucili",
    "obchodná akadém",
    "obchodna akadem",
    "hotelová akadém",
    "dopravná akadém",
    "pedagogická akadém",
    "technická akadém",
    "škola umeleckého",
    "skola umeleckeho",
    "súkromná stredná",
    "sukromna stredna",
    "súkromné gymnáz",
    "szakközépiskola",
    "szakkozpiskola",
)

EXCLUDE_ONLY = (
    "základná škola",
    "zakladna skola",
    "materská škola",
    "materska skola",
    "školský internát",
    "skolsky internat",
    "školská jedáleň",
    "centrum voľného času",
    "centrum volneho casu",
    "školský klub",
    "diagnostické centrum",
    "reedukačné centrum",
    "liečebno",
    "špeciálna základná",
    "specjalna zakladna",
)


def fetch_page(start: int, pagesize: int = 100) -> str:
    params = {
        "__action": "Browse",
        "__entity": "skola_anonym",
        "__orderby": "skola_kraj",
        "__orderdir": "asc",
        "__start": str(start),
        "__pagesize": str(pagesize),
    }
    url = BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=90) as r:
        raw = r.read()
    for enc in ("utf-8", "windows-1250", "iso-8859-2"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def parse_total(html: str) -> int:
    m = re.search(r"Zobrazen[^<]*\d+-\d+\s+z\s+(\d+)", html)
    return int(m.group(1)) if m else 21207


def is_secondary(name: str) -> bool:
    n = name.lower()
    if any(x in n for x in SECONDARY_NAME_MARKERS):
        return True
    if any(x in n for x in EXCLUDE_ONLY):
        return False
    if "spojená škola" in n or "spojena skola" in n:
        return False
    return False


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    out_path = root / "supabase" / "seeds" / "sk-schools-secondary-eduzoznam.csv"
    schools: dict[str, str] = {}
    pagesize = 100
    start = 0
    total = 21207
    while start < total:
        html = fetch_page(start, pagesize)
        if start == 0:
            total = parse_total(html)
            print(f"eduZoznam register ~{total} rows", file=sys.stderr)
        batch = ROW_RE.findall(html)
        if not batch and start > 0:
            break
        for name, _street, city in batch:
            name = unescape(name.strip())
            city = unescape(city.strip())
            if not name or not is_secondary(name):
                continue
            schools[name] = city
        start += pagesize
        if start % 1000 == 0:
            print(f"  … {min(start, total)}/{total}, secondary: {len(schools)}", file=sys.stderr)
        time.sleep(0.2)
    with out_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "municipality"])
        for name in sorted(schools.keys()):
            w.writerow([name, schools[name]])
    print(f"Wrote {len(schools)} secondary schools to {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
