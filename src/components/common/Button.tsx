interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ease-out focus:outline-none';
  
  const variants = {
    primary: 'bg-black text-white hover:bg-neutral-800 active:bg-black',
    secondary: 'bg-neutral-100 text-black hover:bg-neutral-200 active:bg-neutral-100',
    outline: 'border border-black bg-transparent text-black hover:bg-black hover:text-white active:bg-transparent active:text-black'
  };

  const sizes = {
    sm: 'px-4 py-2 text-[9px] tracking-[0.18em]',
    md: 'px-6 py-3 text-[10px]',
    lg: 'px-8 py-4 text-[11px]'
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
