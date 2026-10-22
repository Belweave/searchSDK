import { createPlaygroundHandler } from './playground.mjs';
import { createMcpHandler } from './mcp.mjs';
export function playgroundServer() {
  return {
    name: 'searchsdk-server-playground',
    configureServer(server) {
      const handler = createPlaygroundHandler({ development: true });
      const mcp = createMcpHandler({ development: true });
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] === '/api/playground/search') void handler(req, res);
        else if (['/mcp', '/api/mcp'].includes(req.url?.split('?')[0])) void mcp(req, res);
        else next();
      });
    },
  };
}
