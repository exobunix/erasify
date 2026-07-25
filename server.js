import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
    
    // Safety check: prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Fallback to index.html for SPA routing
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (errHtml, contentHtml) => {
                    if (errHtml) {
                        res.statusCode = 500;
                        res.end('Internal Server Error');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(contentHtml, 'utf-8');
                    }
                });
            } else {
                res.statusCode = 500;
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
