import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { build, root, output } from './build.mjs';

const watching = process.argv.includes('--watch');
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8' };
await build();
let pendingBuild = Promise.resolve();
const server = createServer(async (request, response) => {
  try {
    await pendingBuild;
    const url = new URL(request.url, 'http://localhost');
    const decoded = decodeURIComponent(url.pathname);
    let file = path.resolve(output, `.${decoded}`);
    if (!file.startsWith(output + path.sep) && file !== output) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    try {
      const info = await stat(file);
      if (info.isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          response.writeHead(302, { Location: `${url.pathname}/${url.search}` }); response.end(); return;
        }
        file = path.join(file, 'index.html');
      }
      const buffer = await readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      response.end(request.method === 'HEAD' ? undefined : buffer);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end(await readFile(path.join(output, '404.html')));
    }
  } catch {
    response.writeHead(400); response.end('Bad request');
  }
});
server.listen(port, host, () => console.log(`企业知识库：http://${host}:${port}${watching ? '（源文件变更后自动重新生成，刷新页面即可）' : ''}`));
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
if (watching) {
  let timer;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      pendingBuild = pendingBuild.then(() => build()).catch(error => console.error('生成失败：', error));
    }, 180);
  };
  for (const folder of ['company', 'public']) {
    try {
      const watcher = watch(path.join(root, folder), { recursive: true }, schedule);
      watcher.on('error', () => {
        console.warn('文件监听不可用；修改资料后重新运行 npm run dev 即可。');
        watcher.close();
      });
    } catch {
      console.warn('文件监听不可用；修改资料后重新运行 npm run dev 即可。');
    }
  }
}
