import { go } from "@/lib/router";

const Block = ({ title, children }) => (
  <section className="card p-5 mt-4"><b className="text-lg">{title}</b><div className="text-sm mt-2 flex flex-col gap-2" style={{ color: "var(--muted)" }}>{children}</div></section>
);

export default function About({ inApp }) {
  return (
    <div className="min-h-full p-6 overflow-auto">
      <div className="max-w-3xl mx-auto fade-up">
        {!inApp && <button className="text-sm mb-4" style={{ color: "var(--muted)" }} onClick={() => go("/")}>← Back</button>}
        <h1 className="text-3xl font-bold">About Crop Watch</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>A pilot for Jalna district, Maharashtra: soybean, Kharif 2026. It helps officers find which plots to visit first. It does not decide anything.</p>

        <Block title="How it works, in four steps">
          <p>1. Free satellite pictures are read for every farm area every few days.</p>
          <p>2. Each plot is compared with its own past seasons at the same crop age, so a late-sown crop is not flagged for being late.</p>
          <p>3. Plots behind normal are flagged Watch or Urgent. Under cloud a plot is marked Cannot see, never Normal.</p>
          <p>4. The farmer confirms or disputes. The taluka officer visits. Only a confirmed plot can be reported to the district.</p>
        </Block>

        <Block title="What it cannot do">
          <p>It cannot say why a crop is behind. Low greenness can also come from early harvest, late sowing, pests or flood.</p>
          <p>It cannot see single small farms. A "plot" here is a square of 200 m (sample areas) or 300 m (whole talukas), not a legal survey plot.</p>
          <p>It does not forecast yield or rain. It does not file a claim and does not promise any payout.</p>
          <p>The signal appears around the time of the official drought order, not weeks before it. See the accuracy page for exactly what has and has not been measured.</p>
        </Block>

        <Block title="Who sees what">
          <p><b>Farmer:</b> only their own plots. <b>Taluka officer:</b> every plot in their taluka. <b>District officer:</b> all talukas and the ranking. <b>Service centre operator:</b> an evidence pack for one plot id, not the map. <b>Admin:</b> accounts and the audit log.</p>
        </Block>

        <Block title="Data and credits">
          <p>Contains modified Copernicus Sentinel-2 data (2019 to 2026). Rainfall: NASA POWER. Farmland mask: ESA WorldCover 2021 (CC BY 4.0). Boundaries: geoBoundaries, from DataMeet (CC BY 2.5 IN) and the Local Government Directory via Pathways Data (ODbL).</p>
          <p>Ideas we learned from: the T.R.A.C.E. change-mapping console (as ideas only) and our own earlier GeoAI project.</p>
        </Block>

        <Block title="Languages and phones">
          <p>English and Marathi (switch at the top). The Marathi has not yet been checked by a native speaker. The farmer screen is built for a phone. A field check made without signal is saved on the phone and sent when it is online. Photos need a connection.</p>
        </Block>

        <div className="mt-6 flex gap-2"><button className="btn btn-primary" onClick={() => go("/accuracy")}>See what we measured</button></div>
      </div>
    </div>
  );
}
