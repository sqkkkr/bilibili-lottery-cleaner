/* 动态字段解析：把 B站返回的动态对象拆成我们关心的几个字段
   B站改版后，字段变了优先改这里 */
(function () {
  'use strict';
  var B = window.BLCL;
  var P = {};

  /* 动态ID：新版在 id_str，老版可能在 basic.id_str */
  P.itemId = function (it) {
    if (!it) return '';
    return String(
      it.id_str ||
      (it.basic && it.basic.id_str) ||
      it.id ||
      (it.modules && it.modules.module_dynamic && it.modules.module_dynamic.dyn_id_str) || ''
    );
  };

  /* 类型：新版是字符串 DYNAMIC_TYPE_XXX，老版是数字 */
  P.itemTypeLabel = function (it) {
    var t = it.type;
    if (typeof t === 'string') return t;
    if (typeof t === 'number') return 'TYPE_' + t;
    var m = it.modules && it.modules.module_dynamic && it.modules.module_dynamic.major;
    return (m && m.type) || 'UNKNOWN';
  };

  /* 从类型标签里取数字（删除接口的 dyn_type 用） */
  P.numericType = function (label) {
    if (typeof label === 'number') return label;
    var m = String(label || '').match(/TYPE_(\d+)/);
    return m ? Number(m[1]) : 0;
  };

  /* 被转发的"原动态"ID —— 官方抽奖挂在这条动态上，查抽奖状态必须用它
     这一步是最容易搞错的地方：删除用自己这条的 ID，查抽奖用原动态的 ID */
  P.origId = function (it) {
    if (!it) return '';
    var md = it.modules && it.modules.module_dynamic;
    var major = md && md.major;
    var list = (major && major.opus && major.opus.orig) || [];
    for (var i = 0; i < list.length; i++) {
      var o = list[i] || {};
      var id = o.id_str || o.id || o.rid_str || o.rid || o.dyn_id_str;
      if (id) return String(id);
    }
    var src = it.orig || it.origin;
    if (src) {
      var id2 = src.id_str || src.id || src.rid_str || src.rid || src.dyn_id_str;
      if (id2) return String(id2);
    }
    return '';
  };

  /* 是否转发动态：原创动态一律跳过，这里判断错了后果最严重 */
  P.isForward = function (it) {
    if (!it) return false;
    if (it.type === 'DYNAMIC_TYPE_FORWARD' || it.type === 1) return true;
    if (P.origId(it)) return true;                       // 有转发原文 = 转发动态
    var md = it.modules && it.modules.module_dynamic;
    if (md && md.desc && (md.desc.orig || md.desc.origin)) return true;
    return false;
  };

  /* 正文：递归收集所有文本字段。
     转发动态的开奖时间写在"原动态"里，只读外层 desc.text 会漏掉，所以这里整棵树都扫 */
  P.itemText = function (it) {
    var TEXT_KEYS = { text: 1, title: 1, content: 1, summary: 1 };
    var out = [];
    var seen = new WeakSet();

    function walk(o, depth) {
      if (!o || typeof o !== 'object' || depth > 7 || out.length >= 60) return;
      if (seen.has(o)) return;
      seen.add(o);

      if (Array.isArray(o)) {
        for (var i = 0; i < o.length; i++) walk(o[i], depth + 1);
        return;
      }
      for (var k in o) {
        if (!Object.prototype.hasOwnProperty.call(o, k)) continue;
        var v = o[k];
        if (typeof v === 'string') {
          if (TEXT_KEYS[k] && v.trim()) out.push(v.trim());
        } else if (v && typeof v === 'object') {
          walk(v, depth + 1);
        }
      }
    }

    walk(it, 0);
    return out.join('\n').slice(0, 4000);
  };

  P.pubTs = function (it) {
    if (!it) return 0;
    var b = it.basic || {};
    return Number(
      b.pub_ts || it.pub_ts ||
      (it.modules && it.modules.module_author && it.modules.module_author.pub_ts) || 0
    );
  };

  /* ---------- 从页面卡片解析（现在的主数据来源）----------
     关键：卡片里"互动抽奖"那个链接本身就带 business_id，
     直接拿它去查开奖状态，不用再推原动态 ID，也不用依赖接口拦截 */

  /* 本条动态自己的 ID：卡片头部的时间链接排在最前面，多个链接时取第一个 */
  P.domCardId = function (el) {
    var id = (el.getAttribute && (el.getAttribute('data-did') || el.getAttribute('data-id'))) || '';
    if (id) return String(id);
    var a = el.querySelector('a[href*="/opus/"]') || el.querySelector('a[href*="t.bilibili.com/"]');
    var m = String(a ? a.getAttribute('href') : '').match(/(\d{15,})/);
    return m ? m[1] : '';
  };

  /* 官方抽奖的 business_id：从"互动抽奖"链接的查询参数里取 */
  P.domLotteryId = function (el) {
    var links = el.querySelectorAll('a[href*="lottery"]');
    for (var i = 0; i < links.length; i++) {
      var m = String(links[i].getAttribute('href') || '').match(/business_id=(\d+)/);
      if (m) return m[1];
    }
    var n = el.querySelector('[data-lottery-id], [data-business-id]');
    if (n) {
      return n.getAttribute('data-lottery-id') || n.getAttribute('data-business-id') || '';
    }
    return '';
  };

  P.domTimeText = function (el) {
    var t = el.querySelector('[class*="time"], time');
    if (!t) return '';
    return String(t.getAttribute('title') || t.innerText || '').replace(/\s+/g, ' ').trim();
  };

  P.domCards = function () {
    var out = new Map();
    var nodes = document.querySelectorAll(B.CFG.sel.card);

    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var txt = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!txt) continue;

      /* 空间动态页的卡片不一定带指向自己的链接，取不到 ID 也要收进来，
         否则整张卡片被丢掉 —— 但没 ID 就不能删，后面会标 noId 挡住 */
      var id = P.domCardId(el);
      var key = id || ('dom_' + i);

      out.set(key, {
        key: key,
        id: id,
        noId: !id,
        lotteryId: P.domLotteryId(el),
        isForward: /转发动态/.test(txt) ||
          !!el.querySelector('[class*="forward"], [class*="__orig"], [class*="dyn-orig"]'),
        text: txt,
        timeText: P.domTimeText(el),
        pubTs: 0
      });
    }
    return out;
  };

  /* 页面是否已经到底（出现"没有更多"之类的提示） */
  P.hasEndMark = function () {
    var els = document.querySelectorAll(B.CFG.sel.end);
    for (var i = 0; i < els.length; i++) {
      var t = (els[i].innerText || '').trim();
      if (t && /没有更多|到底了|已经到底|暂无更多/.test(t)) return true;
    }
    return /没有更多|到底了|已经到底/.test((document.body.innerText || '').slice(-400));
  };

  B.parser = P;
})();
