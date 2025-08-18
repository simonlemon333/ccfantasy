import Layout from '../components/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Link from 'next/link';

export default function HomePage() {
  return (
    <Layout>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h2 className="text-6xl font-bold text-gray-800 mb-6">
            欢迎来到 <span className="text-blue-600">CC Fantasy League</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            组建你的梦幻球队，与朋友竞技，体验最刺激的足球经理游戏
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/my-team">
              <Button size="lg">开始游戏</Button>
            </Link>
            <Link href="/leagues">
              <Button variant="outline" size="lg">加入联赛</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Game Flow Guide */}
      <section className="bg-blue-50 py-16">
        <div className="container mx-auto px-6">
          <h3 className="text-3xl font-bold text-center text-gray-800 mb-12">如何开始游戏</h3>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">1</div>
              <h4 className="text-xl font-bold text-gray-800 mb-3">组建阵容</h4>
              <p className="text-gray-600 mb-4">前往"我的球队"选择11名球员组成你的阵容，设置队长和副队长</p>
              <Link href="/my-team">
                <Button variant="outline" size="sm">去组建阵容</Button>
              </Link>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">2</div>
              <h4 className="text-xl font-bold text-gray-800 mb-3">加入联赛</h4>
              <p className="text-gray-600 mb-4">加入公开联赛或创建私人联赛与朋友一起比赛</p>
              <Link href="/leagues">
                <Button variant="outline" size="sm">去加入联赛</Button>
              </Link>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">3</div>
              <h4 className="text-xl font-bold text-gray-800 mb-3">提交阵容</h4>
              <p className="text-gray-600 mb-4">在联赛中正式提交你的阵容，开始竞技并获得积分</p>
              <Link href="/my-team/squad">
                <Button variant="outline" size="sm">去提交阵容</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16">
        <h3 className="text-4xl font-bold text-center text-gray-800 mb-12">游戏特色</h3>
        <div className="grid md:grid-cols-4 gap-8">
          <Card className="text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h4 className="text-xl font-bold text-gray-800 mb-4">竞技联赛</h4>
            <p className="text-gray-600">参加各种联赛，与全球玩家竞技，争夺冠军宝座</p>
          </Card>
          <Card className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h4 className="text-xl font-bold text-gray-800 mb-4">转会市场</h4>
            <p className="text-gray-600">买卖球员，制定策略，打造你的完美阵容</p>
          </Card>
          <Card className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-xl font-bold text-gray-800 mb-4">实时数据</h4>
            <p className="text-gray-600">基于真实比赛数据，让你的fantasy体验更加真实</p>
          </Card>
          <Card className="text-center">
            <div className="text-4xl mb-4">🦄</div>
            <h4 className="text-xl font-bold text-gray-800 mb-4">焦点球员</h4>
            <p className="text-gray-600">每周焦点球员推荐</p>
          </Card>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">3</div>
              <div className="text-blue-200">活跃玩家</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-blue-200">球员数据</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-blue-200">联赛赛事</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-blue-200">实时更新</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h5 className="text-xl font-bold mb-4">CCFantasy</h5>
              <p className="text-gray-400">最好玩的梦幻足球游戏</p>
            </div>
            <div>
              <h5 className="font-bold mb-4">游戏</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">创建球队</a></li>
                <li><a href="#" className="hover:text-white">加入联赛</a></li>
                <li><a href="#" className="hover:text-white">转会市场</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">帮助</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">游戏规则</a></li>
                <li><a href="#" className="hover:text-white">常见问题</a></li>
                <li><a href="#" className="hover:text-white">联系我们</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4">关注我们</h5>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white">Discord</a>
                <a href="#" className="text-gray-400 hover:text-white">微博</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CCFantasy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </Layout>
  );
}