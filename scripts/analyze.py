#!/usr/bin/env python3
"""Validate and summarize TrackFlow incident CSV files without exposing PII."""

from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT / "packages" / "shared" / "python") not in sys.path:
    sys.path.insert(0, str(ROOT / "packages" / "shared" / "python"))

from incident_validation import (  # noqa: E402
    CARRIERS,
    CATEGORIES,
    COUNTRIES,
    CUSTOMER_TYPES,
    FIELDS,
    INVALID_REASONS,
    STATUSES,
    record_errors,
)

@dataclass
class Analysis:
    total: int = 0
    valid: int = 0
    invalid: int = 0
    errors: Counter[str] = field(default_factory=Counter)
    categories: Counter[str] = field(default_factory=Counter)
    statuses: Counter[str] = field(default_factory=Counter)
    countries: Counter[str] = field(default_factory=Counter)
    satisfaction_scores: Counter[int] = field(default_factory=Counter)

    @property
    def closed_scored(self) -> int:
        return sum(self.satisfaction_scores.values())

    @property
    def average_satisfaction(self) -> float | None:
        if not self.closed_scored:
            return None
        return sum(score * count for score, count in self.satisfaction_scores.items()) / self.closed_scored

    def export_rows(self) -> Iterable[tuple[str, str]]:
        yield "Total records", str(self.total)
        yield "Valid records", str(self.valid)
        yield "Invalid records", str(self.invalid)
        for key, label in INVALID_REASONS.items():
            yield f"Invalid - {label}", str(self.errors[key])
        for category in CATEGORIES:
            yield f"Category - {category}", str(self.categories[category])
        for status in STATUSES:
            yield f"Status - {status}", str(self.statuses[status])
        for country in COUNTRIES:
            yield f"Country - {country}", str(self.countries[country])
        yield "Scored closed incidents", str(self.closed_scored)
        yield "Average satisfaction", (
            f"{self.average_satisfaction:.2f}" if self.average_satisfaction is not None else "N/A"
        )
        for score in range(1, 6):
            yield f"Satisfaction score - {score}", str(self.satisfaction_scores[score])


class CsvFormatError(ValueError):
    """The file was readable but its structure is not the expected incident CSV."""


def analyze_csv(path: Path) -> Analysis:
    analysis = Analysis()
    with path.open("r", encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        if reader.fieldnames is None:
            raise CsvFormatError("El CSV está vacío o no tiene fila de cabecera.")
        missing_columns = [field_name for field_name in FIELDS if field_name not in reader.fieldnames]
        if missing_columns:
            raise CsvFormatError("Faltan columnas obligatorias: " + ", ".join(missing_columns))

        for row in reader:
            if None in row:
                raise CsvFormatError(f"La fila {reader.line_num} tiene más valores que columnas la cabecera.")
            analysis.total += 1
            errors, score = record_errors(row)
            if errors:
                analysis.invalid += 1
                analysis.errors.update(errors)
                continue

            analysis.valid += 1
            category = (row["category"] or "").strip()
            status = (row["status"] or "").strip()
            country = (row["country"] or "").strip()
            analysis.categories[category] += 1
            analysis.statuses[status] += 1
            analysis.countries[country] += 1
            if status == "CLOSED" and score is not None:
                analysis.satisfaction_scores[score] += 1

    return analysis


def _print_breakdown(title: str, counts: Counter, order: Iterable[str], total: int) -> None:
    print(f"\n{title}")
    for index, name in enumerate(order):
        count = counts[name]
        percentage = count / total * 100 if total else 0.0
        branch = "└─" if index == len(order) - 1 else "├─"
        print(f"  {branch} {name:<24} {count:>3}  ({percentage:>4.1f}%)")


def print_summary(analysis: Analysis, source_name: str) -> None:
    print("=" * 60)
    print("  TRACKFLOW — INCIDENT REPORT ANALYSIS")
    print(f"  Source file: {source_name}")
    print("=" * 60)
    print(f"\nTOTAL RECORDS IN FILE .......... {analysis.total:>3}")
    print(f"  ├─ Valid records .............. {analysis.valid:>3}")
    print(f"  └─ Invalid / incomplete ........ {analysis.invalid:>3}")

    print("\nINVALID RECORDS BREAKDOWN")
    visible_reasons = (
        "invalid_tracking_number",
        "invalid_carrier",
        "invalid_category",
        "invalid_email",
        "closed_without_score",
    )
    for index, key in enumerate(visible_reasons):
        branch = "└─" if index == len(visible_reasons) - 1 else "├─"
        label = INVALID_REASONS[key]
        print(f"  {branch} {label:<31} {analysis.errors[key]:>3}")
    for key, label in INVALID_REASONS.items():
        if key not in visible_reasons and analysis.errors[key]:
            print(f"  ├─ {label:<31} {analysis.errors[key]:>3}")

    _print_breakdown("BREAKDOWN BY CATEGORY (valid records)", analysis.categories, CATEGORIES, analysis.valid)
    _print_breakdown("BREAKDOWN BY STATUS (valid records)", analysis.statuses, STATUSES, analysis.valid)
    _print_breakdown("BREAKDOWN BY COUNTRY (valid records)", analysis.countries, COUNTRIES, analysis.valid)

    closed_count = analysis.statuses["CLOSED"]
    average = analysis.average_satisfaction
    print("\nSATISFACTION INDEX (closed incidents)")
    print(f"  Scored incidents: {analysis.closed_scored} of {closed_count}")
    print(f"  Average score: {average:.2f} / 5.00" if average is not None else "  Average score: N/A")
    score_labels = {
        1: "Very dissatisfied",
        2: "Dissatisfied",
        3: "Neutral",
        4: "Satisfied",
        5: "Very satisfied",
    }
    for score, label in score_labels.items():
        print(f"  ├─ Score {score} ({label}) ........ {analysis.satisfaction_scores[score]}")
    print("\n" + "=" * 60)


def export_csv(analysis: Analysis, path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(("metric", "value"))
        writer.writerows(analysis.export_rows())


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyze TrackFlow incident records from CSV.")
    parser.add_argument("csv_path", type=Path, help="Path to the incident CSV")
    args = parser.parse_args()

    # Defensive checks before touching the file, so the user gets a precise reason.
    if not args.csv_path.exists():
        print(f"Error: no existe el archivo {args.csv_path}", file=sys.stderr)
        return 1
    if not args.csv_path.is_file():
        print(f"Error: {args.csv_path} no es un archivo", file=sys.stderr)
        return 1

    try:
        analysis = analyze_csv(args.csv_path)
    except PermissionError:
        print(f"Error: sin permisos para leer {args.csv_path}", file=sys.stderr)
        return 1
    except OSError as error:
        print(f"Error: no se pudo leer {args.csv_path} ({error.strerror or 'error de E/S'})", file=sys.stderr)
        return 1
    except UnicodeError:
        print("Error: el archivo no está codificado en UTF-8", file=sys.stderr)
        return 1
    except csv.Error as error:
        print(f"Error: formato CSV no válido ({error})", file=sys.stderr)
        return 1
    except CsvFormatError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1

    print_summary(analysis, args.csv_path.name)
    try:
        answer = input("¿Deseas exportar los resultados a CSV? [s / n] ").strip().lower()
    except EOFError:
        answer = "n"
    if answer in {"s", "y"}:
        output_path = Path("results.csv")
        try:
            export_csv(analysis, output_path)
        except OSError as error:
            print(f"Error: no se pudieron exportar los resultados ({error.strerror or 'error de E/S'})", file=sys.stderr)
            return 1
        print(f"Results exported to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())