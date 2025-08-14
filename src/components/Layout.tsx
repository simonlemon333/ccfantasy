import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <Header />
      <main>
        {title && (
          <div className="bg-white shadow-sm">
            <div className="container mx-auto px-6 py-8">
              <h1 className="text-4xl font-bold text-gray-800">{title}</h1>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}