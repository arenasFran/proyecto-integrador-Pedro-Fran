import React from 'react';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  spread?: number;
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  delay?: number;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 2,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
  delay = 0
}) => {
  const gradientStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} 35%, ${shineColor} 50%, ${color} 65%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    '--shiny-duration': `${Math.max(speed, 0.1)}s`,
    '--shiny-delay': `${Math.max(delay, 0)}s`,
    '--shiny-direction': yoyo
      ? (direction === 'left' ? 'alternate' : 'alternate-reverse')
      : (direction === 'left' ? 'normal' : 'reverse'),
    '--shiny-play-state': disabled ? 'paused' : 'running',
  } as React.CSSProperties;

  return (
    <span
      className={`shiny-text inline-block ${disabled ? 'is-disabled' : ''} ${pauseOnHover ? 'pause-on-hover' : ''} ${className}`.trim()}
      style={gradientStyle}
    >
      {text}
    </span>
  );
};

export default ShinyText;
