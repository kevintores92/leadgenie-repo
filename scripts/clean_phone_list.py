#!/usr/bin/env python3
import csv
import re
import sys
from pathlib import Path
import argparse


def normalize_phone(s, country):
    if s is None:
        return None
    s = re.sub(r"[^0-9+]", "", str(s).strip())
    if s == "" or s == "+":
        return None
    if s.startswith("+"):
        return s
    digits = re.sub(r"\D", "", s)
    if len(digits) == 0:
        return None
    c = country.lstrip("+") if country else ""
    if c and not digits.startswith(c) and len(digits) == 10:
        return f"+{c}{digits}"
    return f"+{digits}"


def main():
    p = argparse.ArgumentParser(description="Clean phone list and preserve all original columns")
    p.add_argument("input")
    p.add_argument("output", help="Output cleaned full CSV (original cols + _clean_phone)")
    p.add_argument("--phone-col", required=True, help="Name of the phone column (case-insensitive)")
    p.add_argument("--country", default="+1", help="Default country code to prepend (e.g. +1)")
    p.add_argument("--max", type=int, default=0, help="Max rows to keep (0=all)")
    p.add_argument("--phones-only", action="store_true", help="Also write a phone-only CSV alongside the cleaned CSV")
    args = p.parse_args()

    inp = Path(args.input)
    out = Path(args.output)
    if not inp.exists():
        print("Input file not found:", inp)
        sys.exit(1)

    with inp.open(newline="", encoding="utf-8", errors="replace") as fh:
        reader = csv.DictReader(fh)
        cols = reader.fieldnames or []
        phone_col = args.phone_col
        # match case-insensitive
        match = None
        for c in cols:
            if c.strip().lower() == phone_col.strip().lower():
                match = c
                break
        if match:
            phone_col = match
        if phone_col not in cols:
            print("Phone column not found. Available columns:", cols)
            sys.exit(1)
        rows = list(reader)

    seen = set()
    kept_rows = []
    phones = []
    for r in rows:
        if args.max and len(kept_rows) >= args.max:
            break
        raw = r.get(phone_col, "") or ""
        if not str(raw).strip():
            continue
        n = normalize_phone(raw, args.country)
        if not n:
            continue
        ndigits = re.sub(r"\D", "", n)
        if len(ndigits) < 7 or len(ndigits) > 15:
            continue
        if n in seen:
            continue
        seen.add(n)
        # preserve original row and add cleaned phone
        new_row = dict(r)
        new_row["_clean_phone"] = n
        kept_rows.append(new_row)
        phones.append(n)

    # write full cleaned CSV (original columns + _clean_phone)
    out.parent.mkdir(parents=True, exist_ok=True)
    out_fieldnames = list(cols) + ["_clean_phone"]
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=out_fieldnames)
        writer.writeheader()
        for r in kept_rows:
            # ensure all keys present
            writer.writerow({k: r.get(k, "") for k in out_fieldnames})

    if args.phones_only:
        phone_only = out.with_name(out.stem + "-phones.csv")
        with phone_only.open("w", newline="", encoding="utf-8") as fh:
            w = csv.writer(fh)
            w.writerow(["phone"])
            for num in phones:
                w.writerow([num])
        print(f"Wrote {len(kept_rows)} cleaned rows to {out} and phone-only to {phone_only}")
    else:
        print(f"Wrote {len(kept_rows)} cleaned rows to {out}")


if __name__ == '__main__':
    main()
