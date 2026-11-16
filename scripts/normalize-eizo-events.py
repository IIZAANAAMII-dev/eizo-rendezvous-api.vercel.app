"""Convert a local Globo CSV export to the EIZO Events import format."""
import argparse
import csv
from datetime import datetime
import json
from pathlib import Path
import sys

def convert(args):
    mapping = {
        "source_id": args.id, "registered_at": args.timestamp,
        "name": args.name, "email": args.email,
        "company": args.company, "sector": args.sector,
    }
    with args.input.open(encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream, delimiter=args.delimiter)
        if set(filter(None, mapping.values())) - set(reader.fieldnames or []):
            raise ValueError("Colonnes indiquées absentes du fichier CSV.")
        rows = []
        for index, record in enumerate(reader, start=2):
            row = {key: (record.get(column) or "").strip() for key, column in mapping.items()}
            try:
                date = datetime.fromisoformat(row["registered_at"])
                if date.utcoffset() is None:
                    raise ValueError()
                if not all(row[key] for key in ("source_id", "name", "email")):
                    raise ValueError()
                row["registered_at"] = date.isoformat()
            except ValueError:
                raise ValueError(f"Ligne {index} : identifiant, date avec fuseau, nom ou e-mail invalide.") from None
            rows.append(row)
    if not 1 <= len(rows) <= 1000:
        raise ValueError("Le lot doit contenir entre 1 et 1000 lignes.")
    data = json.dumps(rows, ensure_ascii=False, indent=2).encode("utf-8")
    if len(data) > 750_000:
        raise ValueError("Fichier trop volumineux. Découpez le CSV en lots plus petits.")
    with args.output.open("xb") as stream:
        stream.write(data)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--delimiter", default=",")
    for field in ("id", "timestamp", "name", "email"):
        parser.add_argument("--" + field, required=True)
    for field in ("company", "sector"):
        parser.add_argument("--" + field)
    try:
        convert(parser.parse_args())
    except (ValueError, OSError) as error:
        sys.exit(str(error))
