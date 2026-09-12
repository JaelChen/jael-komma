# Jael Chen — Personal Portfolio

完整静态个人网站：首屏、三个实践案例、个人介绍、能力说明和联系方式。直接使用 HTML / CSS / JavaScript，不需要构建，也没有外部运行时依赖。

## 本地预览

在本目录启动任意静态服务器，例如 `py -3 -m http.server 4173 --bind 127.0.0.1`，打开 `http://127.0.0.1:4173/`。也可直接打开 index.html，但复制功能取决于浏览器安全上下文，建议使用本地服务器。

## 内容与设计

- 暖白、墨黑、朱橙；中英文字体对比、杂志式排版、真实人物照片。
- 案例内容来自原网站的个人介绍。项目封面是 CSS 概念视觉，不是未经提供的产品截图；详情中明确说明。
- 首屏与回顶按钮使用 250ms 加速展开、650ms 减速收束的圆形转场。鼠标滚轮、触摸滑动使用原生滚动。
- 原生 dialog 支持 Escape 关闭、键盘焦点约束与关闭后返回触发按钮。提供循环动效暂停、系统减少动态效果支持、跳转主内容链接与焦点样式。
- 联系方式保留原站邮箱、微信和小红书账号。邮箱使用 mailto，未接入消息提交后端。
- 本地 WebP 图片用于页面，原始图片仍保留。英文 Archivo 字体本地加载；中文使用设备字体，字形会随平台略有变化。原有大体积中文字体不再加载。

修改页面内容：`index.html`。修改案例正文：`motion.js` 中的 `projects`。修改颜色、间距、断点：`styles.css`。不要将生成的截图与备份目录一同发布；上线仅需 index.html、styles.css、motion.js 与页面实际引用的 assets 文件。

## 验证与回退

浏览器验收脚本：`tools/verify-editorial.cjs`，使用本机已有 Playwright / Chromium；跨机器运行需修改脚本顶部的依赖与浏览器路径。检查桌面和移动截图、320/390/768/1920px 横向溢出、案例弹窗、圆形导航、能力展开、联系方式复制与减少动态效果模式。结果写入 `review-editorial/verification.json`。

改造前的 index.html、styles.css、motion.js 和 README.md 保存在 `rollback-backups/editorial-20260906-091751/`。将这四个文件复制回根目录即可还原本次改造前的入口。

设计参照：[Awwwards Portfolio](https://www.awwwards.com/websites/portfolio/)。这是以高标准作品集为目标的本地改造，尚未部署、提交评奖，也没有获得任何奖项认证。
