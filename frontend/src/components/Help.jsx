import { useEffect, useState } from "react";
import { api } from "@/api";
import { useT } from "@/lib/i18n";

// Two groups of questions: about the farmer's own crop, and about officers and relief. Marathi is unreviewed: have a Marathi speaker check it.
const GROUPS = {
  en: [
    { title: "About your crop", items: [
      ["My crop looks fine to me, but the app says it is behind. Who is right?", "You know your field best. The satellite only sees colour from space and compares it with a normal year. Ripening, late sowing or harvest can change the colour. Press “It is fine” and add a photo if you can. Your officer will see both."],
      ["What should I do first if my crop is drying or damaged?", "Press “It is in trouble” on that field and add a photo taken in daylight from the edge of the field. Do not wait to be asked. If you have crop insurance, also follow your insurer’s own steps and deadlines. This app does not replace them."],
      ["Why does it say clouds hid my land?", "The satellite cannot see through clouds. This is not a problem with your crop. In the monsoon, clouds can hide the land for weeks. Look again in a few days."],
      ["Is a field here the same as my survey number?", "No. Each field is a small square of land picked by the satellite map. It may not match your legal survey plot exactly. Your officer can help you match it."],
      ["How often does the picture change?", "The satellites pass every few days. The pictures shown are from mid-September: a normal year on one side and this year on the other."],
    ] },
    { title: "About officers and relief", items: [
      ["What happens after I press “It is in trouble”?", "Your taluka officer sees your answer on their list and can visit. If the visit confirms it, the officer can report the field to the district office with the evidence."],
      ["Does this give me insurance or relief money?", "No. It is not a claim and it promises no money. You can get a report to attach to your claim. Government officers decide relief using their own rules. Crop Watch only shows where crops look behind a normal year, so visits start in the right place."],
      ["Can the officer trust what the app says?", "It shows where this year looks different from ordinary years. It has not yet been checked field by field, and it cannot say why a crop is stressed. A visit is always needed to confirm."],
      ["Who can see my answers and photos?", "Officers of your taluka and district, and the Crop Watch team. We do not store phone or ID numbers."],
      ["Can I ask the officer something directly?", "Yes. Write your question in the box below. Your taluka officer or the Crop Watch team will answer it here."],
    ] },
  ],
  mr: [
    { title: "तुमच्या पिकाबद्दल", items: [
      ["मला माझे पीक ठीक वाटते, पण अॅप म्हणते ते मागे आहे. कोण बरोबर?", "तुमचे शेत तुम्हालाच चांगले माहीत आहे. उपग्रह फक्त अवकाशातून रंग पाहतो आणि सामान्य वर्षाशी तुलना करतो. पीक पक्व होणे, उशिरा पेरणी किंवा कापणी यामुळे रंग बदलतो. “ठीक आहे” दाबा आणि शक्य असल्यास फोटो जोडा. तुमचे अधिकारी दोन्ही पाहतील."],
      ["माझे पीक वाळत असेल किंवा खराब झाले असेल तर आधी काय करावे?", "त्या शेतावर “अडचणीत आहे” दाबा आणि शेताच्या कडेवरून दिवसाच्या उजेडात काढलेला फोटो जोडा. विचारण्याची वाट पाहू नका. पीक विमा असेल तर विमा कंपनीचे स्वतःचे टप्पे आणि मुदतही पाळा. हे अॅप त्यांची जागा घेत नाही."],
      ["ढगांमुळे जमीन दिसली नाही असे का म्हटले आहे?", "उपग्रहाला ढगांच्या आरपार दिसत नाही. ही तुमच्या पिकाची अडचण नाही. पावसाळ्यात ढग आठवडे जमीन झाकू शकतात. काही दिवसांनी पुन्हा पहा."],
      ["इथले शेत म्हणजे माझा सर्व्हे नंबर आहे का?", "नाही. प्रत्येक शेत म्हणजे उपग्रह नकाशाने निवडलेला जमिनीचा छोटा चौरस आहे. तो तुमच्या कायदेशीर सर्व्हे नंबरशी अगदी जुळेलच असे नाही. जुळवण्यासाठी तुमचे अधिकारी मदत करतील."],
      ["चित्र किती वेळा बदलते?", "उपग्रह काही दिवसांनी जातात. दाखवलेली चित्रे सप्टेंबरच्या मध्याची आहेत: एका बाजूला सामान्य वर्ष आणि दुसऱ्या बाजूला यंदा."],
    ] },
    { title: "अधिकारी आणि मदतीबद्दल", items: [
      ["“अडचणीत आहे” दाबल्यावर काय होते?", "तुमचे तालुका अधिकारी त्यांच्या यादीत तुमचे उत्तर पाहतात आणि भेट देऊ शकतात. भेटीत पुष्टी झाली तर अधिकारी पुराव्यासह ते शेत जिल्हा कार्यालयाला कळवू शकतात."],
      ["यातून मला विमा किंवा मदतीचे पैसे मिळतात का?", "नाही. हा दावा नाही आणि यात पैशाची हमी नाही. तुमच्या दाव्यासोबत जोडण्यासाठी तुम्हाला अहवाल मिळू शकतो. मदत कोणाला द्यायची हे सरकारी अधिकारी त्यांच्या नियमांनुसार ठरवतात. Crop Watch फक्त पीक सामान्य वर्षापेक्षा कुठे मागे दिसते ते दाखवते, म्हणजे भेटी योग्य ठिकाणापासून सुरू होतात."],
      ["अॅप जे सांगते त्यावर अधिकारी विश्वास ठेवू शकतात का?", "हे यंदा सामान्य वर्षांपेक्षा कुठे वेगळे दिसते ते दाखवते. ते अजून शेतात जाऊन तपासलेले नाही आणि पीक ताणात का आहे हे ते सांगू शकत नाही. खात्री करण्यासाठी भेट नेहमी लागते."],
      ["माझी उत्तरे आणि फोटो कोण पाहू शकते?", "तुमच्या तालुक्याचे आणि जिल्ह्याचे अधिकारी, आणि Crop Watch टीम. आम्ही फोन किंवा ओळख क्रमांक साठवत नाही."],
      ["मी अधिकाऱ्याला थेट काही विचारू शकतो का?", "हो. खालील चौकटीत तुमचा प्रश्न लिहा. तुमचे तालुका अधिकारी किंवा Crop Watch टीम इथेच उत्तर देईल."],
    ] },
  ],
};
const MY = { en: "Your questions", mr: "तुमचे प्रश्न" };

