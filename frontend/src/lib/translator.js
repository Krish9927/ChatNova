/**
 * translator.js
 * Translation with 2-layer strategy:
 *
 *  1. Backend proxy  → POST /api/translate  (uses MyMemory server-side, no CORS issues)
 *  2. Google GTX     → translate.googleapis.com (browser-side, no key, works from browsers)
 *
 * The backend proxy is primary because:
 *  - No CORS issues
 *  - No browser rate limiting
 *  - MyMemory works perfectly server-side
 *
 * Google GTX is fallback in case backend is down.
 */

const TIMEOUT_MS = 8000;

function withTimeout(promise, ms = TIMEOUT_MS) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("timeout")), ms)
        ),
    ]);
}

// ─── API 1: Our backend proxy (MyMemory server-side) ───────────────────────
async function translateViaBackend(text, targetLang) {
    const res = await withTimeout(
        fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",          // sends auth cookie
            body: JSON.stringify({ text, targetLang }),
        })
    );

    if (!res.ok) throw new Error(`Backend proxy HTTP ${res.status}`);
    const data = await res.json();

    if (!data.translatedText) throw new Error("Backend proxy empty result");

    // If backend fell back to original text, treat as failure so we try Google
    if (data.fallback || data.translatedText.trim().toLowerCase() === text.trim().toLowerCase()) {
        throw new Error("Backend proxy returned original text");
    }

    return data.translatedText;
}

// ─── API 2: Google Translate GTX (browser-side, no key) ────────────────────
// Works from browsers — googleapis.com allows browser requests, blocks server curl
async function translateViaGoogle(text, targetLang) {
    const params = new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: targetLang,
        dt: "t",
        q: text,
    });

    const res = await withTimeout(
        fetch(`https://translate.googleapis.com/translate_a/single?${params}`)
    );

    if (!res.ok) throw new Error(`Google GTX HTTP ${res.status}`);
    const data = await res.json();

    // Response: [ [ ["translated chunk", "original", ...], ... ], null, "detected_lang" ]
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error("Google GTX unexpected shape");
    }

    const translated = data[0]
        .filter((chunk) => Array.isArray(chunk) && chunk[0])
        .map((chunk) => chunk[0])
        .join("");

    if (!translated.trim()) throw new Error("Google GTX empty result");
    if (translated.trim().toLowerCase() === text.trim().toLowerCase()) {
        throw new Error("Google GTX returned original text");
    }

    return translated;
}

// ─── Main export ────────────────────────────────────────────────────────────
export async function translateText(text, targetLang) {
    if (!text || !targetLang || targetLang === "default") return text;

    for (const [name, fn] of [
        ["BackendProxy", translateViaBackend],
        ["GoogleGTX", translateViaGoogle],
    ]) {
        try {
            const result = await fn(text, targetLang);
            if (result && result.trim()) {
                console.debug(`[translator] ${name} success for lang=${targetLang}`);
                return result;
            }
        } catch (err) {
            console.warn(`[translator] ${name} failed:`, err.message);
        }
    }

    console.warn("[translator] All APIs failed, showing original text");
    return text;
}

