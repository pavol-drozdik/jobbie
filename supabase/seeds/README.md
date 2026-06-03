# Supabase seed CSV snapshots

## Municipalities

- `municipalities-slovakia.csv` — obce/mestá (see `generate_sk_municipalities_seed.py`).

## Education institutions (CV school picker)

| File | Contents |
|------|----------|
| `sk-schools-secondary.csv` | Slovak secondary schools (`name`, `municipality`) — **CVTI SR registers** |
| `sk-schools-universities.csv` | Universities (`name`, `country` SK/CZ, `municipality`) |

### Refresh workflow

1. **Secondary (authoritative, ~720 schools):**
   ```bash
   pip install xlrd
   python supabase/scripts/fetch_cvti_sk_schools.py
   ```
   Downloads [CVTI SR Excel lists](https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/registre/zoznamy-skol-a-skolskych-zariadeni.html): Gymnáziá (`GYM_Z.XLS`), SOŠ (`SOS_Z.XLS`), Konzervatóriá (`KON_Z.XLS`), Špeciálne stredné (`SPECSS_Z.XLS`).

2. **Universities (Wikipedia + curated CZ/SK):**
   ```bash
   python supabase/scripts/build_sk_schools_csv.py
   ```

3. **Regenerate SQL migration:**
   ```bash
   python supabase/scripts/generate_sk_schools_seed.py
   ```

4. **Apply:** `supabase db push` (or run `20260623160200_sk_education_institutions_cvti_refresh.sql` if the old small seed was already applied).

When the same official name appears in multiple municipalities, the seed stores `Názov (Obec)` so the `(name, level, country)` unique constraint stays valid.
