import { useState, useRef, useEffect } from "react";
import { Languages, ChevronDownIcon, XCircleIcon, ChevronLeftIcon } from "lucide-react";
import { useTranslationStore } from "../store/useTranslationStore";
import { LANGUAGES, LANGUAGE_REGIONS } from "../lib/translator";

function TranslationSelector({ userId }) {
    const { getLang, setLang, resetLang } = useTranslationStore();
    const currentLang = getLang(userId);
    const [open, setOpen] = useState(false);
    // null = region list, string = selected region name
    const [activeRegion, setActiveRegion] = useState(null);
    const ref = useRef(null);

    const currentLabel = LANGUAGES.find((l) => l.code === currentLang)?.label || "Default";
    const isActive = currentLang !== "default";

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setActiveRegion(null);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleOpen = () => {
        setOpen((o) => !o);
        setActiveRegion(null);
    };

    const handleSelect = (code) => {
        if (code === "default") resetLang(userId);
        else setLang(userId, code);
        setOpen(false);
        setActiveRegion(null);
    };

    const regionData = activeRegion
        ? LANGUAGE_REGIONS.find((r) => r.region === activeRegion)
        : null;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleOpen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          ${isActive
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-slate-700/50 text-slate-400 hover:text-slate-200 border border-slate-600/40"
                    }`}
                title="Translate messages"
            >
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline max-w-[80px] truncate">
                    {isActive ? currentLabel : "Translate"}
                </span>
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {isActive && (
                <button
                    onClick={() => resetLang(userId)}
                    className="absolute -top-1.5 -right-1.5 text-slate-400 hover:text-red-400 transition-colors"
                    title="Reset to default"
                >
                    <XCircleIcon className="w-4 h-4" />
                </button>
            )}

            {open && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                    {/* Region list */}
                    {!activeRegion && (
                        <div className="max-h-80 overflow-y-auto">
                            {/* Default option */}
                            <button
                                onClick={() => handleSelect("default")}
                                className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-slate-700
                  ${currentLang === "default"
                                        ? "bg-cyan-500/20 text-cyan-400"
                                        : "text-slate-300 hover:bg-slate-700"
                                    }`}
                            >
                                Default
                                <span className="ml-2 text-xs text-slate-500">(original)</span>
                            </button>

                            {/* Region buttons */}
                            {LANGUAGE_REGIONS.map((r) => {
                                const hasActive = r.languages.some((l) => l.code === currentLang);
                                return (
                                    <button
                                        key={r.region}
                                        onClick={() => setActiveRegion(r.region)}
                                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors
                      ${hasActive
                                                ? "bg-cyan-500/10 text-cyan-400"
                                                : "text-slate-300 hover:bg-slate-700"
                                            }`}
                                    >
                                        <span>{r.emoji} {r.region}</span>
                                        <ChevronDownIcon className="w-3 h-3 -rotate-90 opacity-50" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Language list for selected region */}
                    {activeRegion && regionData && (
                        <div className="flex flex-col max-h-80">
                            {/* Back header */}
                            <button
                                onClick={() => setActiveRegion(null)}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200 border-b border-slate-700 transition-colors"
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                                <span>{regionData.emoji} {regionData.region}</span>
                            </button>

                            <div className="overflow-y-auto">
                                {regionData.languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleSelect(lang.code)}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                      ${currentLang === lang.code
                                                ? "bg-cyan-500/20 text-cyan-400"
                                                : "text-slate-300 hover:bg-slate-700"
                                            }`}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TranslationSelector;
