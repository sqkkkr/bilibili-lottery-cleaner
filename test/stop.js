/* 验证"中途点停止"的语义：停的是读取，不是判定
   预期：第 2 页期间点停止 → 只读到 2 页的数据，但这些数据必须全部判完 */
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

['config.js', 'md5.js', 'utils.js', 'net.js', 'parser.js', 'lottery.js', 'scanner.js']
  .forEach((f) => require(path.join(ROOT, 'src', f)));
const B = global.window.BLCL;

function mkItem(id, type, origId) {
  return {
    id_str: id, type: type, basic: { pub_ts: 1700000000 },
    modules: { module_dynamic: { desc: { text: '转发动态' } } },
    orig: origId ? { id_str: origId, modules: { module_dynamic: { desc: { text: '抽奖' } } } } : undefined
  };
}

let pageServed = 0;
global.fetch = async function (url) {
  url = String(url);
  const json = (o) => ({ json: async () => o });
  if (url.includes('/x/web-interface/nav')) return json({ code: 0, data: {} });
  if (url.includes('feed/space')) {
    pageServed++;
    if (pageServed === 2) B.state.stop = true;   // 第 2 页时用户点了"停止"
    return json({ code: 0, data: {
      has_more: 1, offset: 'p' + (pageServed + 1),
      items: [mkItem('90' + pageServed + '1', 'DYNAMIC_TYPE_FORWARD', '111'),
              mkItem('90' + pageServed + '2', 'DYNAMIC_TYPE_WORD', '')]
    } });
  }
  if (url.includes('lottery_notice')) {
    if (url.includes('111')) return json({ code: 0, data: { lottery_id: 1, status: 2, lottery_time: 1760000000 } });
    return json({ code: 0, data: {} });
  }
  return json({ code: -404 });
};

(async () => {
  const logs = [];
  const recs = await B.scanner.runScan((t) => logs.push(t));
  logs.forEach((l) => console.log('  ' + l));
  console.log('\n--- 结果 ---');
  console.log('读到页数：' + pageServed);
  recs.forEach((r) => console.log(`${r.id}\t${r.verdict}`));

  const expect = pageServed * 2;   // 读到的每一条都要有判定结果
  const ok = recs.length === expect && recs.some((r) => r.verdict === 'deletable');
  console.log(`\n判定条数 ${recs.length}，期望 ${expect}`);
  console.log(ok ? '✅ 停止后仍把已收集的判完了' : '❌ 停止后丢数据');
  process.exit(ok ? 0 : 1);
})();
