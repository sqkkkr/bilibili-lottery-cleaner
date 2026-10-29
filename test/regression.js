'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
function setup() {
  const context = { window: {}, console, URLSearchParams, setTimeout, clearTimeout, AbortController,
    location: { href: 'https://space.bilibili.com/123/dynamic', pathname: '/123/dynamic' },
    document: { cookie: 'DedeUserID=123; bili_jct=test', querySelectorAll: () => [] } };
  vm.createContext(context);
  for (const file of ['config', 'utils', 'net', 'parser', 'lottery', 'scanner', 'deleter', 'ui']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', file + '.js'), 'utf8'), context);
  }
  context.window.BLCL.utils.sleep = async () => {};
  return context;
}
const ts = (year, month, day, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute).getTime() / 1000;
function item(id, text = '本次抽奖7月18日评论区开奖', pubTs = ts(2023, 6, 23)) {
  return { id_str: String(id), type: 'DYNAMIC_TYPE_FORWARD',
    modules: { module_author: { pub_ts: pubTs } },
    orig: { id_str: '111', modules: { module_dynamic: { desc: { text } } } } };
}
async function datesAndClassification() {
  const B = setup().window.BLCL, L = B.lottery;
  const ref = ts(2023, 6, 23);
  assert.equal(L.parseDrawDate('本次抽奖7月18日评论区开奖', ref), ts(2023, 7, 19) - 1);
  assert.equal(L.parseDrawDate('抽奖 5月1日开奖', ref), ts(2023, 5, 2) - 1);
  assert.equal(L.parseDrawDate('抽奖 2027年7月18日开奖', ref), ts(2027, 7, 19) - 1);
  assert.equal(L.parseDrawDate('抽奖，截止时间：7/18 20:30', ref), ts(2023, 7, 18, 20, 30));
  assert.equal(L.parseDrawDate('转发抽奖。7月18日公布结果', ref), ts(2023, 7, 19) - 1);
  assert.equal(L.parseDrawDate('开奖时间2023年7月18日晚上8点30分', ref), ts(2023, 7, 18, 20, 30));
  assert.equal(L.parseDrawDate('开奖时间2023年7月18日晚上8点半', ref), ts(2023, 7, 18, 20, 30));
  assert.equal(L.parseDrawDate('开奖时间2023年7月18日晚上8点一刻', ref), 0);
  assert.equal(L.parseDrawDate('开奖时间2023年7月18日8:30 PM', ref), 0);
  assert.equal(L.parseDrawDate('开奖 2023年2月30日', ref), 0);
  assert.equal(L.parseDrawDate('开奖 2023年7月18日25:00', ref), 0);
  assert.equal(L.parseDrawDate('开奖 7月18日', 0), 0);
  assert.equal(L.parseDrawDate('抽奖但没写时间', ref), 0);
  assert.equal(L.parseDrawDate('抽奖7月1日开始，7月18日开奖', ref), ts(2023, 7, 19) - 1);
  assert.equal(L.parseDrawDate('抽奖7月1日开始7月18日开奖', ref), ts(2023, 7, 19) - 1);
  B.net.requestJson = async () => ({ code: 0, data: {} });
  let rec = await L.classify(item('9001'));
  assert.equal(rec.verdict, 'deletable');
  assert.equal(rec.drawTs, ts(2023, 7, 19) - 1);
  B.net.requestJson = async () => { throw Error('超时'); };
  assert.equal((await L.classify(item('9002'))).verdict, 'protected');
  B.net.requestJson = async () => ({ code: -412 });
  assert.equal((await L.classify(item('9003'))).verdict, 'protected');
  const calls = [];
  B.net.requestJson = async url => {
    calls.push(url);
    return url.includes('/v1/') ? { code: 0, data: { lottery_id: 1, status: 2 } } : { code: 0, data: {} };
  };
  assert.equal((await L.classify(item('9004'))).verdict, 'deletable');
  assert.ok(calls.some(url => url.includes('/v1/')));
  assert.equal((await L.classify({ id_str: '9', type: 'DYNAMIC_TYPE_WORD' })).verdict, 'skip_original');
  B.net.requestJson = async () => ({ code: 0, data: { lottery_id: 1, status: 0 } });
  assert.equal((await L.classify(item('9005'))).verdict, 'protected');
  console.log('PASS 日期、截图样本、接口保护和官方版本切换');
}
async function pagination() {
  const B = setup().window.BLCL, S = B.scanner;
  let page = 0;
  const logs = [];
  // 75页 x 20条，在第30页后插入3个重复页与一个有后续游标的空页。
  B.net.fetchFeedPage = async () => {
    page++;
    const gap = page >= 31 && page <= 34;
    const dataPage = page > 34 ? page - 4 : page;
    const items = gap ? (page === 34 ? [] : Array.from({ length: 20 }, (_, i) => item(i + 1))) :
      Array.from({ length: 20 }, (_, i) => item((dataPage - 1) * 20 + i + 1));
    return { code: 0, data: { items, has_more: page < 79 ? 1 : 0, offset: 'p' + page } };
  };
  B.utils.log = () => {};
  B.net.requestJson = async () => ({ code: 0, data: {} });
  const recs = await S.runScan(line => logs.push(line));
  assert.equal(B.state.items.size, 1500);
  assert.equal(page, 79);
  assert.equal(S.readStatus.complete, true);
  assert.equal(recs.length, 1500);
  assert.ok(recs.every(rec => rec.verdict === 'deletable'));
  async function scenario(fetcher, max = 200) {
    B.state.items.clear(); B.state.stop = false; B.CFG.apiPageMax = max;
    B.net.fetchFeedPage = fetcher;
    await S.apiAll('123', () => {});
    return S.readStatus;
  }
  let attempts = 0;
  let status = await scenario(async () => ++attempts < 3 ? { code: -500 } :
    { code: 0, data: { items: [item('1')], has_more: 0 } });
  assert.equal(attempts, 3); assert.equal(status.complete, true);
  attempts = 0;
  status = await scenario(async () => { attempts++; return { code: -500 }; });
  assert.equal(attempts, 3); assert.equal(status.complete, false);
  status = await scenario(async () => ({ code: 0, data: { items: [], has_more: 1, offset: 'same' } }));
  assert.equal(status.complete, false); assert.match(status.reason, /游标/);
  let n = 0;
  status = await scenario(async () => ({ code: 0, data: { items: [], has_more: 1, offset: String(++n) } }), 2);
  assert.equal(status.complete, false); assert.match(status.reason, /上限/);
  status = await scenario(async () => ({ code: 0, data: {} }));
  assert.equal(status.complete, false); assert.match(status.reason, /缺少/);
  status = await scenario(async () => ({ code: 0, data: { items: [{}], has_more: 0 } }));
  assert.equal(status.complete, false); assert.equal(status.missingIds, 1);
  console.log('PASS 1500条读取与判定、重复/空页、重试、循环、上限、响应异常');
}
function linksAndHooks() {
  const ctx = setup(), B = ctx.window.BLCL;
  B.state.records = [{ id: '9001', origId: '111', verdict: 'protected', reason: '很长的原因'.repeat(20), pubTs: ts(2023, 6, 23) }];
  B.ui.el.root = { querySelector: () => ({ checked: true }) };
  B.ui.el.list = { innerHTML: '', querySelectorAll: () => [] };
  B.ui.renderList();
  const html = B.ui.el.list.innerHTML;
  assert.match(html, /disabled/);
  assert.match(html, /<\/span><a class="b-view"/);
  assert.match(html, /opus\/9001/); assert.match(html, /opus\/111/);
  B.state.records[0].noId = true; B.state.records[0].id = 'dom_1';
  B.ui.renderList(); assert.ok(!B.ui.el.list.innerHTML.includes('/opus/dom_'));
  const fetch = () => {}, open = () => {}, send = () => {};
  ctx.window.fetch = fetch;
  ctx.XMLHttpRequest = { prototype: { open, send } };
  ctx.document.body = {};
  ctx.document.getElementById = () => null;
  ctx.location.href = 'https://space.bilibili.com/123/';
  ctx.setInterval = () => {};
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8'), ctx);
  assert.equal(ctx.window.fetch, fetch);
  assert.equal(ctx.XMLHttpRequest.prototype.open, open);
  assert.equal(ctx.XMLHttpRequest.prototype.send, send);
  console.log('PASS 未开奖独立跳转、无ID不生成错误链接、不替换页面网络函数');
}
(async () => { await datesAndClassification(); await pagination(); linksAndHooks(); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
