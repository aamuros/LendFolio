export type PasswordStrength = {
  label: "Weak" | "Fair" | "Good" | "Strong";
  score: number;
  meterClass: string;
  labelClass: string;
};

export function getPasswordStrength(password: string): PasswordStrength {
  let score = password.length >= 8 ? 1 : 0;

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1;
  }

  if (/\d/.test(password)) {
    score += 1;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  }

  if (score >= 4) {
    return {
      label: "Strong",
      score: 4,
      meterClass: "bg-[#2f6f4e]",
      labelClass: "text-[#2f6f4e]",
    };
  }

  if (score === 3) {
    return {
      label: "Good",
      score: 3,
      meterClass: "bg-[var(--accent)]",
      labelClass: "text-[var(--accent)]",
    };
  }

  if (score === 2) {
    return {
      label: "Fair",
      score: 2,
      meterClass: "bg-[#8a7a54]",
      labelClass: "text-[#665b3e]",
    };
  }

  return {
    label: "Weak",
    score: 1,
    meterClass: "bg-red-700",
    labelClass: "text-red-700",
  };
}

export function PasswordStrengthIndicator({
  password,
  strength,
}: {
  password: string;
  strength: PasswordStrength;
}) {
  if (!password) {
    return null;
  }

  const requirements = [
    {
      label: "8 characters",
      met: password.length >= 8,
    },
    {
      label: "Uppercase and lowercase",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: "Number",
      met: /\d/.test(password),
    },
    {
      label: "Symbol",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <div className="-mt-3 grid gap-2.5" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`h-1.5 rounded-full transition-colors ${
              level <= strength.score ? strength.meterClass : "bg-[var(--muted)]"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--muted-foreground)]">
          Password strength:{" "}
          <span className={strength.labelClass}>{strength.label}</span>
        </p>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--muted-foreground)]">
          {requirements.map((requirement) => (
            <li
              key={requirement.label}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  requirement.met ? "bg-[#2f6f4e]" : "bg-[var(--border)]"
                }`}
                aria-hidden="true"
              />
              <span
                className={
                  requirement.met ? "text-[var(--foreground)]" : undefined
                }
              >
                {requirement.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
