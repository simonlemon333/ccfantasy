import Layout from '../../components/Layout';
import Card from '../../components/ui/Card';

export default function MyTeamPage() {
  return (
    <Layout title="我的球队">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* 球队信息 */}
          <div className="md:col-span-2">
            <Card>
              <h3 className="text-2xl font-bold text-gray-800 mb-6">我的阵容</h3>
              
              {/* 足球场布局 */}
              <div className="bg-green-100 rounded-lg p-8 min-h-96 relative">
                <div className="text-center text-gray-600">
                  <div className="text-6xl mb-4">⚽</div>
                  <p className="text-lg">球队阵容即将开放</p>
                  <p className="text-sm">敬请期待选择你的梦幻阵容</p>
                </div>
              </div>
            </Card>
          </div>
          
          {/* 侧边栏 */}
          <div className="space-y-6">
            <Card>
              <h4 className="text-xl font-bold text-gray-800 mb-4">球队统计</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">剩余预算</span>
                  <span className="font-semibold">£100.0m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">球员数量</span>
                  <span className="font-semibold">0/15</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">本周积分</span>
                  <span className="font-semibold">0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">总积分</span>
                  <span className="font-semibold">0</span>
                </div>
              </div>
            </Card>
            
            <Card>
              <h4 className="text-xl font-bold text-gray-800 mb-4">快速操作</h4>
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                  选择球员
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition">
                  自动选择
                </button>
                <button className="w-full text-left p-3 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition">
                  重置球队
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}