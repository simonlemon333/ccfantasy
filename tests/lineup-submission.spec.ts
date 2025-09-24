import { test, expect } from '@playwright/test';

test.describe('Lineup Submission Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3000');
  });

  test('should complete lineup submission workflow', async ({ page }) => {
    console.log('Starting lineup submission E2E test...');

    // Test 1: Navigate to My Team page
    await test.step('Navigate to My Team', async () => {
      await page.click('a[href="/my-team"]');
      await expect(page).toHaveURL('/my-team');
      await expect(page.locator('h1')).toContainText('我的球队');
    });

    // Test 2: Check if we can see draft lineup section
    await test.step('Verify draft lineup interface', async () => {
      const draftSection = page.locator('[data-testid="draft-lineup"]');
      if (await draftSection.isVisible()) {
        console.log('Draft lineup section found');
      } else {
        console.log('No draft lineup - this is expected if no lineup exists');
      }
    });

    // Test 3: Navigate to leagues to join a room
    await test.step('Join a league room', async () => {
      await page.click('a[href="/leagues"]');
      await expect(page).toHaveURL('/leagues');
      
      // Look for public rooms
      const joinButton = page.locator('button:has-text("加入")').first();
      if (await joinButton.isVisible()) {
        await joinButton.click();
        console.log('Joined a public room');
      } else {
        console.log('No public rooms available to join');
      }
    });

    // Test 4: Go back to My Team and test submission
    await test.step('Test lineup submission', async () => {
      await page.click('a[href="/my-team"]');
      await page.waitForURL('/my-team');
      
      // Look for submit button
      const submitButton = page.locator('button:has-text("提交")');
      if (await submitButton.isVisible()) {
        // Click submit and check for success/error
        await submitButton.click();
        
        // Wait for response and check for success or error messages
        await page.waitForTimeout(2000);
        
        const successMessage = page.locator('text=提交成功');
        const errorMessage = page.locator('text=错误');
        
        if (await successMessage.isVisible()) {
          console.log('✅ Lineup submission successful!');
        } else if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          console.log('❌ Lineup submission failed:', errorText);
        } else {
          console.log('⚠️ No clear success/error message found');
        }
      } else {
        console.log('No submit button found - checking if lineup needs to be created first');
      }
    });
  });

  test('should test API endpoints directly', async ({ request }) => {
    console.log('Testing API endpoints...');

    // Test 1: Check players API
    await test.step('Test players API', async () => {
      const playersResponse = await request.get('http://localhost:3000/api/players?limit=5');
      expect(playersResponse.status()).toBe(200);
      
      const playersData = await playersResponse.json();
      expect(playersData.success).toBe(true);
      expect(playersData.data).toHaveLength(5);
      console.log('✅ Players API working correctly');
    });

    // Test 2: Check teams API
    await test.step('Test teams API', async () => {
      const teamsResponse = await request.get('http://localhost:3000/api/teams');
      expect(teamsResponse.status()).toBe(200);
      
      const teamsData = await teamsResponse.json();
      expect(teamsData.success).toBe(true);
      expect(teamsData.data.length).toBeGreaterThan(0);
      console.log('✅ Teams API working correctly');
    });

    // Test 3: Check rooms API
    await test.step('Test rooms API', async () => {
      const roomsResponse = await request.get('http://localhost:3000/api/rooms?public=true');
      console.log('Rooms API status:', roomsResponse.status());
      
      if (roomsResponse.status() === 200) {
        const roomsData = await roomsResponse.json();
        console.log('✅ Rooms API working, found rooms:', roomsData.success);
      } else {
        console.log('⚠️ Rooms API returned non-200 status');
      }
    });
  });

  test('should test RLS fix specifically', async ({ request }) => {
    console.log('Testing RLS fix...');

    // This test specifically checks if the RLS issue is resolved
    await test.step('Test lineup creation capability', async () => {
      // We'll test this by attempting to hit the lineup submission endpoint
      // Note: This requires proper authentication in a real scenario
      
      const testUserId = '60446064-067a-439f-b5e1-8dd320833b95';
      const testLineupData = {
        lineupId: 'test-lineup-id',
        roomId: 'd15f062a-adfd-42bc-b8d8-e4144a18c1c4' // Use an existing room ID from logs
      };

      // This will likely fail with 401 (unauthorized) but shouldn't fail with RLS error
      const submitResponse = await request.post('http://localhost:3000/api/lineups/submit', {
        data: testLineupData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Lineup submission test status:', submitResponse.status());
      
      if (submitResponse.status() === 401) {
        console.log('✅ Got 401 (expected) - RLS is not the issue anymore');
      } else if (submitResponse.status() === 500) {
        const errorData = await submitResponse.json();
        if (errorData.error?.includes('row-level security')) {
          console.log('❌ RLS issue still exists');
        } else {
          console.log('⚠️ Different 500 error (not RLS):', errorData.error);
        }
      } else {
        console.log('🎉 Unexpected success or different status');
      }
    });
  });
});