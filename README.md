# 生活构想

分享家装知识、材料观察与产品体验。

网站：https://aiellochan.github.io/notes/

## 本地运行

需要 Node.js 22 或更新版本，无第三方构建依赖。

```sh
npm test
npm start
```

默认预览地址为 http://localhost:4182/notes/ 。可以用 `PORT=4184 npm start` 更换端口。

## 内容

`site/notes.json` 是正式发布清单，保留原始标题、正文、标签与图片顺序。原图放在 `site/assets/<内容ID>/`，使用 3:4 比例，不裁切图文。正文和图片校验值会在构建时验证。仅发布清单列出的图片进入网站构建结果。

首版包含《索尼T999先看懂七只音箱》，18 张原图；尚未确认可发布的本地样本不进入仓库与线上构建。

字体许可证位于 `site/fonts/`。首页材质图为 AI 生成的品牌概念图，页面保留该标识。内容中的品牌产品图片属于对应权利人，不宣称为本团队拍摄。

## 部署

推送到 `main` 后，GitHub Actions 运行发布检查并部署 `dist/` 到 GitHub Pages。默认路径为 `/notes/`；如需根域名部署，使用 `BASE_PATH=/ npm run build`。
