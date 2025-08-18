'use client';

import { useState } from 'react';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

export default function DbStructureDebugPage() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkDatabase = async () => {
    setLoading(true);
    try {
      // Check various database aspects
      const checks = await Promise.all([
        // Check users table
        fetch('/api/debug/db?table=users'),
        // Check lineups table
        fetch('/api/debug/db?table=lineups'),
        // Check room_members table
        fetch('/api/debug/db?table=room_members'),
        // Check rooms table
        fetch('/api/debug/db?table=rooms'),
        // Check specific room
        fetch('/api/debug/db?table=lineups&roomId=d15f062a-adfd-42bc-b8d8-e4144a18c1c4')
      ]);

      const results = await Promise.all(checks.map(r => r.json()));

      setDebugData({
        users: results[0],
        lineups: results[1],
        room_members: results[2],
        rooms: results[3],
        specificRoomLineups: results[4],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Database check error:', error);
      alert('数据库检查时出错');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="数据库结构调试">
      <div className="container mx-auto px-6 py-8">
        <Card className="mb-8">
          <h1 className="text-2xl font-bold mb-6">数据库结构和关系调试</h1>
          
          <Button onClick={checkDatabase} disabled={loading} className="mb-6">
            {loading ? '检查中...' : '检查数据库结构'}
          </Button>

          {debugData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">用户表 (users)</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.users, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">阵容表 (lineups)</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.lineups, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">房间成员表 (room_members)</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.room_members, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">房间表 (rooms)</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.rooms, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">特定房间的阵容</h3>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                  {JSON.stringify(debugData.specificRoomLineups, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}