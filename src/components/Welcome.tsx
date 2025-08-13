interface WelcomeProps {
  username?: string;
}

export default function Welcome({ username }: WelcomeProps) {
  return (
    // 外层容器：全屏居中 + 渐变背景
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      
      {/* 白色卡片 */}
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        
        {/* 主标题 */}
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Welcome to My App!
        </h1>
        
        {/* 副标题（动态内容） */}
        <p className="text-lg text-gray-600">
          {username ? `Hello, ${username}!` : "Ready to start your journey?"}
        </p>
      </div>
    </div>
  );
}
