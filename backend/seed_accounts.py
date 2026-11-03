"""Fake demo accounts for local testing only. These are not real people or real credentials."""
DEMO_PASSWORD = "demo1234"   # test value for the local demo; change before any real deployment

DISTRICT_OFFICER = {"email": "district@jalna.demo", "name": "District Officer, Jalna (demo)"}
ADMIN = {"email": "admin@cropwatch.demo", "name": "Crop Watch team (demo)"}
CENTRE = {"email": "centre@partur.demo", "name": "Service centre operator, Partur (demo)"}
TALUKA_NAMES = ["Partur", "Jalna", "Badnapur", "Ambad", "Ghansawangi", "Mantha", "Jafrabad", "Bhokardan"]
# Farmers are made up; each is given plot-sized cells in Partur. "stress" picks flagged cells, "ok" picks healthy ones.
FARMERS = [
    {"email": "farmer1@partur.demo", "name": "Demo Farmer One", "taluka": "Partur", "want": ["urgent", "urgent", "watch"]},
    {"email": "farmer2@partur.demo", "name": "Demo Farmer Two", "taluka": "Partur", "want": ["watch", "normal"]},
    {"email": "farmer3@partur.demo", "name": "Demo Farmer Three", "taluka": "Partur", "want": ["normal", "normal"]},
]


def taluka_account(name):
    return {"email": f"taluka.{name.lower()}@jalna.demo", "name": f"Taluka Officer, {name} (demo)"}
