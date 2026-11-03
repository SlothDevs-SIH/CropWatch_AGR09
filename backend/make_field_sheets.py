"""Build the field kit from the blind sample (it never reads the sealed key, so the kit cannot leak labels).

  python make_field_sheets.py

Outputs in ../validation/field/sheets/ (kept out of git; regenerate any time):
  field_sheets.html   printable: instructions + one page per plot. Open in a browser, Print, Save as PDF.
  field_entry.html    one self-contained file for a phone. Works with no internet and saves on the phone. Export CSV at the end.
"""
import csv
import html
import json
from pathlib import Path

FIELD = Path(__file__).resolve().parent.parent / "validation" / "field"
OUT = FIELD / "sheets"
HEADER = ["cell_id", "visit_status", "skip_reason", "visit_date", "interviewer", "crop", "crop_share_pct", "sowing_date", "first_stress_date",
          "severity_0to3", "main_cause", "yield_pct_of_normal", "irrigated", "photo_file", "gps_accuracy_m", "consent_given", "notes"]

CONSENT = ("We are students testing whether satellite pictures can show crop trouble early. We would like to ask about one plot, this season. "
           "We will not write your name or phone number. You can say no, or stop, at any time. We would like to take a photo of the crop or field, "
           "not of people. May we?")

QUESTIONS = [
    ("Is the ground within about 100 m of the GPS point this farmer's plot?", "If not, find the right farmer, or mark not visited"),
    ("What was grown here this Kharif?", "soybean / cotton / tur / other / fallow. If fallow, record and stop"),
    ("Share of the 200 m square under that crop (%)", ""),
    ("When was it sown? (month and week)", ""),
    ("Did it ever look weak, dry or behind? When did you first notice? (rough date)", "Leave empty if never"),
    ("How bad was it?  0 none   1 mild   2 moderate (clearly less than a normal year)   3 severe or failed", "The farmer's answer"),
    ("Main reason, in their words (dry spell / pests or disease / flood or hail / other / none / unknown)", "Write what they say"),
    ("Compared with a normal year, what share of the usual harvest did you get? (%)", ""),
    ("Watered by anything besides rain? (yes / no / partly)", ""),
    ("One clear photo of the crop or field. Photo file name:", "No faces"),
]


