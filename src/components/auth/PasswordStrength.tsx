import { CheckIcon } from "@/components/ui/icons";

// Keep in sync with signupSchema's password rule (min 12 characters).
export const MIN_PASSWORD_LENGTH = 12;

const checks = [
  { label: `At least ${MIN_PASSWORD_LENGTH} characters`, test: (p: string) => p.length >= MIN_PASSWORD_LENGTH },
  { label: "Upper & lowercase letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "A number", test: (p: string) => /\d/.test(p) },
  { label: "A symbol", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

const levels = [
  { label: "Too weak", bar: "bg-red-500", text: "text-red-600" },
  { label: "Weak", bar: "bg-orange-500", text: "text-orange-600" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600" },
  { label: "Good", bar: "bg-lime-500", text: "text-lime-700" },
  { label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

export function getPasswordScore(password: string) {
  // Below the minimum length the password is rejected, so cap the score.
  if (password.length < MIN_PASSWORD_LENGTH) return Math.min(1, checks.filter((c) => c.test(password)).length);
  let score = checks.filter((c) => c.test(password)).length; // 1..4
  if (password.length >= 16 && score >= 3) score = 4;
  return score;
}

export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = getPasswordScore(password);
  const level = levels[score];

  return (
    <div className="mt-2.5" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= score ? level.bar : "bg-slate-200"}`}
            />
          ))}
        </div>
        <span className={`w-16 text-right text-xs font-semibold ${level.text}`}>{level.label}</span>
      </div>

      <ul className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {checks.map((check) => {
          const passed = check.test(password);
          return (
            <li
              key={check.label}
              className={`flex items-center gap-1.5 text-xs transition-colors ${passed ? "text-emerald-600" : "text-slate-400"}`}
            >
              <CheckIcon width={14} height={14} className={passed ? "opacity-100" : "opacity-40"} />
              {check.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
