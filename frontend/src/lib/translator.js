/*
 * NEW FILE: translator.js
 * Date: 2025
 * Purpose:
 *  - Provides translateText(text, targetLang) with 3-API fallback chain
 *  - API 1: MyMemory (api.mymemory.translated.net) — most reliable, no key
 *  - API 2: Lingva (lingva.ml) — open source, no key
 *  - API 3: LibreTranslate (libretranslate.de) — last resort, may rate-limit
 *  - Each API has 5s timeout before trying next
 *  - Returns original text if all APIs fail
 *  - Exports LANGUAGES list used by TranslationSelector
 * No npm packages needed — uses native fetch
 */

/**
 * translator.js
 * Tries multiple free public translation APIs in order.
 * If one fails, falls back to the next.
 *
 * APIs used (no key required):
 *  1. MyMemory       — https://api.mymemory.translated.net
 *  2. Lingva         — https://lingva.ml
 *  3. LibreTranslate — https://libretranslate.de  (may need key, used as last resort)
 */

const TIMEOUT_MS = 5000;

function withTimeout(promise, ms = TIMEOUT_MS) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), ms)
        ),
    ]);
}

// API 1 — MyMemory (most reliable, no key needed)
async function translateMyMemory(text, targetLang) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`;
    const res = await withTimeout(fetch(url));
    if (!res.ok) throw new Error("MyMemory failed");
    const data = await res.json();
    if (data.responseStatus !== 200) throw new Error("MyMemory error");
    return data.responseData.translatedText;
}

// API 2 — Lingva
async function translateLingva(text, targetLang) {
    const url = `https://lingva.ml/api/v1/auto/${targetLang}/${encodeURIComponent(text)}`;
    const res = await withTimeout(fetch(url));
    if (!res.ok) throw new Error("Lingva failed");
    const data = await res.json();
    if (!data.translation) throw new Error("Lingva no result");
    return data.translation;
}

// API 3 — LibreTranslate (public instance, may rate-limit)
async function translateLibre(text, targetLang) {
    const res = await withTimeout(
        fetch("https://libretranslate.de/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: text, source: "auto", target: targetLang, format: "text" }),
        })
    );
    if (!res.ok) throw new Error("LibreTranslate failed");
    const data = await res.json();
    if (!data.translatedText) throw new Error("LibreTranslate no result");
    return data.translatedText;
}

/**
 * Translate text to targetLang using fallback chain.
 * Returns original text if all APIs fail.
 */
export async function translateText(text, targetLang) {
    if (!text || !targetLang || targetLang === "default") return text;

    const apis = [translateMyMemory, translateLingva, translateLibre];

    for (const api of apis) {
        try {
            const result = await api(text, targetLang);
            if (result && result.trim()) return result;
        } catch {
            // try next
        }
    }

    // all failed — return original
    return text;
}

// Flat list (kept for backward compat — built from LANGUAGE_REGIONS below)
// Region-grouped languages
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
            { code: "as", label: "Assamese" },
            { code: "ne", label: "Nepali" },
            { code: "si", label: "Sinhala" },
            { code: "sd", label: "Sindhi" },
            { code: "ks", label: "Kashmiri" },
            { code: "bho", label: "Bhojpuri" },
            { code: "mai", label: "Maithili" },
            { code: "doi", label: "Dogri" },
            { code: "kok", label: "Konkani" },
            { code: "mni", label: "Manipuri (Meitei)" },
            { code: "sat", label: "Santali" },
        ],
    },
    {
        region: "East & Southeast Asia",
        emoji: "🌏",
        languages: [
            { code: "zh", label: "Chinese (Simplified)" },
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
            { code: "ps", label: "Pashto" },
            { code: "kk", label: "Kazakh" },
            { code: "uz", label: "Uzbek" },
            { code: "tk", label: "Turkmen" },
            { code: "ky", label: "Kyrgyz" },
            { code: "tg", label: "Tajik" },
            { code: "az", label: "Azerbaijani" },
            { code: "he", label: "Hebrew" },
            { code: "hy", label: "Armenian" },
            { code: "ka", label: "Georgian" },
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
            { code: "gl", label: "Galician" },
            { code: "is", label: "Icelandic" },
            { code: "ga", label: "Irish" },
            { code: "mk", label: "Macedonian" },
            { code: "mt", label: "Maltese" },
            { code: "cy", label: "Welsh" },
            { code: "eu", label: "Basque" },
            { code: "lb", label: "Luxembourgish" },
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
            { code: "rw", label: "Kinyarwanda" },
            { code: "sn", label: "Shona" },
            { code: "st", label: "Sesotho" },
            { code: "xh", label: "Xhosa" },
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

// Flat list built from regions (for backward compat)
export const LANGUAGES = [
    { code: "default", label: "Default (No Translation)" },
    ...LANGUAGE_REGIONS.flatMap((r) => r.languages).filter(
        (lang, idx, arr) => arr.findIndex((l) => l.code === lang.code) === idx
    ),
];