def read_plots():
    with open(FIELD / "sample_field.csv", newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    # group by taluka so a day's trip stays in one place; inside a taluka keep the drawn order
    return sorted(rows, key=lambda r: (r["taluka"], int(r["visit_order"])))


def sheets_html(plots):
    e = html.escape
    css = ("body{font-family:Segoe UI,Arial,sans-serif;color:#1e2620;margin:0}.pg{page-break-after:always;padding:18mm 16mm;min-height:250mm}"
           "h1{font-size:20pt;margin:0 0 4pt}h2{font-size:14pt;margin:14pt 0 4pt}.meta{font-size:11pt;line-height:1.5}.q{margin:9pt 0;font-size:11pt}"
           ".line{border-bottom:1px solid #444;height:20pt}.hint{font-size:9pt;color:#555}.box{border:1px solid #444;padding:8pt;margin:8pt 0;font-size:10.5pt}"
           ".spare{background:#fff3cd;padding:4pt 8pt;border:1px solid #c9a227;font-size:10.5pt}small{color:#555}")
    out = [f"<!doctype html><meta charset='utf-8'><title>Crop Watch field sheets</title><style>{css}</style>"]
    out.append("<div class='pg'><h1>Crop Watch field sheets</h1><p class='meta'>Jalna district, Kharif 2026. One page per plot. Bring this, a phone with GPS and a correct clock, and the college letter.</p>"
               "<h2>Read before you start</h2><ol class='meta'>"
               "<li><b>You do not know which plots Crop Watch flagged. Do not try to find out.</b> If you do know, write it on the sheet.</li>"
               "<li>Visit plots in the order shown. Do not pick plots that look interesting.</li>"
               "<li>If a plot cannot be visited (no access, farmer away, wrong field), tick <i>not visited</i>, write why, and use the spare named on that page. Spares are for one specific plot each. Do not choose another.</li>"
               "<li>Write what the farmer says, not what you think. Severity and cause are theirs.</li>"
               "<li>No names, phone numbers or ID numbers anywhere. The plot id is the only identifier.</li>"
               "<li>Photograph crops and fields, not people. Back photos up the same evening.</li></ol>"
               f"<h2>Say this first (in Marathi or Hindi if easier)</h2><div class='box'>{e(CONSENT)}</div>"
               "<p class='meta'>If they say no, tick <i>no consent</i>, thank them, and move on. Never push.</p></div>")
    for r in plots:
        spare = r["role"] == "reserve"
        out.append(f"<div class='pg'><h1>{e(r['cell_id'])}</h1><p class='meta'><b>{e(r['taluka'])}</b> &nbsp;|&nbsp; drawn order {e(r['visit_order'])} &nbsp;|&nbsp; GPS {e(r['lat'])}, {e(r['lon'])}"
                   f" &nbsp;|&nbsp; square of 200 m<br><small>{e(r['maps_link'])}</small></p>")
        if spare:
            out.append(f"<p class='spare'><b>SPARE.</b> Use only if plot <b>{e(r['replaces'])}</b> could not be visited.</p>")
        out.append("<p class='meta'>Visit status: &#9744; visited &nbsp; &#9744; not visited (reason: ______________________ ) &nbsp; &#9744; no consent<br>"
                   "Date: ____________ &nbsp; Interviewer initials: ______ &nbsp; GPS accuracy (m): ______ &nbsp; Knew the label? &#9744; no &#9744; yes</p>")
        for i, (q, h) in enumerate(QUESTIONS, 1):
            out.append(f"<div class='q'><b>{i}.</b> {e(q)}" + (f" <span class='hint'>({e(h)})</span>" if h else "") + "<div class='line'></div></div>")
        out.append("<div class='q'><b>Notes</b><div class='line'></div><div class='line'></div></div></div>")
    return "\n".join(out)


ENTRY = r"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crop Watch field entry</title>
<style>
:root{--bg:#12170f;--panel:#1b2316;--line:#33402a;--text:#f1ebdd;--muted:#a3ab94;--leaf:#a9c75a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.4 "Segoe UI",system-ui,sans-serif;padding:14px;max-width:640px;margin-inline:auto}
h1{font-size:1.3rem;margin:.2rem 0 .6rem}label{display:block;margin:.8rem 0 .25rem;font-weight:600}.hint{color:var(--muted);font-size:.85rem;font-weight:400}
input,select,textarea,button{width:100%;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--text);font:inherit}
button{background:var(--leaf);color:#12170e;font-weight:700;border:0;margin-top:1rem}button.alt{background:var(--panel);color:var(--text);border:1px solid var(--line)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin:.6rem 0}.row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ok{color:var(--leaf)}.warn{color:#e5a823}a{color:var(--leaf)}#progress{font-size:.9rem;color:var(--muted)}
</style>
<h1>Crop Watch field entry</h1>
<div id="progress"></div>
<label>Plot <span class="hint">(grouped by taluka, in the drawn order. ✓ = saved)</span></label><select id="plot"></select>
<div class="card" id="info"></div>
<label>Visit status</label><select id="visit_status"><option value="visited">Visited</option><option value="not_visited">Not visited</option></select>
<div id="skipbox" hidden><label>Why not visited?</label><input id="skip_reason" placeholder="no access, farmer away, wrong field..."></div>
<label>Consent given? <span class="hint">(read the consent words first)</span></label><select id="consent_given"><option value="yes">Yes</option><option value="no">No</option></select>
<div id="body">
<div class="row"><div><label>Date</label><input id="visit_date" type="date"></div><div><label>Your initials</label><input id="interviewer" maxlength="6"></div></div>
<label>Crop grown this Kharif</label><select id="crop"><option>soybean</option><option>cotton</option><option>tur</option><option>other</option><option>fallow</option></select>
<div class="row"><div><label>Share of the square under it (%)</label><input id="crop_share_pct" type="number" min="0" max="100" inputmode="numeric"></div>
<div><label>Sown (month/week)</label><input id="sowing_date" placeholder="e.g. 2026-06-25"></div></div>
<label>First noticed weak or dry <span class="hint">(rough date, empty if never)</span></label><input id="first_stress_date" placeholder="e.g. 2026-08-20">
<label>How bad was it?</label><select id="severity_0to3"><option value="">choose...</option><option value="0">0 none</option><option value="1">1 mild</option><option value="2">2 moderate (clearly less than a normal year)</option><option value="3">3 severe or failed</option></select>
<label>Main reason, in their words</label><select id="main_cause"><option value="">choose...</option><option>dry_spell</option><option>pest_disease</option><option>flood_hail</option><option>other</option><option>none</option><option>unknown</option></select>
<div class="row"><div><label>Harvest vs normal year (%)</label><input id="yield_pct_of_normal" type="number" min="0" max="200" inputmode="numeric"></div>
<div><label>Watered besides rain?</label><select id="irrigated"><option>no</option><option>partly</option><option>yes</option></select></div></div>
<div class="row"><div><label>Photo file name</label><input id="photo_file" placeholder="IMG_1234.jpg"></div><div><label>GPS accuracy (m)</label><input id="gps_accuracy_m" type="number" inputmode="numeric"></div></div>
</div>
<label>Notes <span class="hint">(no names or phone numbers)</span></label><textarea id="notes" rows="2"></textarea>
<button id="save">Save this plot</button><button class="alt" id="export">Export all as CSV</button><button class="alt" id="wipe">Delete everything on this phone</button>
<p class="hint">Saved only on this phone. Nothing is sent anywhere. Export the CSV every evening and send it to yourself, then keep the photos with it.</p>
<script>
const PLOTS=__PLOTS__, HEADER=__HEADER__, KEY="cw_field_v1";
const $=id=>document.getElementById(id);
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);   // local date, not UTC
let data={}; try{data=JSON.parse(localStorage.getItem(KEY)||"{}")}catch(e){}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){alert("Could not save on this phone. Export now.")}};
function build(){
  $("plot").innerHTML=PLOTS.map(p=>`<option value="${p.cell_id}">${data[p.cell_id]?"✓ ":""}${p.taluka} · ${p.cell_id}${p.role==="reserve"?" · spare":""}</option>`).join("");
  const done=Object.keys(data).length, prim=PLOTS.filter(p=>p.role==="primary").length;
  $("progress").textContent=`${done} plots saved. ${prim} main plots to do; spares only when named.`;
}
function show(){
  const p=PLOTS.find(x=>x.cell_id===$("plot").value), d=data[p.cell_id]||{};
  $("info").innerHTML=`<b>${p.cell_id}</b> (${p.taluka}, order ${p.visit_order})<br>GPS ${p.lat}, ${p.lon}<br><a href="${p.maps_link}" target="_blank">Open in Maps</a>`+
    (p.role==="reserve"?`<br><span class="warn">SPARE: use only if ${p.replaces} could not be visited.</span>`:"");
  HEADER.slice(1).forEach(k=>{const el=$(k); if(el) el.value=d[k]!==undefined?d[k]:(k==="visit_date"?today():(el.tagName==="SELECT"?el.options[0].value:""))});
  toggle();
}
function toggle(){ $("skipbox").hidden=$("visit_status").value!=="not_visited"; $("body").hidden=$("visit_status").value==="not_visited"||$("consent_given").value==="no"; }
$("plot").onchange=show; $("visit_status").onchange=toggle; $("consent_given").onchange=toggle;
$("save").onclick=()=>{
  const id=$("plot").value, r={cell_id:id}; HEADER.slice(1).forEach(k=>r[k]=($(k)||{}).value||"");
  const visited=r.visit_status==="visited"&&r.consent_given==="yes";
  if(r.visit_status==="not_visited"&&!r.skip_reason.trim()) return alert("Write why this plot was not visited.");
  if(visited&&r.severity_0to3==="") return alert("Choose how bad it was (0 to 3).");
  data[id]=r; persist(); build(); $("plot").value=id; alert("Saved "+id);
};
const esc=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
$("export").onclick=()=>{
  const lines=[HEADER.join(",")].concat(Object.values(data).map(r=>HEADER.map(k=>esc(r[k])).join(",")));
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([lines.join("\n")],{type:"text/csv"}));
  a.download="observations_"+today()+".csv"; a.click();
};
$("wipe").onclick=()=>{ if(confirm("Delete all saved plots on this phone? Export first.")){data={};persist();build();show();} };
build(); show();
</script></html>"""


def main():
    plots = read_plots()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "field_sheets.html").write_text(sheets_html(plots), encoding="utf-8")
    slim = [{k: r[k] for k in ("cell_id", "taluka", "visit_order", "role", "replaces", "lat", "lon", "maps_link")} for r in plots]
    (OUT / "field_entry.html").write_text(ENTRY.replace("__PLOTS__", json.dumps(slim)).replace("__HEADER__", json.dumps(HEADER)), encoding="utf-8")
    prim = sum(1 for r in plots if r["role"] == "primary")
    print(f"{len(plots)} plots ({prim} main, {len(plots) - prim} spares) -> {OUT}")


if __name__ == "__main__":
    main()
