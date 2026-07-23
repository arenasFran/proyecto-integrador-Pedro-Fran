import React from 'react';

interface PasswordStrengthProps {
  password: string;
}

const REQUIREMENTS = [
  { label: 'Mínimo 8 caracteres', test: (pwd: string) => pwd.length >= 8 },
  { label: 'Una mayúscula', test: (pwd: string) => /[A-Z]/.test(pwd) },
  { label: 'Una minúscula', test: (pwd: string) => /[a-z]/.test(pwd) },
  { label: 'Un número', test: (pwd: string) => /[0-9]/.test(pwd) },
];

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const getStrength = (pwd: string): { level: number; label: string; color: string } => {
    if (!pwd) return { level: 0, label: '', color: '#282828' };
    
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { level: 1, label: 'Débil', color: '#EF4444' };
    if (score <= 2) return { level: 2, label: 'Regular', color: '#F59E0B' };
    if (score <= 3) return { level: 3, label: 'Buena', color: '#22C55E' };
    return { level: 4, label: 'Fuerte', color: '#10B981' };
  };

  const strength = getStrength(password);
  const isEmpty = !password;

  return (
    <div className="mt-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {REQUIREMENTS.map((req) => {
          const met = !isEmpty && req.test(password);
          return (
            <li key={req.label} className="text-[11px] flex items-center gap-1" style={{ color: isEmpty ? '#8A8A8A' : met ? '#22C55E' : '#EF4444' }}>
              <span>{isEmpty ? '·' : met ? '✓' : '✗'}</span>
              {req.label}
            </li>
          );
        })}
      </ul>
      {!isEmpty && (
        <>
          <div className="flex gap-1 h-1.5 mt-2">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className="flex-1 rounded-full"
                style={{
                  backgroundColor: level <= strength.level ? strength.color : '#282828',
                }}
              />
            ))}
          </div>
          {strength.label && (
            <p className="text-[12px] mt-1" style={{ color: strength.color }}>
              {strength.label}
            </p>
          )}
        </>
      )}
    </div>
  );
};