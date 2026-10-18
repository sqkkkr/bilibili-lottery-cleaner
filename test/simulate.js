/* 本地跑一遍扫描链路（不依赖浏览器）：node test/simulate.js */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = {};
global.document = {
  cookie: 'bili_jct=abc123; DedeUserID=123',
  body: { scrollHeight: 0, innerText: '' },
  documentElement: { scrollHeight: 0, scrollTop: 0 },
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ style: {}, appendChild() {}, remove() {}, click() {}, setAttribute() {} }),
  body_appendChild: () => {}
};
global.document.body.appendChild = () => {};
global.location = { href: 'https://space.bilibili.com/123/dynamic', pathname: '/123/dynamic' };
global.getComputedStyle = () => ({ overflowY: 'visible' });
global.XMLHttpRequest = function () {};
XMLHttpRequest.prototype = { open() {}, send() {} };
global.window.scrollY = 0;
global.window.innerHeight = 900;
global.window.scrollTo = () => {};

function load(f) { require(path.join(ROOT, 'src', f)); }
load('config.js');
load('md5.js');
load('utils.js');
load('net.js');
load('parser.js');
load('lottery.js');
load('scanner.js');

const B = global.window.BLCL;

/* ---- mock 接口 ---- */
let calls = [];
global.fetch = async function (url) {
  url = String(url);
  calls.push(url);
  const json = (o) => ({ json: async () => o });

  if (url.includes('/x/web-interface/nav')) {
    return json({ code: 0, data: { wbi_img: {
      img_url: 'https://i0.hdslb.com/bfs/wbi/7cd084941338484aae1ad9425b84077c.png',
      sub_url: 'https://i0.hdslb.com/bfs/wbi/4932caff0ff746eab6f01bf08b70ac45.png'
    } } });
  }
  if (url.includes('feed/space')) {
    const u = new URL(url);
    const off = u.searchParams.get('offset') || '';
    if (!off) {
      return json({ code: 0, data: {
        has_more: 1, offset: 'p2',
        items: [
          { id_str: '9001', type: 'DYNAMIC_TYPE_FORWARD', basic: { pub_ts: 1700000000 },
            modules: { module_dynamic: { desc: { text: '转发动态' } } },
            orig: { id_str: '111', modules: { module_dynamic: { desc: { text: '1月新机免费送 抽奖 开奖时间 2026-11-15' } } } } },
          { id_str: '9002', type: 'DYNAMIC_TYPE_WORD', basic: { pub_ts: 1700000000 },
            modules: { module_dynamic: { desc: { text: '自己发的一句话' } } } }
        ] } });
    }
    return json({ code: 0, data: {
      has_more: 0, offset: '',
      items: [
        { id_str: '9003', type: 'DYNAMIC_TYPE_FORWARD', basic: { pub_ts: 1700000000 },
          modules: { module_dynamic: { desc: { text: '转发动态' } } },
          orig: { id_str: '222', modules: { module_dynamic: { desc: { text: '转发抽奖，未写开奖时间' } } } } }
      ] } });
  }
  if (url.includes('lottery_notice')) {
    if (url.includes('111') || url.includes('dynamic_id=111')) {
      return json({ code: 0, data: { lottery_id: 5, status: 2, lottery_time: 1760000000, participants: 100 } });
    }
    return json({ code: 0, data: {} });
  }
  return json({ code: -404, message: 'unexpected ' + url });
};

(async () => {
  const logs = [];
  const recs = await B.scanner.runScan((t) => logs.push(t));
  logs.forEach((l) => console.log('  ' + l));
  console.log('\n--- 结果 ---');
  recs.forEach((r) => console.log(`${r.id}\t${r.verdict}\t${r.reason}\torig=${r.origId || '-'}`));
  const bad = recs.find((r) => r.id === '9001' && r.verdict !== 'deletable')
    || recs.find((r) => r.id === '9002' && r.verdict !== 'skip_original')
    || recs.find((r) => r.id === '9003' && r.verdict !== 'skip_nolottery');
  console.log('\n接口调用数：' + calls.length);
  console.log(bad ? '❌ 有用例不符合预期' : '✅ 全部符合预期');
})().catch((e) => { console.error('崩溃', e); process.exit(1); });
