import { useEffect, useState } from "react";
import { api } from "@/api";
import { useT } from "@/lib/i18n";

const FAQ = {
  en: [
    ["What do the words about my crop mean?", "The satellite compares your land with a normal year at the same time of the season. “Healthy” means it looks like a normal year. “A little behind” or “far behind” means the crop is less green than a normal year."],
    ["Why does it say clouds hid my land?", "The satellite cannot see through clouds. This is not a problem with your crop. Look again in a few days."],
    ["Does this mean my crop has failed?", "No. It only shows that your land looks different from a normal year. Late sowing or ripening can also change how it looks. Please tell us what you see with the buttons."],
    ["What happens when I say my crop is in trouble?", "Your taluka officer sees your answer and can visit. If you can, add a photo."],
    ["Does this file my insurance claim?", "No. You can get a report to attach to your claim. It does not file the claim and it does not promise any payment."],
    ["How old are the pictures?", "The satellites pass every few days. The pictures shown are from mid-September: a normal year on one side and this year on the other."],
    ["Who can see my answers?", "Officers of your taluka and district, and the Crop Watch team."],
  ],
  mr: [
    ["माझ्या पिकाबद्दलचे शब्द काय सांगतात?", "उपग्रह तुमच्या जमिनीची तुलना हंगामाच्या त्याच वेळच्या सामान्य वर्षाशी करतो. “चांगले” म्हणजे सामान्य वर्षासारखे दिसते. “थोडे मागे” किंवा “खूप मागे” म्हणजे पीक सामान्य वर्षापेक्षा कमी हिरवे आहे."],
    ["ढगांमुळे जमीन दिसली नाही असे का म्हटले आहे?", "उपग्रहाला ढगांच्या आरपार दिसत नाही. ही तुमच्या पिकाची अडचण नाही. काही दिवसांनी पुन्हा पहा."],
    ["याचा अर्थ माझे पीक वाया गेले असा आहे का?", "नाही. यातून फक्त तुमची जमीन सामान्य वर्षापेक्षा वेगळी दिसते एवढेच कळते. उशिरा पेरणी किंवा पीक पक्व होणे यानेही रंग बदलतो. तुम्हाला काय दिसते ते बटणांनी सांगा."],
    ["पीक अडचणीत आहे असे सांगितल्यावर काय होते?", "तुमचे तालुका अधिकारी तुमचे उत्तर पाहतात आणि भेट देऊ शकतात. शक्य असल्यास फोटो जोडा."],
    ["यामुळे माझा विमा दावा दाखल होतो का?", "नाही. तुमच्या दाव्यासोबत जोडण्यासाठी तुम्हाला अहवाल मिळू शकतो. तो दावा दाखल करत नाही आणि कोणत्याही रकमेची हमी देत नाही."],
    ["चित्रे किती जुनी आहेत?", "उपग्रह काही दिवसांनी जातात. दाखवलेली चित्रे सप्टेंबरच्या मध्याची आहेत: एका बाजूला सामान्य वर्ष आणि दुसऱ्या बाजूला यंदा."],
    ["माझी उत्तरे कोण पाहू शकते?", "तुमच्या तालुक्याचे आणि जिल्ह्याचे अधिकारी, आणि Crop Watch टीम."],
  ],
};

/** Help for farmers: plain answers to common questions, and a box to ask one of our own. */
export default function Help() {
  const { t, lang } = useT();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [mine, setMine] = useState([]);
  const load = () => api("/api/support/mine").then(setMine).catch(() => {});
  useEffect(() => { load(); }, []);

  async function send(e) {
    e.preventDefault(); setMsg("");
    try { await api("/api/support", { text }); setText(""); setMsg(t("saved")); load(); } catch (x) { setMsg(x.message); }
  }

  return (
    <section className="mt-10" aria-labelledby="help-h">
      <h2 id="help-h" className="text-2xl font-bold">{t("helpTitle")}</h2>

      <h3 className="text-lg font-semibold mt-4">{t("faqTitle")}</h3>
      <div className="mt-2 flex flex-col gap-2">
        {(FAQ[lang] || FAQ.en).map(([q, a]) => (
          <details key={q} className="card p-4">
            <summary className="text-lg font-semibold cursor-pointer">{q}</summary>
            <p className="text-base mt-2" style={{ color: "var(--muted)" }}>{a}</p>
          </details>
        ))}
      </div>

      <h3 className="text-lg font-semibold mt-6">{t("askTitle")}</h3>
      <form onSubmit={send} className="card p-4 mt-2 flex flex-col gap-3">
        <textarea className="card w-full p-3 bg-transparent text-base" rows={3} maxLength={500} placeholder={t("askPlace")} value={text} onChange={(e) => setText(e.target.value)} required />
        <button className="btn btn-primary" style={{ padding: "14px", fontSize: "1.1rem" }} disabled={!text.trim()}>{t("send")}</button>
        {msg && <div className="text-base" style={{ color: "var(--ochre)" }}>{msg}</div>}
      </form>

      {mine.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {mine.map((q) => (
            <div key={q.id} className="card p-4">
              <b className="text-base">{q.text}</b>
              {q.answer
                ? <p className="text-base mt-2"><span style={{ color: "var(--leaf)" }}>{t("answerLabel")}:</span> {q.answer} <span className="text-sm" style={{ color: "var(--muted)" }}>({q.answered_by})</span></p>
                : <p className="text-sm mt-1" style={{ color: "var(--ochre)" }}>{t("waiting")}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
