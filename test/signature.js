/* 验证 WBI 签名回退：不带 w_rid 一律 -352，带 w_rid 才给数据 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = {};
global.document = {
  cookie: 'bili_jct=abc123; DedeUserID=123',
  body: { scrollHeight: 0, innerText: '', appendChild() {} },
  documentElement: { scrollHeight: 0, scrollTop: 0 },
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ style: {}, appendChild() {}, remove() {}, click() {}, setAttribute() {} })
};
global.location = { href: 'https://space.bilibili.com/123/dynamic', pathname: '/123/dynamic' };
global.getComputedStyle = () => ({ overflowY: 'visible' });
global.XMLHttpRequest = function () {};
XMLHttpRequest.prototype = { open() {}, send() {} };
global.window.scrollY = 0;
global.window.innerHeight = 900;
global.window.scrollTo = () => {};

['config.js', 'md5.js', 'utils.js', 'net.js'].forEach((f) => require(path.join(ROOT, 'src', f)));
const N = global.window.BLCL.net;

let sawRid = false;
global.fetch = async function (url) {
  url = String(url);
  const json = (o) => ({ json: async () => o });
  if (url.includes('/x/web-interface/nav')) {
    return json({ code: 0, data: { wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'
    } } });
  }
  if (url.includes('feed/space')) {
    if (!url.includes('w_rid=')) return json({ code: -352, message: '风控校验失败' });
    if (!/w_rid=[0-9a-f]{32}/.test(url)) return json({ code: -400, message: 'w_rid 格式不对' });
    sawRid = true;
    return json({ code: 0, data: { has_more: 0, offset: '', items: [{ id_str: '1', type: 'DYNAMIC_TYPE_WORD' }] } });
  }
  return json({ code: -404 });
};

(async () => {
  const j = await N.fetchFeedPage('123', '');
  console.log('signMode =', N.signMode, '| sawRid =', sawRid, '| code =', j && j.code, '| items =', j.data && j.data.items.length);
  const ok = j && j.code === 0 && N.signMode === 'wbi' && sawRid;
  console.log(ok ? '✅ 签名回退正常' : '❌ 签名回退失败');
  process.exit(ok ? 0 : 1);
})();
