"""生成扩展图标 PNG（S3 方案：卡片右下角镂空嵌减号）

设计基准 24×24 网格，8 倍超采样后缩放到目标尺寸，保证边缘干净。
16px 单独简化：去掉卡片内的第二条内容线、加粗描边，避免小尺寸糊成一团。
"""
import os
from PIL import Image, ImageDraw

SS = 8
BLUE = (61, 130, 188, 255)      # #3D82BC 主蓝
LIGHT = (220, 235, 251, 255)    # #DCEBFB 浅蓝底
WHITE = (255, 255, 255, 255)

OUT_DIRS = [os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")]


def render(size, simplified):
    S = size * SS
    k = S / 24.0
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    stroke = 1.3 if not simplified else 1.9
    line_w = 1.3 if not simplified else 1.6
    minus_w = 1.9 if not simplified else 2.5

    def rr(x, y, w, h, r, fill=None, outline=None, width=0.0):
        d.rounded_rectangle(
            [x * k, y * k, (x + w) * k, (y + h) * k],
            radius=r * k, fill=fill, outline=outline,
            width=max(1, int(round(width * k))) if width else 0,
        )

    def bar(x1, x2, y, w, color):
        d.line([x1 * k, y * k, x2 * k, y * k], fill=color, width=max(1, int(round(w * k))))
        r = w * k / 2.0
        for xx in (x1 * k, x2 * k):
            d.ellipse([xx - r, y * k - r, xx + r, y * k + r], fill=color)

    # 底色板
    rr(1.5, 1.5, 21, 21, 5.5, fill=LIGHT)
    # 卡片
    rr(4.5, 4.5, 15, 15, 3, fill=WHITE, outline=BLUE, width=stroke)
    # 右下角缺口：直接用底色画圆盖掉（等效于 SVG 的 mask 镂空）
    d.ellipse([12 * k, 12 * k, 22 * k, 22 * k], fill=LIGHT)
    # 卡片内容线
    bar(8.0, 12.4, 8.8, line_w, BLUE)
    if not simplified:
        bar(8.0, 10.8, 11.8, line_w, BLUE)
    # 缺口里的减号
    bar(14.9, 19.1, 17.0, minus_w, BLUE)

    return img.resize((size, size), Image.LANCZOS)


def main():
    for d_ in OUT_DIRS:
        os.makedirs(d_, exist_ok=True)

    for size in (128, 48, 32, 16):
        simplified = size <= 16
        im = render(size, simplified)
        for d_ in OUT_DIRS:
            im.save(os.path.join(d_, "icon%d.png" % size), "PNG")
        print("icon%d.png %s" % (size, "简化版" if simplified else "完整版"))

    # 预览图：4 个尺寸并排放大展示，方便肉眼检查小尺寸表现
    prev = Image.new("RGBA", (128 * 4 + 60 * 3, 160), (255, 255, 255, 255))
    for i, size in enumerate((128, 48, 32, 16)):
        im = Image.open(os.path.join(OUT_DIRS[0], "icon%d.png" % size)).convert("RGBA")
        prev.paste(im, (i * (128 + 60), 16), im)
    prev.save(os.path.join(OUT_DIRS[0], "preview.png"), "PNG")
    print("preview.png 已生成")


if __name__ == "__main__":
    main()
