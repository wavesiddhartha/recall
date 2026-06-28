interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const clickStyles = onClick ? 'cursor-pointer hover:bg-neutral-50/50' : '';
  return (
    <div
      onClick={onClick}
      className={`border border-neutral-100 bg-white p-8 transition-all duration-500 ease-out ${clickStyles} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-6 flex flex-col gap-1.5 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-mono text-[10px] uppercase tracking-[0.2em] text-black font-semibold ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[9px] font-mono text-neutral-400 uppercase tracking-widest ${className}`}>{children}</p>;
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-xs text-black leading-relaxed font-light ${className}`}>{children}</div>;
}
