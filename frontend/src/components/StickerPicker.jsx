/**
 * StickerPicker.jsx
 * Popup panel with sticker packs.
 * Opens above the MessageInput when the sticker button is clicked.
 * Closes on outside click or after selecting a sticker.
 *
 * Props:
 *   onSelect(sticker) — called with the selected sticker object
 *   onClose()         — called when picker should close
 */

import { useState, useRef, useEffect } from "react";
import { STICKER_PACKS } from "../lib/stickers";

function StickerPicker({ onSelect, onClose }) {
    const [activePackId, setActivePackId] = useState(STICKER_PACKS[0].id);
    const ref = useRef(null);

    // close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [onClose]);

    const activePack = STICKER_PACKS.find((p) => p.id === activePackId);

    return (
        <div
            ref={ref}
            className="absolute bottom-full mb-2 right-0 w-72 bg-[#1a2233] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
        >
            {/* Pack tabs */}
            <div className="flex items-center gap-0 border-b border-white/8 px-2 pt-2">
                {STICKER_PACKS.map((pack) => (
                    <button
                        key={pack.id}
                        onClick={() => setActivePackId(pack.id)}
                        className={`flex-1 flex items-center justify-center py-2 text-lg rounded-t-lg transition-all ${activePackId === pack.id
                                ? "bg-white/8 text-white"
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                            }`}
                        title={pack.label}
                    >
                        {pack.icon}
                    </button>
                ))}
            </div>

            {/* Pack label */}
            <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                {activePack?.label}
            </p>

            {/* Sticker grid */}
            <div className="grid grid-cols-5 gap-1 px-2 pb-3 max-h-52 overflow-y-auto">
                {activePack?.stickers.map((sticker) => (
                    <button
                        key={sticker.id}
                        onClick={() => { onSelect(sticker); onClose(); }}
                        className="flex items-center justify-center w-full aspect-square rounded-xl text-3xl hover:bg-white/8 transition-all hover:scale-110 active:scale-95"
                        title={sticker.value}
                    >
                        {sticker.type === "emoji" ? (
                            <span>{sticker.value}</span>
                        ) : (
                            <img src={sticker.value} alt="" className="w-8 h-8 object-contain" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default StickerPicker;
