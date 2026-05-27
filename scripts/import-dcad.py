#!/usr/bin/env python3
"""
DCAD 2025 property data import script.

Streams the fixed-width DAT file and batch-upserts residential records
into the Supabase `properties` table.

Fields extracted (1-based col numbers from Add_Change_File_Format.xls):
  DCAD ACCOUNT NUMBER      0010-0026
  OWNER NAME               0027-0056
  OWNER ZIPCODE            0237-0245  (9-digit; first 5 used as property ZIP)
  STREET NUMBER            0435-0441
  STREET DIRECTION         0447-0448
  STREET NAME              0449-0471
  STREET SUFFIX            0472-0475
  TOTAL LAND VALUE         0799-0809
  TOTAL IMPROVEMENT VALUE  0821-0831
  MARKET REAL VALUE        2205-2213  → current_proposed_value

Note: YEAR BUILT and TOTAL LIVING AREA SQFT are not in this file.
      total_living_area_sqft is stored as 0 (the NOT NULL column default).
      The comp engine skips sqft filtering when sqft == 0.
"""

import sys
import json
import urllib.request
import urllib.error

# ── Config ────────────────────────────────────────────────────────────────────
DAT_FILE        = '/Users/antoine.harris/Downloads/DCAD/DCAD_2025.DAT'
SUPABASE_URL    = 'https://vmajmwdkgxqiensntjfg.supabase.co'
SERVICE_KEY     = 'sb_secret_q0lt4Rt6CqtHOnnKCte3VA_Ma67uyRQ'
COUNTY_NAME     = 'dallas'
BATCH_SIZE      = 500
MIN_RECORD_LEN  = 2213  # must reach MARKET REAL VALUE field
# ─────────────────────────────────────────────────────────────────────────────

HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates',
}


def parse_int(raw):
    s = raw.strip()
    if not s:
        return None
    try:
        v = int(s)
        return v if v > 0 else None
    except ValueError:
        return None


def parse_record(line):
    if len(line) < MIN_RECORD_LEN:
        return None

    # Account number (required)
    acct = line[9:26].strip()
    if not acct:
        return None

    # Street address — skip records with no street name
    street_name = line[448:471].strip()
    if not street_name:
        return None

    street_num = line[434:441].strip().lstrip('0') or '0'
    street_dir = line[446:448].strip()
    street_sfx = line[471:475].strip()
    parts = [p for p in [street_num, street_dir, street_name, street_sfx] if p]
    address = ' '.join(parts)

    # ZIP — use first 5 digits of owner mailing zip as property zip
    zip_raw = line[236:241].strip()
    if not zip_raw or zip_raw == '00000':
        return None

    # Values
    market_val = parse_int(line[2204:2213])
    if not market_val:
        return None

    land_val = parse_int(line[798:809])
    impv_val = parse_int(line[820:831])

    return {
        'county_account_number':   acct,
        'county_name':             COUNTY_NAME,
        'street_address':          address,
        'zip_code':                zip_raw,
        'owner_name':              line[26:56].strip() or None,
        'year_built':              None,
        'total_living_area_sqft':  0,        # not in this file; comp engine handles 0
        'current_proposed_value':  market_val,
        'market_value_land':       land_val,
        'market_value_improvements': impv_val,
        'homestead_capped_value':  None,
    }


def upsert_batch(records):
    body = json.dumps(records).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/properties',
        data=body,
        headers=HEADERS,
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
    except urllib.error.HTTPError as e:
        print(f'\nHTTP {e.code}: {e.read()[:300].decode(errors="replace")}')
        return False
    except urllib.error.URLError as e:
        print(f'\nNetwork error: {e.reason}')
        return False

    if status not in (200, 201):
        print(f'\nUnexpected status {status}')
        return False
    return True


def main():
    print(f'Reading {DAT_FILE}')
    print('Importing residential (R) records to Supabase…\n')

    batch: list[dict] = []
    inserted = 0
    skipped  = 0
    errors   = 0

    with open(DAT_FILE, 'r', encoding='latin-1') as f:
        for line in f:
            if not line or line[0] != 'R':
                continue

            record = parse_record(line)
            if record is None:
                skipped += 1
                continue

            batch.append(record)

            if len(batch) >= BATCH_SIZE:
                if upsert_batch(batch):
                    inserted += len(batch)
                else:
                    errors += len(batch)
                batch = []
                print(f'  {inserted:>7,} inserted  {skipped:>6,} skipped  {errors:>5,} errors', end='\r')

    # flush remainder
    if batch:
        if upsert_batch(batch):
            inserted += len(batch)
        else:
            errors += len(batch)

    print(f'\n\nDone.')
    print(f'  Inserted : {inserted:,}')
    print(f'  Skipped  : {skipped:,}')
    print(f'  Errors   : {errors:,}')


if __name__ == '__main__':
    main()
