"""Fetch Slovak schools from Wikidata SPARQL (secondary + universities)."""
from __future__ import annotations

import csv
import json
import sys
import urllib.request
from pathlib import Path

UA = "JobbieSeedBot/1.0 (school-catalog)"
ENDPOINT = "https://query.wikidata.org/sparql"

SECONDARY_QUERY = """
SELECT DISTINCT ?name ?municipality WHERE {
  ?item wdt:P17 wd:Q214 .
  ?item wdt:P31 ?type .
  VALUES ?type {
    wd:Q849627
    wd:Q159334
    wd:Q3225635
    wd:Q1244442
    wd:Q5155057
    wd:Q1080794
    wd:Q387236
    wd:Q2333874
  }
  ?item rdfs:label ?name .
  FILTER(LANG(?name) = "sk")
  OPTIONAL {
    ?item wdt:P131 ?loc .
    ?loc rdfs:label ?municipality .
    FILTER(LANG(?municipality) = "sk")
  }
}
"""

UNIVERSITY_QUERY = """
SELECT DISTINCT ?name ?country ?municipality WHERE {
  ?item wdt:P31/wdt:P279* wd:Q3918 .
  ?item wdt:P17 ?countryItem .
  VALUES ?countryItem { wd:Q214 wd:Q213 }
  ?item rdfs:label ?name .
  FILTER(LANG(?name) = "sk" || LANG(?name) = "cs")
  BIND(IF(?countryItem = wd:Q214, "SK", "CZ") AS ?country)
  OPTIONAL {
    ?item wdt:P131 ?loc .
    ?loc rdfs:label ?municipality .
    FILTER(LANG(?municipality) = "sk" || LANG(?municipality) = "cs")
  }
}
"""


def run_query(sparql: str) -> list[dict]:
    req = urllib.request.Request(
        ENDPOINT,
        data=sparql.encode("utf-8"),
        headers={
            "Accept": "application/sparql-results+json",
            "User-Agent": UA,
            "Content-Type": "application/sparql-query",
        },
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        data = json.load(r)
    return data["results"]["bindings"]


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    sec_path = root / "supabase" / "seeds" / "sk-schools-secondary.csv"
    uni_path = root / "supabase" / "seeds" / "sk-schools-universities.csv"

    secondary: dict[str, str] = {}
    for row in run_query(SECONDARY_QUERY):
        name = row.get("name", {}).get("value", "").strip()
        muni = row.get("municipality", {}).get("value", "").strip()
        if len(name) >= 2:
            secondary[name] = muni

    universities: dict[tuple[str, str], str] = {}
    for row in run_query(UNIVERSITY_QUERY):
        name = row.get("name", {}).get("value", "").strip()
        country = row.get("country", {}).get("value", "SK").strip()
        muni = row.get("municipality", {}).get("value", "").strip()
        if len(name) >= 2 and country in ("SK", "CZ"):
            universities[(name, country)] = muni

    with sec_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "municipality"])
        for name in sorted(secondary.keys()):
            w.writerow([name, secondary[name]])

    with uni_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["name", "country", "municipality"])
        for (name, country) in sorted(universities.keys()):
            w.writerow([name, country, universities[(name, country)]])

    print(f"Wrote {len(secondary)} secondary to {sec_path}")
    print(f"Wrote {len(universities)} universities to {uni_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
