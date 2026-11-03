"""Fetch daily rainfall for each Jalna sample box from NASA POWER (free, no key), June to October, 2018 to 2026.

Source: NASA POWER, parameter PRECTOTCORR (corrected precipitation, mm/day, about 0.5 degree grid).
It is a coarse gridded estimate, good for "was it a dry spell", not for field-level rain.
Output: ../data/rain/<taluka>.json  ->  {"2026-06-01": 1.68, ...}
"""
import json
import time
import urllib.request
from pathlib import Path

from config import TALUKAS

OUT = Path(__file__).resolve().parent.parent / "data" / "rain"
URL = ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR&community=AG"
       "&longitude={lon}&latitude={lat}&start=20180601&end=20261031&format=JSON")


def fetch(name, lat, lon):
    last = None
    for attempt in range(4):
        try:
            with urllib.request.urlopen(URL.format(lat=lat, lon=lon), timeout=120) as r:
                d = json.load(r)["properties"]["parameter"]["PRECTOTCORR"]
            out = {}
            for k, v in d.items():
                if v is None or v < 0:      # POWER uses -999 for missing days
                    continue
                date = f"{k[:4]}-{k[4:6]}-{k[6:]}"
                if 6 <= int(k[4:6]) <= 10:
                    out[date] = round(float(v), 2)
            return out
        except Exception as e:
            last = e
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"{name}: {last}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, t in TALUKAS.items():
        data = fetch(name, t["lat"], t["lon"])
        (OUT / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")))
        print(f"{name}: {len(data)} days")


if __name__ == "__main__":
    main()
