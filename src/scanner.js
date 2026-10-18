/* 扫描流程
   主路径：**直接翻页读接口**（快、全、带真动态 ID，删除必须有它）。
   页面下滑 / 卡片解析只在接口不通时兜底 —— 它拿不到动态 ID，只能判定不能删。

   历史教训（别再回头折腾）：拦截页面 fetch 行不通，B站把原生 fetch 存进了自己的模块变量，
   外面再包装 window.fetch 对它无效。 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG, P = B.parser, N = B.net, L = B.lottery;
  var S = {};

  S.lastErr = '';

  /* ---------- 主路径：接口翻页到底 ---------- */
  S.apiAll = async function (uid, onProgress) {
    var offset = '', page = 0, dup = 0;
    S.lastErr = '';

    while (page < CFG.apiPageMax && !B.state.stop) {
      page++;
      var j = await N.fetchFeedPage(uid, offset);

      if (!j) { S.lastErr = '无响应'; onProgress('接口无响应'); break; }
      if (j.code !== 0) {
        S.lastErr = 'code=' + j.code + ' ' + (j.message || j.msg || '');
        onProgress('接口返回 ' + S.lastErr);
        break;
      }

      var items = (j.data && j.data.items) || [];
      var added = 0;
      for (var i = 0; i < items.length; i++) {
        var id = P.itemId(items[i]);
        if (id && !B.state.items.has(id)) { B.state.items.set(id, items[i]); added++; }
      }
      onProgress('读取第 ' + page + ' 页 · 新增 ' + added + ' · 累计 ' + B.state.items.size + ' 条');

      if (!items.length) break;
      dup = added === 0 ? dup + 1 : 0;
      if (dup >= 3) break;                      /* 连续 3 页全是重复才算到底 */
      if (!j.data.has_more) break;

      var next = j.data.offset == null ? '' : String(j.data.offset);
      if (!next || next === offset) break;
      offset = next;
      await U.sleep(U.rnd(250, 550));
    }

    if (N.signMode === 'wbi' && B.state.items.size) onProgress('接口已带 WBI 签名');
    return B.state.items.size;
  };

  /* ---------- 兜底：页面下滑 + 卡片解析 ---------- */
  var scrollerEl = null;

  function findScroller() {
    var nodes = document.querySelectorAll('div, main, section');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.scrollHeight > n.clientHeight + 200 &&
          /(auto|scroll)/.test(getComputedStyle(n).overflowY)) {
        return n;
      }
    }
    return null;
  }

  function toBottom() {
    var h = Math.max(document.body ? document.body.scrollHeight : 0, document.documentElement.scrollHeight);
    var y0 = window.scrollY || document.documentElement.scrollTop || 0;
    window.scrollTo(0, h);
    if ((window.scrollY || 0) <= y0 + 10 && h > window.innerHeight) {
      if (!scrollerEl) scrollerEl = findScroller();
      if (scrollerEl) scrollerEl.scrollTop = scrollerEl.scrollHeight;
    }
  }

  S.collectDom = function () {
    var cards = P.domCards();
    var added = 0;
    cards.forEach(function (v, k) {
      var old = B.state.cards.get(k);
      if (!old) {
        B.state.cards.set(k, v);
        added++;
      } else if (!old.lotteryId && v.lotteryId) {
        old.lotteryId = v.lotteryId;
      }
    });
    return added;
  };

  S.autoScroll = async function (onProgress) {
    var idle = 0, rounds = 0, lastTotal = 0;
    S.collectDom();

    while (!B.state.stop && rounds < CFG.scrollRoundMax) {
      toBottom();
      await U.sleep(CFG.scrollWait + U.rnd(0, 500));

      var added = S.collectDom();
      var total = B.state.cards.size;
      rounds++;

      idle = (added > 0 || total > lastTotal) ? 0 : idle + 1;
      lastTotal = total;
      if (onProgress) onProgress('下滑中 · 已收集 ' + total + ' 条（第 ' + rounds + ' 次）');

      if (P.hasEndMark()) { if (onProgress) onProgress('已到页面底部'); return; }
      if (idle >= CFG.scrollIdleMax) { if (onProgress) onProgress('连续 ' + idle + ' 次无新增，判定已到底'); return; }
      if (total >= CFG.maxItems) { if (onProgress) onProgress('已达收集上限'); return; }
    }
  };

  /* ---------- 诊断：什么都拿不到时，把原因摊开写进日志 ---------- */
  S.diagnose = async function (uid, onProgress) {
    try {
      var sels = ['.bili-dyn-list__item', '.bili-dyn-item', '[class*="dyn-item"]', '[data-did]'];
      var counts = sels.map(function (s) { return document.querySelectorAll(s).length; });
      onProgress('诊断 · 卡片节点 ' + counts.join(' / ') + '（按上面选择器顺序）');

      var el = document.querySelector('.bili-dyn-list__item') || document.querySelector('[class*="dyn-item"]');
      if (el) {
        var attrs = Array.prototype.slice.call(el.attributes).map(function (a) { return a.name; }).join(',');
        var links = Array.prototype.slice.call(el.querySelectorAll('a[href]'), 0, 5)
          .map(function (a) { return a.getAttribute('href'); }).join(' | ');
        onProgress('诊断 · 首卡属性 [' + attrs + ']');
        onProgress('诊断 · 首卡链接 ' + U.clamp(links, 180));
      } else {
        onProgress('诊断 · 页面里没有匹配到任何卡片节点');
      }

      var j = await N.fetchFeedPage(uid, '');
      var n = (j && j.data && j.data.items && j.data.items.length) || 0;
      onProgress('诊断 · 接口 code=' + (j && j.code) + ' msg=' + ((j && (j.message || j.msg)) || '-') + ' items=' + n);
      if (n) {
        var it = j.data.items[0];
        onProgress('诊断 · 首条 type=' + P.itemTypeLabel(it) + ' id=' + P.itemId(it) + ' 原动态=' + (P.origId(it) || '-'));
      }
    } catch (e) {
      onProgress('诊断 · 出错 ' + ((e && e.message) || e));
    }
  };

  /* ---------- 主流程 ---------- */
  S.runScan = async function (onProgress) {
    var say = function (t) { U.log(t); if (onProgress) onProgress(t); };

    if (!U.isSpaceDynamicPage()) {
      say('请先打开空间动态页：space.bilibili.com/你的UID/dynamic');
      throw new Error('NOT_ON_SPACE_PAGE');
    }

    B.state.scanning = true;
    B.state.stop = false;
    B.state.items.clear();
    B.state.cards.clear();
    B.state.records = [];
    B.state.source = '';
    B.state.uid = U.getUid();
    L.stats.probe = 0;
    L.stats.fail = 0;
    L.mode = '';
    N.hits = 0;
    N.signMode = '';
    S.lastErr = '';

    try {
      say('开始扫描（直接读取动态列表）…');
      await S.apiAll(B.state.uid, say);

      var useApi = B.state.items.size > 0;
      var stoppedByUser = B.state.stop;

      /* 接口不通才下滑兜底 */
      if (!useApi && !stoppedByUser) {
        say('接口没拿到数据' + (S.lastErr ? '（' + S.lastErr + '）' : '') + '，改走页面下滑…');
        await S.autoScroll(say);
        S.collectDom();
        stoppedByUser = B.state.stop;
      }

      /* "停止"只停读取，不停判定：已经拿到手的要判完，否则等于白扫（第 8 轮踩过同样的坑） */
      if (stoppedByUser) {
        B.state.stop = false;
        say('已停止读取' + (useApi || B.state.cards.size
          ? '，继续判定已收集的 ' + (useApi ? B.state.items.size : B.state.cards.size) + ' 条'
          : '') + '（再点一次「停止」可中断判定）');
      }

      if (!useApi && B.state.cards.size === 0) {
        say('两条路都没拿到数据，跑一次诊断：');
        await S.diagnose(B.state.uid, say);
        return [];
      }

      var arr = useApi
        ? Array.from(B.state.items.values())
        : Array.from(B.state.cards.values());
      B.state.source = useApi ? '接口' : '页面';

      say('共收集 ' + arr.length + ' 条（来源：' + B.state.source + '），开始判定…');

      for (var i = 0; i < arr.length; i++) {
        if (B.state.stop) break;
        var rec = useApi ? await L.classify(arr[i]) : await L.classifyCard(arr[i]);
        if (rec && rec.id) B.state.records.push(rec);
        if ((i + 1) % 5 === 0 || i + 1 === arr.length) say('判定中 ' + (i + 1) + '/' + arr.length);
        await U.sleep(CFG.probeGap + U.rnd(0, 250));
      }

      if (B.state.stop) say('已停止，保留已判定的 ' + B.state.records.length + ' 条');
      else say('扫描完成，共 ' + B.state.records.length + ' 条（来源：' + B.state.source + '）');
      if (L.stats.fail > 0) say(L.stats.fail + ' 次抽奖状态查询失败，已按未开奖保护');

      if (CFG.debug) {
        console.table(B.state.records.slice(0, 20).map(function (r) {
          return {
            动态ID: r.id, 抽奖ID: r.origId || '-', 判定: r.verdict,
            原因: r.reason, 时间: r.timeText || (r.pubTs ? U.fmtTime(r.pubTs) : ''), 文本: U.clamp(r.text, 40)
          };
        }));
      }
      return B.state.records;
    } finally {
      B.state.scanning = false;
      B.state.stop = false;
    }
  };

  B.scanner = S;
})();
