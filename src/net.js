/* 网络层：请求封装 + 拦截页面请求 + 动态列表接口 */
(function () {
  'use strict';
  var B = window.BLCL;
  var U = B.utils, CFG = B.CFG;
  var N = {};

  /* ---------- 带超时的 JSON 请求 ---------- */
  N.requestJson = function (url, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('超时')); }, opts.timeout || CFG.probeTimeout);
      fetch(url, {
        method: opts.method || 'GET',
        credentials: 'include',
        headers: Object.assign({ Accept: 'application/json' }, opts.headers || {}),
        body: opts.body
      }).then(function (r) { return r.json(); })
        .then(function (j) { clearTimeout(timer); resolve(j); })
        .catch(function (e) { clearTimeout(timer); reject(e); });
    });
  };

  /* ---------- 拦截页面的动态列表请求 ----------
     这是最准的数据来源：页面自己发的请求，带完整签名和 Cookie，我们只读响应副本。 */
  N.installHooks = function (onFeedJson) {
    if (N.__hooked) return;   /* 幂等：SPA 来回切换时不重复包装 */
    N.__hooked = true;

    /* 命中计数，用来判断"拦截到底有没有生效" */
    var wrapped = function (j) {
      N.hits++;
      try { onFeedJson(j); } catch (e) {}
    };

    /* fetch */
    var origFetch = window.fetch;
    if (typeof origFetch === 'function') {
      window.fetch = function () {
        var p = origFetch.apply(this, arguments);
        try {
          var u = typeof arguments[0] === 'string' ? arguments[0] : (arguments[0] && arguments[0].url);
          if (u && String(u).indexOf('feed/space') > -1) {
            p.then(function (res) {
              try { res.clone().json().then(wrapped).catch(function () {}); } catch (e) {}
              return res;
            }).catch(function () {});
          }
        } catch (e) {}
        return p;
      };
    }
    /* XMLHttpRequest（B站前端用的是 axios，走 XHR） */
    var OP = XMLHttpRequest.prototype.open;
    var SE = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function () {
      this.__blclUrl = String(arguments[1] || '');
      return OP.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      var self = this;
      this.addEventListener('load', function () {
        if (!self.__blclUrl || self.__blclUrl.indexOf('feed/space') === -1) return;
        try { wrapped(JSON.parse(self.responseText)); } catch (e) {}
      });
      return SE.apply(this, arguments);
    };
  };

  /* 拦截命中次数，用来判断拦截到底生效没有 */
  N.hits = 0;

  /* ---------- WBI 签名 ----------
     B站部分接口要 w_rid + wts，不带就返回 -352 / -403。
     密钥从 nav 接口拿（img_key + sub_key），按固定表重排出 mixinKey，md5(参数串 + mixinKey) 就是 w_rid。 */
  var MIXIN_TAB = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52
  ];

  N.wbi = { img: '', sub: '', ts: 0 };

  function ensureWbi(force) {
    if (!force && N.wbi.img && Date.now() - N.wbi.ts < 3600 * 1000) return Promise.resolve(true);
    return N.requestJson('https://api.bilibili.com/x/web-interface/nav', { timeout: 8000 })
      .then(function (j) {
        var d = j && j.data && j.data.wbi_img;
        if (!d || !d.img_url || !d.sub_url) return false;
        N.wbi.img = d.img_url.split('/').pop().split('.')[0];
        N.wbi.sub = d.sub_url.split('/').pop().split('.')[0];
        N.wbi.ts = Date.now();
        return !!(N.wbi.img && N.wbi.sub);
      })
      .catch(function () { return false; });
  }

  function mixinKey() {
    var raw = N.wbi.img + N.wbi.sub;
    var out = '';
    for (var i = 0; i < MIXIN_TAB.length; i++) out += raw.charAt(MIXIN_TAB[i]) || '';
    return out.slice(0, 32);
  }

  function signedQuery(params) {
    var p = {}, k;
    for (k in params) if (Object.prototype.hasOwnProperty.call(params, k)) p[k] = params[k];
    p.wts = Math.round(Date.now() / 1000);
    var keys = Object.keys(p).sort();
    var parts = [];
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = String(p[key]).replace(/[!'()*]/g, '');
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(val));
    }
    var query = parts.join('&');
    return query + '&w_rid=' + B.md5(query + mixinKey());
  }

  /* ---------- 主动拉取一页动态 ----------
     先用不签名的试；失败了自动补 WBI 签名重试一次（B站改策略时不用改代码）
     返回最后一次响应，调用方靠 code 判断成败 */
  N.fetchFeedPage = async function (uid, offset) {
    var params = {
      host_mid: String(uid),
      offset: offset || '',
      features: 'itemOpusStyle,listOnlyfans,opusBigCover,onlyfansVote,forwardListHidden,decorationCard,commentsNewVersion,onlyfansAssetsV2,ugcDelete,onlyfansQaCard',
      platform: 'web',
      web_location: '333.1387',
      timezone_offset: '-480'
    };
    var eps = [
      'https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?',
      'https://api.bilibili.com/x/polymer/web-dynamic/desktop/v1/feed/space?'
    ];
    var last = null;

    /* 第 1 轮：不签名 */
    for (var i = 0; i < eps.length; i++) {
      try {
        var j = await N.requestJson(eps[i] + new URLSearchParams(params).toString(), { timeout: 12000 });
        if (j && j.code === 0) { N.signMode = 'none'; return j; }
        last = j;
      } catch (e) {
        last = { code: -999, message: (e && e.message) || '请求异常' };
      }
    }

    /* 第 2 轮：带 WBI 签名 */
    var ok = await ensureWbi(false);
    if (!ok) return last;
    for (var k = 0; k < eps.length; k++) {
      try {
        var j2 = await N.requestJson(eps[k] + signedQuery(params), { timeout: 12000 });
        if (j2 && j2.code === 0) { N.signMode = 'wbi'; return j2; }
        last = j2;
      } catch (e2) {
        last = { code: -999, message: (e2 && e2.message) || '请求异常' };
      }
    }
    return last;
  };

  /* 签名模式，日志里显示用 */
  N.signMode = '';

  /* ---------- 删除动态（不可逆！调用方必须先过 dryRun 和确认）---------- */
  N.removeDynamic = function (id, dynType) {
    var csrf = U.getCsrf();
    if (!csrf) return Promise.resolve({ code: -1, message: '未登录或取不到 bili_jct' });
    var body = { dyn_id_str: String(id), rid_str: String(id) };
    var t = Number(dynType);
    if (!isNaN(t) && t > 0) body.dyn_type = t;
    return N.requestJson(
      'https://api.bilibili.com/x/dynamic/feed/operate/remove?platform=web&csrf=' + encodeURIComponent(csrf),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
  };

  B.net = N;
})();
