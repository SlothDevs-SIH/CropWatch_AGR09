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
