'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConnectionTestPage() {
  const [status, setStatus] = useState('Testing...');
  const [details, setDetails] = useState<any>({});

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      // Test 1: Basic connection
      const { data, error } = await supabase.from('teams').select('count');

      if (error) {
        setStatus('Connection failed');
        setDetails({ error: error.message });
      } else {
        setStatus('Connection successful');
        setDetails({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          teamsCount: data?.length || 0
        });
      }
    } catch (err) {
      setStatus('Connection error');
      setDetails({ error: String(err) });
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Connection Test</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Status: {status}</h2>

        <div className="bg-gray-100 p-4 rounded">
          <pre>{JSON.stringify(details, null, 2)}</pre>
        </div>

        <button
          onClick={testConnection}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Again
        </button>
      </div>
    </div>
  );
}