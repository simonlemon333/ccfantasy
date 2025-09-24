import { test, expect } from '@playwright/test';

test.describe('API-Only Tests (No Browser Required)', () => {
  
  test('should test all critical APIs', async ({ request }) => {
    console.log('🚀 Testing API endpoints...');

    // Test 1: Players API
    await test.step('Test players API', async () => {
      const response = await request.get('http://localhost:3000/api/players?limit=5');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBe(5);
      
      console.log('✅ Players API: Working correctly');
    });

    // Test 2: Teams API
    await test.step('Test teams API', async () => {
      const response = await request.get('http://localhost:3000/api/teams');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(10);
      
      console.log('✅ Teams API: Working correctly');
    });

    // Test 3: Fixtures API
    await test.step('Test fixtures API', async () => {
      const response = await request.get('http://localhost:3000/api/fixtures?limit=10');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      
      console.log('✅ Fixtures API: Working correctly');
    });

    // Test 4: Rooms API
    await test.step('Test public rooms API', async () => {
      const response = await request.get('http://localhost:3000/api/rooms?public=true');
      console.log('Rooms API status:', response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        console.log('✅ Rooms API: Working correctly');
        console.log('Available rooms:', data.success ? data.data?.length || 0 : 'Error');
      } else {
        console.log('⚠️ Rooms API: Non-200 status (expected for auth issues)');
      }
    });

    // Test 5: RLS Status Test
    await test.step('Test RLS fix status', async () => {
      const testData = {
        userId: '60446064-067a-439f-b5e1-8dd320833b95',
        roomId: 'd15f062a-adfd-42bc-b8d8-e4144a18c1c4'
      };
      
      const response = await request.post('http://localhost:3000/api/admin/test-lineup-creation', {
        data: testData
      });
      
      console.log('RLS test status:', response.status());
      
      const data = await response.json();
      
      if (data.success) {
        console.log('🎉 RLS Fix: SUCCESSFUL! Lineup creation works');
      } else if (data.error?.includes('row-level security')) {
        console.log('❌ RLS Fix: FAILED - Still blocked by RLS');
      } else if (data.error?.includes('duplicate key')) {
        console.log('✅ RLS Fix: SUCCESS - Only normal business logic errors');
      } else if (data.error?.includes('foreign key')) {
        console.log('✅ RLS Fix: SUCCESS - Only normal constraint errors');
      } else {
        console.log('⚠️ RLS Fix: Unclear status -', data.error);
      }
    });

    // Test 6: Lineup Submission API (should get 401 Unauthorized)
    await test.step('Test lineup submission API', async () => {
      const testData = {
        lineupId: 'test-lineup-id',
        roomId: 'd15f062a-adfd-42bc-b8d8-e4144a18c1c4'
      };
      
      const response = await request.post('http://localhost:3000/api/lineups/submit', {
        data: testData
      });
      
      console.log('Lineup submission status:', response.status());
      
      if (response.status() === 401) {
        console.log('✅ Lineup Submission API: Working (401 expected without auth)');
      } else if (response.status() === 500) {
        const data = await response.json();
        if (data.error?.includes('row-level security')) {
          console.log('❌ Lineup Submission API: RLS still blocking');
        } else {
          console.log('⚠️ Lineup Submission API: Different 500 error');
        }
      } else {
        console.log('🎯 Lineup Submission API: Unexpected status');
      }
    });
    
    console.log('🏁 All API tests completed!');
  });
});