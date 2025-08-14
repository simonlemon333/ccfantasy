interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = true }: CardProps) {
  const hoverEffect = hover ? 'hover:shadow-xl' : '';
  
  return (
    <div className={`bg-white p-6 rounded-xl shadow-lg ${hoverEffect} transition-shadow ${className}`}>
      {children}
    </div>
  );
}