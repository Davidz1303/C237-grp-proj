const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper function to make HTTP requests and track cookies
function makeRequest(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? new URLSearchParams(body).toString() : '';
    
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let setCookie = res.headers['set-cookie'];
        if (setCookie) {
          // Extract just the session cookie part
          setCookie = setCookie[0].split(';')[0];
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data,
          cookie: setCookie
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING AUTOMATED WEBSITE ENDPOINT TESTS ===\n');
  const results = [];

  // 1. Test Public Pages
  const publicPages = [
    { name: 'Homepage', path: '/' },
    { name: 'Rooms List', path: '/rooms' },
    { name: 'About Page', path: '/about' },
    { name: 'Login Page', path: '/login' },
    { name: 'Register Page', path: '/register' }
  ];

  for (const page of publicPages) {
    try {
      const res = await makeRequest('GET', page.path);
      const isOk = res.status === 200;
      results.push({ name: page.name, path: page.path, status: res.status, ok: isOk, error: isOk ? null : 'Non-200 Status Code' });
      console.log(`[Public] ${page.name} (${page.path}) -> Status: ${res.status} ${isOk ? '✅' : '❌'}`);
    } catch (err) {
      results.push({ name: page.name, path: page.path, status: 'FAILED', ok: false, error: err.message });
      console.log(`[Public] ${page.name} (${page.path}) -> FAILED: ${err.message} ❌`);
    }
  }

  // 2. Test Guest Login & Authenticated Pages
  console.log('\n[Guest] Attempting login as guest (jane@email.com)...');
  let guestCookie = null;
  try {
    const loginRes = await makeRequest('POST', '/login', {
      email: 'jane@email.com',
      password: 'password'
    });
    
    if (loginRes.status === 302) {
      console.log('[Guest] Login successful (Redirected) ✅');
      guestCookie = loginRes.cookie;
      
      // Test Guest Dashboard
      const dashRes = await makeRequest('GET', '/dashboard', null, guestCookie);
      const dashOk = dashRes.status === 200 && !dashRes.data.includes('Error');
      results.push({ name: 'Guest Dashboard', path: '/dashboard', status: dashRes.status, ok: dashOk, error: dashOk ? null : 'EJS/SQL Error on Page' });
      console.log(`[Guest] Dashboard -> Status: ${dashRes.status} ${dashOk ? '✅' : '❌'}`);
      if (!dashOk && dashRes.data.includes('Error')) {
        console.log('--- Error snippet from Guest Dashboard: ---');
        console.log(dashRes.data.substring(0, 300));
        console.log('------------------------------------------');
      }

      // Test Profile Edit
      const profileRes = await makeRequest('GET', '/profile/edit', null, guestCookie);
      const profileOk = profileRes.status === 200 && !profileRes.data.includes('Error');
      results.push({ name: 'Guest Profile Edit', path: '/profile/edit', status: profileRes.status, ok: profileOk, error: profileOk ? null : 'EJS/SQL Error on Page' });
      console.log(`[Guest] Profile Edit -> Status: ${profileRes.status} ${profileOk ? '✅' : '❌'}`);

      // Test Booking Form (Fetch room 1 - assuming room 1 exists)
      const bookRes = await makeRequest('GET', '/book/1', null, guestCookie);
      const bookOk = bookRes.status === 200 || bookRes.status === 404; // 404 is fine if room 1 isn't in DB
      results.push({ name: 'Booking Form (Room 1)', path: '/book/1', status: bookRes.status, ok: bookOk, error: bookOk ? null : 'EJS/SQL Error on Page' });
      console.log(`[Guest] Booking Form (Room 1) -> Status: ${bookRes.status} ${bookOk ? '✅' : '❌'}`);
    } else {
      console.log(`[Guest] Login FAILED -> Status: ${loginRes.status} ❌`);
      results.push({ name: 'Guest Auth Area', path: '/dashboard', status: loginRes.status, ok: false, error: 'Login post failed' });
    }
  } catch (err) {
    console.log(`[Guest] Auth testing crashed: ${err.message} ❌`);
    results.push({ name: 'Guest Auth Area', path: '/dashboard', status: 'FAILED', ok: false, error: err.message });
  }

  // 3. Test Admin Login & Admin Pages
  console.log('\n[Admin] Attempting login as admin (admin@dreamstayhotel.com)...');
  let adminCookie = null;
  try {
    const adminLoginRes = await makeRequest('POST', '/login', {
      email: 'admin@dreamstayhotel.com',
      password: 'password'
    });

    if (adminLoginRes.status === 302) {
      console.log('[Admin] Login successful (Redirected) ✅');
      adminCookie = adminLoginRes.cookie;

      const adminPages = [
        { name: 'Admin Dashboard', path: '/admin' },
        { name: 'Admin Rooms List', path: '/admin/rooms' },
        { name: 'Admin Rooms Add', path: '/admin/rooms/add' },
        { name: 'Admin Bookings', path: '/admin/bookings' },
        { name: 'Admin Users', path: '/admin/users' }
      ];

      for (const page of adminPages) {
        const res = await makeRequest('GET', page.path, null, adminCookie);
        const isOk = res.status === 200 && !res.data.includes('Error');
        results.push({ name: page.name, path: page.path, status: res.status, ok: isOk, error: isOk ? null : 'EJS/SQL Error on Page' });
        console.log(`[Admin] ${page.name} (${page.path}) -> Status: ${res.status} ${isOk ? '✅' : '❌'}`);
        if (!isOk) {
          console.log(`--- Error snippet from ${page.name}: ---`);
          console.log(res.data.substring(0, 300));
          console.log('------------------------------------------');
        }
      }
    } else {
      console.log(`[Admin] Login FAILED -> Status: ${adminLoginRes.status} ❌`);
      results.push({ name: 'Admin Auth Area', path: '/admin', status: adminLoginRes.status, ok: false, error: 'Login post failed' });
    }
  } catch (err) {
    console.log(`[Admin] Auth testing crashed: ${err.message} ❌`);
    results.push({ name: 'Admin Auth Area', path: '/admin', status: 'FAILED', ok: false, error: err.message });
  }

  // Print Summary
  console.log('\n=== TEST SUMMARY ===');
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`PASSED: ${passed}/${results.length}`);
  console.log(`FAILED: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed Endpoints:');
    results.forEach(r => {
      if (!r.ok) {
        console.log(`- ${r.name} (${r.path}) -> Status: ${r.status}, Error: ${r.error}`);
      }
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All tested endpoints are working perfectly!');
    process.exit(0);
  }
}

// Small delay to ensure the server has time to start if run concurrently
setTimeout(runTests, 2000);
