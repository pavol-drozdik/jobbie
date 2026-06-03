"""Build sk-schools-universities.csv from Wikipedia (SK/CZ) + curated lists.

Secondary schools: use fetch_cvti_sk_schools.py (CVTI SR Excel registers).

Run from repo root: python supabase/scripts/build_sk_schools_csv.py
"""
from __future__ import annotations

import csv
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

UA = "JobbieSeedBot/1.0 (school-catalog; +https://jobbie.sk)"

SK_UNIVERSITY_CATEGORIES = [
    "Kategória:Verejné vysoké školy na Slovensku",
    "Kategória:Súkromné vysoké školy na Slovensku",
    "Kategória:Štátne vysoké školy na Slovensku",
]

CZ_UNIVERSITY_CATEGORIES = [
    "Kategorie:Vysoké školy v Česku",
    "Kategorie:Veřejné vysoké školy v Česku",
    "Kategorie:Soukromé vysoké školy v Česku",
]

# Curated extras (official Slovak names) when Wikipedia categories are incomplete.
SK_UNIVERSITIES_EXTRA = [
    ("Univerzita Komenského v Bratislave", "SK", "Bratislava"),
    ("Slovenská technická univerzita v Bratislave", "SK", "Bratislava"),
    ("Ekonomická univerzita v Bratislave", "SK", "Bratislava"),
    ("Vysoká škola výtvarných umení v Bratislave", "SK", "Bratislava"),
    ("Vysoká škola múzických umení v Bratislave", "SK", "Bratislava"),
    ("Univerzita veterinárskeho lekárstva a farmácie v Košiciach", "SK", "Košice"),
    ("Technická univerzita v Košiciach", "SK", "Košice"),
    ("Univerzita Pavla Jozefa Šafárika v Košiciach", "SK", "Košice"),
    ("Univerzita Konštantína Filozofa v Nitre", "SK", "Nitra"),
    ("Slovenská poľnohospodárska univerzita v Nitre", "SK", "Nitra"),
    ("Univerzita sv. Cyrila a Metoda v Trnave", "SK", "Trnava"),
    ("Univerzita sv. Alžbety v Bratislave", "SK", "Bratislava"),
    ("Univerzita Mateja Bela v Banskej Bystrici", "SK", "Banská Bystrica"),
    ("Univerzita v Žiline", "SK", "Žilina"),
    ("Technická univerzita vo Zvolene", "SK", "Zvolen"),
    ("Univerzita Alexandra Dubčeka v Trenčíne", "SK", "Trenčín"),
    ("Univerzita v Trnave", "SK", "Trnava"),
    ("Univerzita J. Selyeho v Komárne", "SK", "Komárno"),
    ("Univerzita prešovská", "SK", "Prešov"),
    ("Katolícka univerzita v Ružomberku", "SK", "Ružomberok"),
    ("Slovenská zdravotnícka univerzita v Bratislave", "SK", "Bratislava"),
    ("Akadémia Policajného zboru v Bratislave", "SK", "Bratislava"),
    ("Akadémia ozbrojených síl generála M. R. Štefánika", "SK", "Liptovský Mikuláš"),
    ("Vysoká škola bezpečnostného manažérstva v Košiciach", "SK", "Košice"),
    ("Vysoká škola Danubius", "SK", "Bratislava"),
]

CZ_UNIVERSITIES_EXTRA = [
    ("Univerzita Karlova", "CZ", "Praha"),
    ("Masarykova univerzita", "CZ", "Brno"),
    ("České vysoké učení technické v Praze", "CZ", "Praha"),
    ("Vysoké učení technické v Brně", "CZ", "Brno"),
    ("Univerzita Palackého v Olomouci", "CZ", "Olomouc"),
    ("Univerzita Ostrava", "CZ", "Ostrava"),
    ("Vysoká škola ekonomická v Praze", "CZ", "Praha"),
    ("Česká zemědělská univerzita v Praze", "CZ", "Praha"),
    ("Mendelova univerzita v Brně", "CZ", "Brno"),
    ("Univerzita Pardubice", "CZ", "Pardubice"),
    ("Technická univerzita v Liberci", "CZ", "Liberec"),
    ("Západočeská univerzita v Plzni", "CZ", "Plzeň"),
    ("Jihočeská univerzita v Českých Budějovicích", "CZ", "České Budějovice"),
    ("Univerzita Hradec Králové", "CZ", "Hradec Králové"),
    ("Univerzita Tomáše Bati ve Zlíně", "CZ", "Zlín"),
    ("Vysoká škola chemicko-technologická v Praze", "CZ", "Praha"),
    ("Akademie múzických umění v Praze", "CZ", "Praha"),
    ("Akademie výtvarných umění v Praze", "CZ", "Praha"),
    ("Univerzita Jana Evangelisty Purkyně v Ústí nad Labem", "CZ", "Ústí nad Labem"),
    ("Slezská univerzita v Opavě", "CZ", "Opava"),
]


def wiki_api(base: str, params: dict) -> dict:
    url = base + "?" + urllib.parse.urlencode({**params, "format": "json"})
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.load(r)


def category_members(base: str, category: str, limit: int = 500) -> list[str]:
    out: list[str] = []
    cmcontinue: str | None = None
    while len(out) < limit:
        params: dict = {
            "action": "query",
            "list": "categorymembers",
            "cmtitle": category,
            "cmlimit": "500",
            "cmtype": "page",
        }
        if cmcontinue:
            params["cmcontinue"] = cmcontinue
        data = wiki_api(base, params)
        for m in data.get("query", {}).get("categorymembers", []):
            title = (m.get("title") or "").strip()
            if title and not title.startswith(("Kategória:", "Kategorie:")):
                out.append(title)
        cmcontinue = data.get("continue", {}).get("cmcontinue")
        if not cmcontinue:
            break
    return out[:limit]


def municipality_from_title(title: str) -> str:
    m = re.search(r"\b(v|vo|v)\s+([^,\(\)]+)\s*$", title, re.I)
    if m:
        return m.group(2).strip()
    m = re.search(r"\(([^)]+)\)\s*$", title)
    if m:
        return m.group(1).strip()
    return ""


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    seeds = root / "supabase" / "seeds"
    uni_path = seeds / "sk-schools-universities.csv"

    universities: dict[tuple[str, str], str] = {}
    for cat in SK_UNIVERSITY_CATEGORIES:
        for title in category_members("https://sk.wikipedia.org/w/api.php", cat):
            name = title.strip()
            if len(name) < 4:
                continue
            universities[(name, "SK")] = municipality_from_title(name)
    for name, country, muni in SK_UNIVERSITIES_EXTRA:
        universities[(name, country)] = muni
    for cat in CZ_UNIVERSITY_CATEGORIES:
        for title in category_members("https://cs.wikipedia.org/w/api.php", cat):
            name = title.strip()
            if len(name) < 4:
                continue
            universities[(name, "CZ")] = municipality_from_title(name)
    for name, country, muni in CZ_UNIVERSITIES_EXTRA:
        universities[(name, country)] = muni

    seeds.mkdir(parents=True, exist_ok=True)
    with uni_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "country", "municipality"])
        for (name, country) in sorted(universities.keys()):
            w.writerow([name, country, universities[(name, country)]])

    print(f"Wrote {len(universities)} university rows to {uni_path}")
    print("Secondary: run python supabase/scripts/fetch_cvti_sk_schools.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
