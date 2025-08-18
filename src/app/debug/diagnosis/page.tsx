'use client';

import { useState } from 'react';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

export default function DiagnosisPage() {
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnosis = async () => {
    setLoading(true);
    try {
      // Check database counts
      const dbResponse = await fetch('/api/debug/db');
      const dbData = await dbResponse.json();

      // Check lineups
      const lineupsResponse = await fetch('/api/debug/db?table=lineups');
      const lineupsData = await lineupsResponse.json();

      // Check users
      const usersResponse = await fetch('/api/debug/db?table=users');
      const usersData = await usersResponse.json();

      // Check room members
      const roomMembersResponse = await fetch('/api/debug/db?table=room_members');
      const roomMembersData = await roomMembersResponse.json();

      setDiagnosisResult({
        dbCounts: dbData.data,
        lineups: lineupsData.data,
        users: usersData.data,
        roomMembers: roomMembersData.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Diagnosis error:', error);
      alert('诊断时出错');
    } finally {
      setLoading(false);
    }
  };

  const getDiagnosis = () => {
    if (!diagnosisResult) return null;

    const { dbCounts } = diagnosisResult;
    
    let issues = [];
    let solutions = [];

    // Check for users table issue
    if (dbCounts.tableCounts.users === 0) {
      issues.push("❌ users表为空 - 这是主要问题！");
      solutions.push("🔧 在Supabase SQL编辑器中运行 scripts/04_create_test_users.sql");
    }

    // Check for lineups table issue
    if (dbCounts.tableCounts.lineups === 0) {
      issues.push("❌ lineups表为空 - 由于外键约束失败");
      solutions.push("🔧 先修复users表，然后重新提交阵容");
    }

    // Check for foreign key relationship issues
    if (dbCounts.tableCounts.room_members > 0 && dbCounts.tableCounts.users === 0) {
      issues.push("❌ room_members表有数据但users表为空 - 外键关系断裂");
      solutions.push("🔧 RLS(行级安全)策略阻止了用户创建");
    }

    return { issues, solutions };
  };

  const diagnosis = getDiagnosis();

  return (
    <Layout title="数据库问题诊断">
      <div className="container mx-auto px-6 py-8">
        <Card className="mb-8">
          <h1 className="text-2xl font-bold mb-6">数据库问题诊断报告</h1>
          
          <Button onClick={runDiagnosis} disabled={loading} className="mb-6">
            {loading ? '诊断中...' : '运行诊断'}
          </Button>

          {diagnosis && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 mb-3">发现的问题:</h3>
                <ul className="space-y-2">
                  {diagnosis.issues.map((issue, index) => (
                    <li key={index} className="text-red-700">{issue}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-3">解决方案:</h3>
                <ol className="space-y-2">
                  {diagnosis.solutions.map((solution, index) => (
                    <li key={index} className="text-green-700">{index + 1}. {solution}</li>
                  ))}
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">问题解释:</h3>
                <p className="text-blue-700">
                  你的阵容提交看似成功，但实际上因为users表为空而失败。Supabase的行级安全(RLS)策略
                  阻止了用户数据的创建，导致所有依赖user_id外键的操作都会失败。这就是为什么排行榜
                  显示为空的根本原因。
                </p>
              </div>
            </div>
          )}

          {diagnosisResult && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">详细数据:</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">表计数:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(diagnosisResult.dbCounts.tableCounts, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">用户表状态:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(diagnosisResult.users, null, 2)}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium mb-2">阵容表状态:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
                    {JSON.stringify(diagnosisResult.lineups, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}