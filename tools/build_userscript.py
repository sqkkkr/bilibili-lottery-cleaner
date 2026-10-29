"""把扩展的多个模块打包成单个 Tampermonkey 用户脚本

输出：仓库根目录的 bilibili-lottery-cleaner.user.js
版本号从 src/config.js 读，避免手改漏掉。
"""
import os
import json
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "src")
OUT_NAME = "bilibili-lottery-cleaner.user.js"
OUTS = [os.path.join(ROOT, OUT_NAME)]

# 与 manifest.json 里 content_scripts.js 的顺序保持一致
MODULES = ["config.js", "md5.js", "utils.js", "net.js", "parser.js",
           "lottery.js", "scanner.js", "deleter.js", "ui.js", "main.js"]

HEADER = """// ==UserScript==
// @name         B站抽奖动态清理器
// @namespace    https://github.com/sqkkkr/bilibili-lottery-cleaner
// @version      {version}
// @description  自动扫描空间动态，只清理已开奖的转发抽奖动态；未开奖、判定不出的一律保护。
// @author       sqkkkr
// @match        https://space.bilibili.com/*
// @icon         https://cdn.jsdelivr.net/gh/sqkkkr/bilibili-lottery-cleaner@main/icons/icon128.png
// @run-at       document-start
// @grant        none
// @noframes
// @license      MIT
// @homepageURL  https://github.com/sqkkkr/bilibili-lottery-cleaner
// @supportURL   https://github.com/sqkkkr/bilibili-lottery-cleaner/issues
// @downloadURL  https://cdn.jsdelivr.net/gh/sqkkkr/bilibili-lottery-cleaner@main/bilibili-lottery-cleaner.user.js
// @updateURL    https://cdn.jsdelivr.net/gh/sqkkkr/bilibili-lottery-cleaner@main/bilibili-lottery-cleaner.user.js
// ==/UserScript==

/* 由 tools/build_userscript.py 自动生成，不要直接改这个文件。
   源码在 src/ 目录，改完重新跑一遍构建脚本。 */
"""

CSS_BOOT = """
/* ---------- 样式注入：油猴不能用 manifest 的 css 字段 ---------- */
(function () {
  var css = %s;
  function apply() {
    var s = document.createElement('style');
    s.setAttribute('data-blcl', '1');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  apply();
  if (!document.head) {
    document.addEventListener('DOMContentLoaded', function () {
      if (!document.querySelector('style[data-blcl]')) apply();
    });
  }
})();
"""


def read_version():
    text = open(os.path.join(SRC, "config.js"), encoding="utf-8").read()
    m = re.search(r"VERSION:\s*'([\d.]+)'", text)
    if not m:
        raise SystemExit("没能从 config.js 读到 VERSION")
    return m.group(1)


def js_string(text):
    return "'" + text.replace("\\", "\\\\").replace("'", "\\'").replace("\r", "") \
        .replace("\n", "\\n") + "'"


def main():
    version = read_version()
    with open(os.path.join(ROOT, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    if manifest["version"] != version:
        raise SystemExit("manifest.json and config.js versions differ")
    if manifest["content_scripts"][0]["js"] != ["src/" + name for name in MODULES]:
        raise SystemExit("manifest.json and userscript module order differ")
    css = open(os.path.join(ROOT, "styles", "panel.css"), encoding="utf-8").read()

    parts = [HEADER.format(version=version), CSS_BOOT % js_string(css)]

    for name in MODULES:
        path = os.path.join(SRC, name)
        code = open(path, encoding="utf-8").read()
        parts.append("\n/* ===== %s ===== */\n%s" % (name, code))

    out = "\n".join(parts)
    for p in OUTS:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8", newline="\n") as f:
            f.write(out)
        print("生成:", p, "%.1f KB" % (os.path.getsize(p) / 1024))
    print("版本:", version, "| 模块数:", len(MODULES))


if __name__ == "__main__":
    main()
