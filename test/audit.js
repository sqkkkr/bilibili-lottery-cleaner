/* 二次检查的状态、归属与网络边界；全部使用模拟接口，不会操作账号。 */
'use strict';
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
function setup() {
  const c = { window: {}, console, URLSearchParams, AbortController, setTimeout, clearTimeout,
    setInterval: () => {}, confirm: () => true,
    location: { href: 'https://space.bilibili.com/123/dynamic', pathname: '/123/dynamic' },
    document: { body: {}, cookie: 'bili_jct=test; DedeUserID=123',
      getElementById: () => null, querySelectorAll: () => [] } };
  vm.createContext(c);
  for (const file of ['config', 'utils', 'net', 'parser', 'lottery', 'scanner', 'deleter', 'ui'])
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', file + '.js'), 'utf8'), c);
  const B = c.window.BLCL;
  B.utils.sleep = async () => {};
  B.utils.log = () => {};
  B.CFG.requireConfirm = false;
  return c;
}
function loadMain(c) {
  const B = c.window.BLCL;
  B.ui.build = B.ui.render = B.ui.setRunning = B.ui.clearLog = () => {};
  B.ui.setStatus = text => { c.status = text; };
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/main.js'), 'utf8'), c);
}
const rec = id => ({ id, verdict: 'deletable', checked: true, deleted: false, type: 'DYNAMIC_TYPE_FORWARD' });
function pageOwnership() {
  const c = setup(), U = c.window.BLCL.utils;
  assert.equal(U.isSpaceDynamicPage(), true);
  for (const url of ['https://space.bilibili.com/456/dynamic', 'https://space.bilibili.com/123/dynamicfake', 'https://www.bilibili.com/']) {
    c.location.href = url; assert.equal(U.isSpaceDynamicPage(), false, url);
  }
  c.location.href = 'https://space.bilibili.com/123/dynamic?x=1';
  assert.equal(U.isSpaceDynamicPage(), true);
  c.document.cookie = ''; assert.equal(U.isSpaceDynamicPage(), false);
  console.log('PASS 本人空间、登录信息、精确路径检查');
}
async function deletionState() {
  const c = setup(), B = c.window.BLCL; loadMain(c);
  B.state.uid = '123'; B.state.records = [rec('1001'), rec('1002')];
  let calls = [];
  B.net.removeDynamic = async id => { calls.push(id); B.state.stop = true; return { code: 0 }; };
  await B.main.startDelete();
  assert.deepEqual(calls, ['1001']); assert.equal(B.state.stop, false); assert.match(c.status, /已停止/);
  B.net.removeDynamic = async id => { calls.push(id); return { code: 0 }; };
  await B.main.startDelete();
  assert.deepEqual(calls, ['1001', '1002']); assert.equal(B.state.records[1].deleted, true);
  B.state.records = [rec('2001'), rec('2002')]; calls = [];
  B.net.removeDynamic = async id => { calls.push(id); c.location.href = 'https://space.bilibili.com/456/dynamic'; return { code: 0 }; };
  await B.main.startDelete();
  assert.deepEqual(calls, ['2001']); assert.match(c.status, /已停止/);
  c.location.href = 'https://space.bilibili.com/123/dynamic';
  B.state.scanning = true; await B.main.startDelete(); assert.equal(calls.length, 1);
  B.state.scanning = false; B.state.deleting = true;
  let scans = 0; B.scanner.runScan = async () => { scans++; };
  await B.main.startScan(); assert.equal(scans, 0);
  B.state.deleting = false; B.CFG.requireConfirm = true; c.confirm = () => false;
  await B.main.startDelete(); assert.match(c.status, /已取消/); assert.equal(calls.length, 1);
  B.state.records = [rec(''), rec('bad'), Object.assign(rec('1'), { noId: true }),
    Object.assign(rec('2'), { verdict: 'protected' }), rec('3')];
  assert.equal(B.deleter.pickTargets(0).length, 1);
  console.log('PASS 停止后重启删除、离开页面中断、扫描删除互斥、取消反馈、资格过滤');
}
async function queryAndDom() {
  const c = setup(), B = c.window.BLCL;
  B.net.requestJson = async url => {
    if (url.includes('/v2/')) throw Error('超时');
    return { code: 0, data: {} };
  };
  assert.equal((await B.lottery.probeLottery(['111'])).kind, 'error');
  B.net.requestJson = async () => ({ code: 0, data: null });
  assert.equal((await B.lottery.probeLottery(['111'])).kind, 'error');
  B.net.requestJson = async () => ({ code: 0, data: {} });
  assert.equal((await B.lottery.probeLottery(['111'])).kind, 'none');
  B.lottery.probeLottery = async () => ({ kind: 'official', status: 2 });
  const r = await B.lottery.classifyCard({ id: '9001', isForward: true, lotteryId: '111' });
  assert.equal(r.verdict, 'deletable'); assert.equal(r.noId, true); assert.equal(B.deleter.isEligible(r), false);
  const el = { innerText: '转发动态 抽奖', getAttribute: () => '',
    querySelector: selector => selector.includes('opus') ? { getAttribute: () => 'https://www.bilibili.com/opus/12345678901234567' } : null,
    querySelectorAll: () => [] };
  c.document.querySelectorAll = () => [el];
  assert.equal(Array.from(B.parser.domCards().values())[0].noId, true);
  console.log('PASS 部分接口失败与无效响应保护、页面原动态链接不进入删除队列');
}
async function timeout() {
  const c = setup(), B = c.window.BLCL;
  let signal;
  c.fetch = (url, opts) => { signal = opts.signal; return new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(Error('aborted')));
  }); };
  await assert.rejects(B.net.requestJson('https://example.invalid/', { timeout: 5 }), /超时/);
  assert.equal(signal.aborted, true);
  c.fetch = async (url, opts) => { signal = opts.signal; return { json: async () => ({ code: 0 }) }; };
  assert.equal((await B.net.requestJson('https://example.invalid/', { timeout: 5 })).code, 0);
  await new Promise(resolve => setTimeout(resolve, 15)); assert.equal(signal.aborted, false);
  c.fetch = async () => ({ status: 412, json: async () => { throw Error('不应解析限制页面'); } });
  assert.equal((await B.net.requestJson('https://example.invalid/')).code, 412);
  console.log('PASS 超时取消请求、成功请求清理计时器');
}
async function riskPauseStop() {
  const c = setup(), B = c.window.BLCL;
  B.state.records = [rec('1001'), rec('1002')];
  let sleeps = [], calls = 0;
  B.net.removeDynamic = async () => { calls++; return { code: -412, message: '风控' }; };
  B.utils.sleep = async ms => { sleeps.push(ms); B.state.stop = true; };
  const result = await B.deleter.runDelete(0, () => {});
  assert.equal(calls, 1); assert.equal(result.stopped, true); assert.deepEqual(sleeps, [200]);
  calls = 0;
  B.net.requestJson = async () => { calls++; return { code: -412 }; };
  assert.equal((await B.net.fetchFeedPage('123', '')).code, -412);
  assert.equal(calls, 1);
  console.log('PASS -412风控暂停中停止，不再等待一分钟或发送下一条');
}
(async () => { pageOwnership(); await deletionState(); await queryAndDom(); await timeout(); await riskPauseStop(); })()
  .catch(error => { console.error(error); process.exitCode = 1; });
