const fetch = require('node-fetch');

async function testSampleAPI() {
  try {
    console.log('Testing /api/sample endpoint...');
    const response = await fetch('http://localhost:3000/api/sample', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }

    const result = await response.json();
    console.log('Success response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testSampleAPI();
