import estimates from '../api/shipping-estimates.mjs';
import quoteRequests from '../api/quote-requests.mjs';
import admin from '../api/admin.mjs';
import settings from '../api/site-settings.mjs';

const endpoints = {
  '/api/shipping-estimates': estimates,
  '/api/quote-requests': quoteRequests,
  '/api/admin': admin,
  '/api/site-settings': settings,
};

export function apiMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://local');
  const oldRoutes = {'/warehouse-3d':'/gke-3d','/vi/kho-3d':'/vi/gke-3d','/zh/warehouse-3d':'/zh/gke-3d'};
  if (oldRoutes[url.pathname]) {
    res.writeHead(302, {Location: oldRoutes[url.pathname] + url.search});
    return res.end();
  }
  const match = endpoints[req.url?.split('?')[0]];
  if (!match) return next();
  void match(req, res).catch(() => {
    res.statusCode = 500;
    res.end();
  });
}
