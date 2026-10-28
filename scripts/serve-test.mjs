import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(__dirname, '../test/fixtures');
const port = 3000;

const server = http.createServer((req, res) => {
  const filePath = path.join(testDir, req.url === '/' ? 'test-page.html' : req.url);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentType = ext === '.html' ? 'text/html' : ext === '.png' ? 'image/png' : 'text/plain';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`\n======================================================`);
  console.log(` Test server running at: http://localhost:${port}/`);
  console.log(` Open this URL in Chrome or Edge to test the extension!`);
  console.log(`======================================================\n`);
});
