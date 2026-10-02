import json
import re
from pathlib import Path

CATALOGS = json.loads(
    (Path(__file__).resolve().parents[3] / "src/lib/catalogs.json").read_text(
        encoding="utf-8"
    )
)


def normalize_tags(values, kind="skills", strict=False):
    if not isinstance(values, list):
        raise ValueError("Use a list of individual values")
    choices = sorted([v.casefold() for v in CATALOGS[kind]], key=len, reverse=True)
    result = []
    for raw in values:
        if not isinstance(raw, str):
            raise ValueError("Invalid tag")
        for part in filter(
            None, (v.strip().casefold() for v in re.split(r"[,;\n]+", raw))
        ):
            rest = part
            found = []
            while rest:
                match = next(
                    (v for v in choices if rest == v or rest.startswith(v + " ")), None
                )
                if not match:
                    break
                found.append(match)
                rest = rest[len(match) :].strip()
                rest = re.sub(r"^and\s+", "", rest)
            if not rest and found:
                result.extend(found)
            elif strict or len(part) > 80 or len(part.split()) > 4:
                raise ValueError("Choose individual catalog values")
            else:
                result.append(part)
    result = list(dict.fromkeys(result))
    if len(result) > 20:
        raise ValueError("Choose at most 20 values")
    return result
