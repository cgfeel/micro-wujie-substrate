# micro-wujie-substrate

一个 `wujie` 基座，完整内容查看微前端主仓库：https://github.com/cgfeel/zf-micro-app

`wujie` 和其他的微前端（`qiankun`、`micro-app`）解决方案不同点：

| 对比项 | `wujie`                                        | 其他微前端                                  |
| ------ | ---------------------------------------------- | ------------------------------------------- |
| `js`   | 直接放到 `iframe` 里                           | 放到自己实现的沙箱，如：`proxy`、快照中实现 |
| `css`  | 直接放到 `web component` 通过 `shadowDOM` 渲染 | 修改 `css` 作用域 `scopedCSS`               |