// ─── Language lists ──────────────────────────────────────────────────────────
export const LANGUAGE_REGIONS = [
    {
        region: "South Asia",
        emoji: "🌏",
        languages: [
            { code: "hi", label: "Hindi" },
            { code: "bn", label: "Bengali / Bangla" },
            { code: "te", label: "Telugu" },
            { code: "mr", label: "Marathi" },
            { code: "ta", label: "Tamil" },
            { code: "gu", label: "Gujarati" },
            { code: "kn", label: "Kannada" },
            { code: "ml", label: "Malayalam" },
            { code: "pa", label: "Punjabi" },
            { code: "or", label: "Odia" },
            { code: "ur", label: "Urdu" },
            { code: "ne", label: "Nepali" },
            { code: "si", label: "Sinhala" },
        ],
    },
    {
        region: "East & Southeast Asia",
        emoji: "🌏",
        languages: [
            { code: "zh-CN", label: "Chinese (Simplified)" },
            { code: "zh-TW", label: "Chinese (Traditional)" },
            { code: "ja", label: "Japanese" },
            { code: "ko", label: "Korean" },
            { code: "vi", label: "Vietnamese" },
            { code: "th", label: "Thai" },
            { code: "id", label: "Indonesian" },
            { code: "ms", label: "Malay" },
            { code: "tl", label: "Filipino (Tagalog)" },
            { code: "my", label: "Burmese" },
            { code: "km", label: "Khmer" },
            { code: "lo", label: "Lao" },
            { code: "mn", label: "Mongolian" },
        ],
    },
    {
        region: "Central & West Asia",
        emoji: "🌍",
        languages: [
            { code: "ar", label: "Arabic" },
            { code: "fa", label: "Persian (Farsi)" },
            { code: "tr", label: "Turkish" },
            { code: "he", label: "Hebrew" },
            { code: "hy", label: "Armenian" },
            { code: "ka", label: "Georgian" },
            { code: "kk", label: "Kazakh" },
            { code: "uz", label: "Uzbek" },
            { code: "az", label: "Azerbaijani" },
        ],
    },
    {
        region: "Europe",
        emoji: "🌍",
        languages: [
            { code: "en", label: "English" },
            { code: "es", label: "Spanish" },
            { code: "fr", label: "French" },
            { code: "pt", label: "Portuguese" },
            { code: "ru", label: "Russian" },
            { code: "de", label: "German" },
            { code: "it", label: "Italian" },
            { code: "pl", label: "Polish" },
            { code: "uk", label: "Ukrainian" },
            { code: "nl", label: "Dutch" },
            { code: "ro", label: "Romanian" },
            { code: "hu", label: "Hungarian" },
            { code: "el", label: "Greek" },
            { code: "cs", label: "Czech" },
            { code: "sv", label: "Swedish" },
            { code: "da", label: "Danish" },
            { code: "fi", label: "Finnish" },
            { code: "no", label: "Norwegian" },
            { code: "sk", label: "Slovak" },
            { code: "bg", label: "Bulgarian" },
            { code: "hr", label: "Croatian" },
            { code: "sr", label: "Serbian" },
            { code: "lt", label: "Lithuanian" },
            { code: "lv", label: "Latvian" },
            { code: "et", label: "Estonian" },
            { code: "sl", label: "Slovenian" },
            { code: "sq", label: "Albanian" },
            { code: "be", label: "Belarusian" },
            { code: "bs", label: "Bosnian" },
            { code: "ca", label: "Catalan" },
            { code: "ga", label: "Irish" },
            { code: "mk", label: "Macedonian" },
            { code: "mt", label: "Maltese" },
            { code: "cy", label: "Welsh" },
        ],
    },
    {
        region: "Africa",
        emoji: "🌍",
        languages: [
            { code: "sw", label: "Swahili" },
            { code: "am", label: "Amharic" },
            { code: "yo", label: "Yoruba" },
            { code: "ig", label: "Igbo" },
            { code: "ha", label: "Hausa" },
            { code: "zu", label: "Zulu" },
            { code: "af", label: "Afrikaans" },
            { code: "so", label: "Somali" },
        ],
    },
    {
        region: "Americas",
        emoji: "🌎",
        languages: [
            { code: "en", label: "English" },
            { code: "es", label: "Spanish" },
            { code: "pt", label: "Portuguese" },
            { code: "fr", label: "French" },
            { code: "ht", label: "Haitian Creole" },
        ],
    },
    {
        region: "Others",
        emoji: "🌐",
        languages: [
            { code: "la", label: "Latin" },
            { code: "eo", label: "Esperanto" },
        ],
    },
];

// Flat list (deduped) — used by TranslationSelector
export const LANGUAGES = [
    { code: "default", label: "Default (No Translation)" },
    ...LANGUAGE_REGIONS.flatMap((r) => r.languages).filter(
        (lang, idx, arr) => arr.findIndex((l) => l.code === lang.code) === idx
    ),
];
