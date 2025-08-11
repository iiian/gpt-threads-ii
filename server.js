const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = 3001;

// Add request timeout
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Claude API proxy endpoint
app.post('/api/claude', async (req, res) => {
  try {
    if (!process.env.REACT_APP_CLAUDE_API_KEY) {
      throw new Error('API key not configured');
    }

    console.log('Proxying request to Claude API...');

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      req.body,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    console.log('Claude API response received successfully');
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Claude API:', error.response?.data || error.message);

    // Send appropriate error response
    if (error.response) {
      // API returned an error
      res.status(error.response.status).json({
        error: error.response.data || { message: 'Claude API error' }
      });
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      res.status(504).json({
        error: { message: 'Request timeout - Claude API took too long to respond' }
      });
    } else {
      // Network or other error
      res.status(500).json({
        error: { message: error.message || 'Internal server error' }
      });
    }
  }
});

// Claude API streaming proxy endpoint (SSE passthrough)
app.post('/api/claude/stream', async (req, res) => {
  try {
    if (!process.env.REACT_APP_CLAUDE_API_KEY) {
      throw new Error('API key not configured');
    }

    // Prepare SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    // Ensure streaming is enabled upstream
    const body = { ...req.body, stream: true };

    const upstream = await axios.post(
      'https://api.anthropic.com/v1/messages',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.REACT_APP_CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        responseType: 'stream',
        timeout: 0 // do not time out streaming
      }
    );

    upstream.data.on('data', (chunk) => {
      res.write(chunk);
    });

    upstream.data.on('end', () => {
      res.end();
    });

    upstream.data.on('error', (err) => {
      try {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ message: err.message })}\n\n`);
      } catch { }
      res.end();
    });

    req.on('close', () => {
      try { upstream.data?.destroy(); } catch { }
    });
  } catch (error) {
    console.error('Stream proxy error:', error.response?.data || error.message);
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ message: error.message || 'Internal server error' })}\n\n`);
    } catch { }
    res.end();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { message: 'Internal server error' }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't exit the process, try to keep running
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  // Don't exit the process, try to keep running
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Claude API endpoint: http://localhost:${PORT}/api/claude`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log(`\nPress Ctrl+C to stop the server\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
