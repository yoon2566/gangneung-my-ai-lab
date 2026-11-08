import html from './index.html';
export default {
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path !== '/' && path !== '/index.html') return new Response('Not found', {status:404});
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
    return new Response(request.method === 'HEAD' ? null : html, {headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
  }
};
