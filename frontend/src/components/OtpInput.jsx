import { useRef } from "react";

// 6-box OTP input — auto-advances on type, backspace goes back
function OtpInput({ value, onChange }) {
    const inputs = useRef([]);
    const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

    const handleChange = (i, e) => {
        const char = e.target.value.replace(/\D/g, "").slice(-1);
        const next = digits.map((d, idx) => (idx === i ? char : d));
        onChange(next.join(""));
        if (char && i < 5) inputs.current[i + 1]?.focus();
    };

    const handleKeyDown = (i, e) => {
        if (e.key === "Backspace" && !digits[i] && i > 0) {
            inputs.current[i - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted) {
            onChange(pasted.padEnd(6, "").slice(0, 6));
            inputs.current[Math.min(pasted.length, 5)]?.focus();
        }
        e.preventDefault();
    };

    return (
        <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => (inputs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-slate-700 bg-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
                />
            ))}
        </div>
    );
}

export default OtpInput;
