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
  tapVillage: "Village", tapPlot2: "Plot", tapSelects: "Tap selects:", plotsWord: "plots", aboutHa: "about {ha} hectares", plotsToVisit: "Plots to visit first in this village",
  ownerTitle: "Who owns the land?", ownerBody: "Not available. A village has many owners. Land ownership is kept in the state land records, by survey number (7/12 extract), and we do not have that data.",
  officialName: "Official name", officialNameBody: "The village name is as written in the Census 2011 village list (English spelling). It is not checked against today's government records.",
  village: "Village", openInMaps: "Open in Google Maps: go to this plot", showPicture: "Show satellite picture", hidePicture: "Hide satellite picture", plotSize: "This square is {m} m × {m} m (about {ha} hectares)",
  todo_urgent: "What to do: go to this plot and record what you see.", todo_watch: "What to do: visit if you can, or check again next week.", todo_normal: "What to do: nothing. No visit needed.", todo_cannot_see: "What to do: nothing yet. Check again in a few days.",
  tipTitle: "How to use this map", tipBody: "Red squares need a visit now. Tap a square to see it, then press the green button to drive there.", gotIt: "Got it",
  reason_normal: "Looks like a normal year for this time.", reason_watch: "A little behind a normal year for this time.", reason_urgent: "Far behind a normal year for this time.", reason_cannot_see: "Clouds hid this plot, so we cannot judge it.", questions: "Questions", moreDetails: "More details", nothingToAnswer: "No questions waiting.", answerBtn: "Send answer", fieldsNeedAnswer: "Please tell us how your crop is.",
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
  tapVillage: "गाव", tapPlot2: "प्लॉट", tapSelects: "दाबल्यावर निवडते:", plotsWord: "प्लॉट", aboutHa: "सुमारे {ha} हेक्टर", plotsToVisit: "या गावात आधी भेट द्यायचे प्लॉट",
  ownerTitle: "जमिनीचा मालक कोण?", ownerBody: "माहिती उपलब्ध नाही. गावात अनेक मालक असतात. जमिनीची मालकी राज्याच्या जमीन अभिलेखात सर्व्हे नंबरनुसार (७/१२ उतारा) असते, आणि ती माहिती आमच्याकडे नाही.",
  officialName: "अधिकृत नाव", officialNameBody: "गावाचे नाव 2011 च्या जनगणनेच्या गाव यादीप्रमाणे (इंग्रजी स्पेलिंग) आहे. ते आजच्या सरकारी नोंदींशी तपासलेले नाही.",
  village: "गाव", openInMaps: "Google Maps मध्ये उघडा: या प्लॉटकडे जा", showPicture: "उपग्रह चित्र दाखवा", hidePicture: "उपग्रह चित्र लपवा", plotSize: "हा चौरस {m} मी × {m} मी आहे (सुमारे {ha} हेक्टर)",
  todo_urgent: "काय करावे: या प्लॉटवर जा आणि जे दिसते ते नोंदवा.", todo_watch: "काय करावे: शक्य असल्यास भेट द्या, किंवा पुढच्या आठवड्यात पुन्हा पहा.", todo_normal: "काय करावे: काही नाही. भेट देण्याची गरज नाही.", todo_cannot_see: "काय करावे: सध्या काही नाही. काही दिवसांनी पुन्हा पहा.",
  tipTitle: "हा नकाशा कसा वापरावा", tipBody: "लाल चौरसांना आता भेट द्यावी लागेल. चौरस दाबून पहा, मग तिकडे जाण्यासाठी हिरवे बटण दाबा.", gotIt: "समजले",
  reason_normal: "या वेळेसाठी सामान्य वर्षासारखे दिसते.", reason_watch: "या वेळेसाठी सामान्य वर्षापेक्षा थोडे मागे.", reason_urgent: "या वेळेसाठी सामान्य वर्षापेक्षा खूप मागे.", reason_cannot_see: "ढगांमुळे हा प्लॉट दिसला नाही, म्हणून अंदाज करता येत नाही.", questions: "प्रश्न", moreDetails: "अधिक माहिती", nothingToAnswer: "उत्तर देण्यासाठी प्रश्न नाहीत.", answerBtn: "उत्तर पाठवा", fieldsNeedAnswer: "कृपया तुमचे पीक कसे आहे ते सांगा.",
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
