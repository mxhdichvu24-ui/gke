import media from '../api/media.mjs';
import manage from '../api/manage.mjs';
import publicContent from '../api/public-content.mjs';
import articles from '../api/articles.mjs';
import estimates from '../api/shipping-estimates.mjs';
import quoteRequests from '../api/quote-requests.mjs';
import admin from '../api/admin.mjs';
import settings from '../api/site-settings.mjs';

const endpoints = {
 '/api/media':media,
 '/api/manage':manage,
 '/api/public-content':publicContent,
 '/api/articles':articles,
  '/api/shipping-estimates': estimates,
  '/api/quote-requests': quoteRequests,
  '/api/admin': admin,
  '/api/site-settings': settings,
};

export function apiMiddleware(req, res, next) {
  const url = new URL(req.url, 'http://local');
  const resource=url.pathname.match(/^\/(vi\/kien-thuc|resources|zh\/resources)(?:\/([-a-z0-9]+))?$/);
 if(resource){url.searchParams.set('lang',resource[1].startsWith('vi/')?'vi':resource[1].startsWith('zh/')?'zh':'en');if(resource[2])url.searchParams.set('slug',resource[2]);req.url='/api/articles?'+url.searchParams;return void articles(req,res);}
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
