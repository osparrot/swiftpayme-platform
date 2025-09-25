const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Handle root path
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Handle SPA routing - serve index.html for non-asset requests
  const ext = path.parse(pathname).ext;
  if (!ext && !pathname.startsWith('/api') && !pathname.startsWith('/ws')) {
    pathname = '/index.html';
  }

  const filePath = path.join(distPath, pathname);

  // Security check - prevent directory traversal
  if (!filePath.startsWith(distPath)) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // File not found - serve index.html for SPA routing
        fs.readFile(path.join(distPath, 'index.html'), (indexErr, indexData) => {
          if (indexErr) {
            res.statusCode = 404;
            res.end('Not Found');
          } else {
            res.setHeader('Content-Type', 'text/html');
            res.end(indexData);
          }
        });
      } else {
        res.statusCode = 500;
        res.end('Server Error');
      }
    } else {
      const ext = path.parse(filePath).ext;
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      res.setHeader('Content-Type', contentType);
      
      // Add security headers
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Add cache headers for static assets
      if (ext === '.js' || ext === '.css' || ext === '.png' || ext === '.jpg' || ext === '.svg') {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
      } else if (ext === '.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
      
      res.end(data);
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🌐 SwiftPayMe Web UI is running on http://localhost:${port}`);
  console.log(`📁 Serving files from: ${distPath}`);
  console.log(`🔗 Open in browser: http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
