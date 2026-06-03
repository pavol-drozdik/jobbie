"""Download CVTI SR Excel school registers and write secondary CSV.

Source: https://www.cvtisr.sk/.../zoznamy-skol-a-skolskych-zariadeni.html
  GYM_Z.XLS, SOS_Z.XLS, KON_Z.XLS, SPECSS_Z.XLS

Run from repo root:
  pip install xlrd
  python supabase/scripts/fetch_cvti_sk_schools.py

Output: supabase/seeds/sk-schools-secondary.csv
"""
from __future__ import annotations

import csv
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

try:
    import xlrd
except ImportError:
    print("Install xlrd: pip install xlrd", file=sys.stderr)
    raise SystemExit(1) from None

UA = "JobbieSeedBot/1.0 (school-catalog; +https://jobbie.sk)"
BASE = "https://www.cvtisr.sk/buxus/docs//JC/zoznamy/"

SECONDARY_FILES = (
    "GYM_Z.XLS",
    "SOS_Z.XLS",
    "KON_Z.XLS",
    "SPECSS_Z.XLS",
)


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and dest.stat().st_size > 1000:
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as r:
        dest.write_bytes(r.read())


def parse_sheet(path: Path) -> list[tuple[str, str]]:
    wb = xlrd.open_workbook(str(path))
    sh = wb.sheet_by_index(0)
    hdr_row = 1
    hdr = [str(sh.cell_value(hdr_row, c)).strip().lower() for c in range(sh.ncols)]
    if "nazov" not in hdr:
        for r in range(min(5, sh.nrows)):
            row = [str(sh.cell_value(r, c)).strip().lower() for c in range(sh.ncols)]
            if "nazov" in row:
                hdr_row = r
                hdr = row
                break
    cols = {h: i for i, h in enumerate(hdr)}
    ni = cols["nazov"]
    mi = cols.get("miesto", cols.get("obec", 10))
    out: list[tuple[str, str]] = []
    for r in range(hdr_row + 1, sh.nrows):
        name = str(sh.cell_value(r, ni)).strip()
        municipality = str(sh.cell_value(r, mi)).strip()
        if len(name) < 2 or name.lower() == "nazov":
            continue
        out.append((name, municipality))
    return out


def disambiguate(rows: list[tuple[str, str]]) -> list[tuple[str, str]]:
    by_name: dict[str, set[str]] = defaultdict(set)
    for name, muni in rows:
        by_name[name].add(muni)
    seen: set[tuple[str, str]] = set()
    result: list[tuple[str, str]] = []
    for name, muni in rows:
        key = (name, muni)
        if key in seen:
            continue
        seen.add(key)
        if len(by_name[name]) > 1 and muni:
            display = f"{name} ({muni})"
        else:
            display = name
        result.append((display, muni))
    return sorted(result, key=lambda x: (x[0].lower(), x[1].lower()))


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    cache = root / "supabase" / "scripts" / "_cvti_cache"
    out_csv = root / "supabase" / "seeds" / "sk-schools-secondary.csv"

    pairs: list[tuple[str, str]] = []
    for fname in SECONDARY_FILES:
        url = BASE + fname
        dest = cache / fname
        print(f"Fetching {fname}…", file=sys.stderr)
        download(url, dest)
        pairs.extend(parse_sheet(dest))

    rows = disambiguate(pairs)
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "municipality"])
        w.writerows(rows)

    print(
        f"Wrote {len(rows)} secondary schools ({len(pairs)} CVTI rows) to {out_csv}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
