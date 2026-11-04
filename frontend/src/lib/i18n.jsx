import { createContext, useContext, useEffect, useMemo, useState } from "react";

// English and Marathi for the working screens. The Marathi was written without a native reviewer: have a Marathi speaker check it before real use.
const EN = {
  district: "District", accuracy: "Accuracy", about: "About", reported: "Reported", myPlots: "My plots", myTaluka: "My taluka", claimHelp: "Claim help", admin: "Admin",
  signOut: "Sign out", signIn: "Sign in", back: "Back", close: "Close", save: "Save", saved: "Saved", loading: "Loading…",
  normal: "Normal", watch: "Watch", urgent: "Urgent", cannot_see: "Cannot see", not_farmland: "Not farmland",
  awaiting_farmer: "Awaiting farmer", confirmed: "Confirmed", disputed: "Disputed by farmer", unverified: "Unverified", status_reported: "Reported to district",
  stressed: "Stressed", fine: "Fine", not_sure: "Not sure",
  isStressed: "Is this plot stressed?", recordVisit: "Record a field visit", addPhoto: "Add a photo", note: "Short note (optional)", reportToDistrict: "Report to district",
  visitFirst: "Visit first", allFarmland: "All farmland", behindNormal: "behind normal",
  offlineSaved: "No signal: saved on this phone. It will send when you are online.", pending: "waiting to send", online: "Online", offline: "Offline",
  plotSizedCell: "Plot-sized cell, not a legal survey plot", season: "This season", replay: "Replay the season", asOf: "As of",
  noPlots: "No plots to show.", yourPlots: "Your plots", tapPlot: "Tap a plot to see it and answer.", language: "Language",
  orderDate: "Drought order, 25 Sep", usualForDate: "Usual for this date", higherThanAny: "higher than any past season", couldNotSee: "Could not see",
  off_urgent: "Visit now", off_watch: "Keep an eye", off_normal: "Fine", off_cannot_see: "Cloud, cannot see",
  dist_fine: "Fine", dist_watch: "Watch", dist_serious: "Serious",
  f_normal: "Your crop looks healthy", f_watch: "Your crop is a little behind a normal year", f_urgent: "Your crop is far behind a normal year", f_cannot_see: "Clouds hid your land from the satellite",
  yourLand: "Your land", field: "Field", normalYear: "A normal year", thisYear: "This year", compareHint: "Slide the line left and right to compare your land.",
  askCrop: "How is your crop?", f_stressed: "It is in trouble", f_fine: "It is fine", f_not_sure: "I am not sure",
  helpTitle: "Help and questions", faqTitle: "Common questions", askTitle: "Ask us a question", askPlace: "Write your question here", send: "Send", waiting: "Waiting for an answer", answerLabel: "Answer",
  getReport: "Get a report to attach to my claim", showMore: "Show more", updated: "Updated", fieldsBehind: "of the fields are behind a normal year",
  openInMaps: "Open in Google Maps: go to this plot", questions: "Questions", moreDetails: "More details", nothingToAnswer: "No questions waiting.", answerBtn: "Send answer", fieldsNeedAnswer: "Please tell us how your crop is.",
};
const MR = {
  district: "जिल्हा", accuracy: "अचूकता", about: "माहिती", reported: "कळवलेले", myPlots: "माझे प्लॉट", myTaluka: "माझा तालुका", claimHelp: "दावा मदत", admin: "प्रशासक",
  signOut: "बाहेर पडा", signIn: "साइन इन", back: "मागे", close: "बंद करा", save: "जतन करा", saved: "जतन केले", loading: "लोड होत आहे…",
  normal: "सामान्य", watch: "निरीक्षण", urgent: "तातडीचे", cannot_see: "दिसत नाही", not_farmland: "शेती नाही",
  awaiting_farmer: "शेतकऱ्याची प्रतीक्षा", confirmed: "पुष्टी झाली", disputed: "शेतकऱ्याने नाकारले", unverified: "पडताळणी नाही", status_reported: "जिल्ह्याला कळवले",
  stressed: "पिकावर ताण", fine: "ठीक", not_sure: "खात्री नाही",
  isStressed: "या प्लॉटमधील पिकावर ताण आहे का?", recordVisit: "प्रत्यक्ष भेट नोंदवा", addPhoto: "फोटो जोडा", note: "लहान टीप (ऐच्छिक)", reportToDistrict: "जिल्ह्याला कळवा",
  visitFirst: "आधी भेट द्या", allFarmland: "सर्व शेती", behindNormal: "सामान्यापेक्षा मागे",
  offlineSaved: "नेटवर्क नाही: या फोनवर जतन केले. इंटरनेट आल्यावर पाठवले जाईल.", pending: "पाठवायचे बाकी", online: "ऑनलाइन", offline: "ऑफलाइन",
  plotSizedCell: "प्लॉटच्या आकाराचा चौरस, कायदेशीर सर्व्हे नंबर नाही", season: "या हंगामात", replay: "हंगाम पुन्हा पहा", asOf: "या तारखेपर्यंत",
  noPlots: "दाखवण्यासाठी प्लॉट नाहीत.", yourPlots: "तुमचे प्लॉट", tapPlot: "प्लॉट पाहण्यासाठी आणि उत्तर देण्यासाठी त्यावर दाबा.", language: "भाषा",
  orderDate: "दुष्काळ आदेश, २५ सप्टें.", usualForDate: "या तारखेला नेहमीचे", higherThanAny: "मागील कोणत्याही हंगामापेक्षा जास्त", couldNotSee: "दिसले नाही",
  off_urgent: "आता भेट द्या", off_watch: "लक्ष ठेवा", off_normal: "ठीक", off_cannot_see: "ढग, दिसत नाही",
  dist_fine: "ठीक", dist_watch: "लक्ष ठेवा", dist_serious: "गंभीर",
  f_normal: "तुमचे पीक चांगले दिसत आहे", f_watch: "तुमचे पीक नेहमीपेक्षा थोडे मागे आहे", f_urgent: "तुमचे पीक नेहमीपेक्षा खूप मागे आहे", f_cannot_see: "ढगांमुळे तुमची जमीन उपग्रहाला दिसली नाही",
  yourLand: "तुमची जमीन", field: "शेत", normalYear: "सामान्य वर्ष", thisYear: "यंदा", compareHint: "तुमच्या जमिनीची तुलना करण्यासाठी रेषा डावीकडे-उजवीकडे सरकवा.",
  askCrop: "तुमचे पीक कसे आहे?", f_stressed: "अडचणीत आहे", f_fine: "ठीक आहे", f_not_sure: "खात्री नाही",
  helpTitle: "मदत आणि प्रश्न", faqTitle: "नेहमीचे प्रश्न", askTitle: "आम्हाला प्रश्न विचारा", askPlace: "तुमचा प्रश्न इथे लिहा", send: "पाठवा", waiting: "उत्तराची प्रतीक्षा", answerLabel: "उत्तर",
  getReport: "माझ्या दाव्यासोबत जोडण्यासाठी अहवाल मिळवा", showMore: "आणखी दाखवा", updated: "अद्ययावत", fieldsBehind: "शेते नेहमीच्या वर्षापेक्षा मागे आहेत",
  openInMaps: "Google Maps मध्ये उघडा: या प्लॉटकडे जा", questions: "प्रश्न", moreDetails: "अधिक माहिती", nothingToAnswer: "उत्तर देण्यासाठी प्रश्न नाहीत.", answerBtn: "उत्तर पाठवा", fieldsNeedAnswer: "कृपया तुमचे पीक कसे आहे ते सांगा.",
};

const Ctx = createContext({ lang: "en", setLang: () => {}, t: (k) => EN[k] || k });

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => { try { return localStorage.getItem("cw_lang") || "en"; } catch { return "en"; } });
  useEffect(() => { try { localStorage.setItem("cw_lang", lang); } catch {} document.documentElement.lang = lang; }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: (k) => (lang === "mr" ? MR[k] : EN[k]) || EN[k] || k }), [lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

export function LangSwitch() {
  const { lang, setLang, t } = useT();
  return (
    <div className="flex items-center gap-1 text-xs" role="group" aria-label={t("language")}>
      {[["en", "EN"], ["mr", "मराठी"]].map(([k, l]) => (
        <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className="chip"
          style={{ background: lang === k ? "var(--leaf)" : "transparent", color: lang === k ? "#12170e" : "var(--text)" }}>{l}</button>
      ))}
    </div>
  );
}
