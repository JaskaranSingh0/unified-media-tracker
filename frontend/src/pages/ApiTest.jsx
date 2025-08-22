import React, { useState } from 'react';
import { discoverTrending } from '../utils/api';

export default function ApiTest() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      const data = await discoverTrending('movie');
      setResult(`Success! Loaded ${data.length} movies`);
    } catch (error) {
      setResult(`Error: ${error.message}`);
      console.error('API Test Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>API Test</h1>
      <button onClick={testApi} disabled={loading}>
        {loading ? 'Testing...' : 'Test Discover API'}
      </button>
      <div style={{ marginTop: '20px' }}>
        {result && <p>{result}</p>}
      </div>
    </div>
  );
}
