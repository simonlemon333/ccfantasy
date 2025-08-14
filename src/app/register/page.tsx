import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function RegisterPage() {
  return (
    <Layout title="注册">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">创建账户</h2>
              <p className="text-gray-600">加入CCFantasy开始你的梦幻足球之旅</p>
            </div>
            
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="选择一个用户名"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱地址
                </label>
                <input 
                  type="email" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入你的邮箱"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="创建一个强密码"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  确认密码
                </label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="再次输入密码"
                />
              </div>
              
              <div className="flex items-center">
                <input type="checkbox" className="rounded text-blue-600" />
                <span className="ml-2 text-sm text-gray-600">
                  我同意 <a href="#" className="text-blue-600 hover:underline">服务条款</a> 和 
                  <a href="#" className="text-blue-600 hover:underline ml-1">隐私政策</a>
                </span>
              </div>
              
              <Button className="w-full">创建账户</Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                已有账户？ 
                <a href="/login" className="text-blue-600 hover:underline ml-1">立即登录</a>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}