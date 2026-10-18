/* 验证删除链路：能选进删除队列的、真正发出去的删除请求
   重点：页面兜底拿不到真 ID 的条目（noId）绝不能进队列 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');

global.window = {};
global.document = {
  cookie: 'bili_jct=abc123; DedeUserID=123',
  body: { scrollHeight: 0, innerText: '', appendChild() {}, removeChild() {} },
  documentElement: { scrollHeight: 0, scrollTop: 0 },
  querySelectorAll: () => [],
  querySelector: () => null,
  createElement: () => ({ style: {}, appendChild() {}, remove() {}, click() {}, setAttribute() {} })
};
global.location = { href: 'https://space.bilibili.com/123/dynamic', pathname: '/123/dynamic' };
global.getComputedStyle = () => ({ overflowY: 'visible' });
global.XMLHttpRequest = function () {};
XMLHttpRequest.prototype = { open() {}, send() {} };
global.URL = require('url').URL;
global.confirm = () => true;
global.Blob = function () {};

['config.js', 'md5.js', 'utils.js', 'net.js', 'parser.js', 'lottery.js', 'scanner.js', 'deleter.js']
  .forEach((f) => require(path.join(ROOT, 'src', f)));
const B = global.window.BLCL;
const D = B.deleter;
/* 测试里把限速调到 0，否则真等 3–8 秒 */
B.CFG.delMin = 0;
B.CFG.delMax = 1;

function rec(o) {
  return Object.assign({
    id: '', origId: '', type: 'DYNAMIC_TYPE_FORWARD', pubTs: 1700000000,
    text: '', verdict: 'deletable', reason: '官方抽奖已开奖', drawTs: 1760000000,
    weak: false, checked: false, deleted: false, err: '', noId: false
  }, o);
}

B.state.records = [
  rec({ id: '1001', checked: true }),
  rec({ id: '1002', checked: true }),
  rec({ id: 'dom_3', noId: true, checked: true }),      // 页面兜底，没真ID → 必须被过滤掉
  rec({ id: '1004', checked: true, verdict: 'protected' }) // 未开奖 → 不该被选
];
B.state.records[3].checked = true;

const targets = D.pickTargets(0);
console.log('进入删除队列：' + targets.map((r) => r.id).join(', '));

let removed = [];
global.fetch = async function (url, opts) {
  url = String(url);
  const json = (o) => ({ json: async () => o });
  if (url.includes('/x/web-interface/nav')) return json({ code: 0, data: {} });
  if (url.includes('operate/remove')) {
    removed.push((opts && opts.body) || '');
    return json({ code: 0, message: '0' });
  }
  return json({ code: -404 });
};

(async () => {
  const res = await D.runDelete(0, () => {});
  console.log('删除结果：成功 ' + res.ok + ' 失败 ' + res.fail + ' 请求数 ' + removed.length);
  console.log('请求体：' + removed.join(' | '));

  const rightIds = removed.length === 2 &&
    removed.some((b) => b.includes('"dyn_id_str":"1001"')) &&
    removed.some((b) => b.includes('"dyn_id_str":"1002"'));
  const noIdBlocked = B.state.records[2].deleted === false;
  const protectedBlocked = B.state.records[3].deleted === false;

  const ok = rightIds && noIdBlocked && protectedBlocked && res.ok === 2;
  console.log(ok ? '✅ noId 与未开奖都被挡住，且删除请求带的是自己的动态 ID'
                 : '❌ 删除链路不符合预期');
  process.exit(ok ? 0 : 1);
})();
