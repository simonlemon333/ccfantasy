interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export default function Button({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md',
  className = '',
  type = 'button',
  disabled = false
}: ButtonProps) {
  const baseClasses = 'font-semibold rounded-lg transition-all transform';
  const hoverClasses = disabled ? '' : 'hover:scale-105';
  
  const variantClasses = {
    primary: disabled 
      ? 'bg-gray-400 text-white cursor-not-allowed' 
      : 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: disabled 
      ? 'bg-gray-400 text-white cursor-not-allowed' 
      : 'bg-gray-600 text-white hover:bg-gray-700',
    outline: disabled 
      ? 'border-2 border-gray-300 text-gray-400 cursor-not-allowed' 
      : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-3 text-lg'
  };
  
  return (
    <button 
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${hoverClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </button>
  );
}