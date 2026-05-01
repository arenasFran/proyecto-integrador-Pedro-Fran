import React from 'react';
import { motion } from 'framer-motion';

interface PasswordStrengthProps {
  password: string;
}

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

  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4].map((level) => (
          <motion.div
            key={level}
            className="flex-1 rounded-full"
            style={{
              backgroundColor: level <= strength.level ? strength.color : '#282828',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, delay: level * 0.1 }}
          />
        ))}
      </div>
      {strength.label && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[12px] mt-1"
          style={{ color: strength.color }}
        >
          {strength.label}
        </motion.p>
      )}
    </div>
  );
};