/** Help for farmers: each question is one line between two rules; tap it and the answer opens underneath. */
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

      {(GROUPS[lang] || GROUPS.en).map((g) => (
        <div key={g.title}>
          <h3 className="faq-group">{g.title}</h3>
          <div className="faq">
            {g.items.map(([q, a]) => (
              <details key={q}>
                <summary><span>{q}</span></summary>
                <p className="faq-a">{a}</p>
              </details>
            ))}
          </div>
        </div>
      ))}

      <h3 className="faq-group">{t("askTitle")}</h3>
      <form onSubmit={send}>
        <textarea className="faq-ask" rows={3} maxLength={500} placeholder={t("askPlace")} aria-label={t("askTitle")} value={text} onChange={(e) => setText(e.target.value)} required />
        <button className="btn btn-primary w-full mt-3" style={{ padding: "14px", fontSize: "1.1rem" }} disabled={!text.trim()}>{t("send")}</button>
        {msg && <div className="text-base mt-2" style={{ color: "var(--ochre)" }}>{msg}</div>}
      </form>

      {mine.length > 0 && (
        <>
          <h3 className="faq-group">{MY[lang] || MY.en}</h3>
          <div className="faq">
            {mine.map((q) => (
              <details key={q.id} open={!!q.answer}>
                <summary><span>{q.text}</span></summary>
                <p className="faq-a">
                  {q.answer
                    ? <><b style={{ color: "var(--leaf)" }}>{t("answerLabel")}:</b> {q.answer} ({q.answered_by})</>
                    : <b style={{ color: "var(--ochre)" }}>{t("waiting")}</b>}
                </p>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
