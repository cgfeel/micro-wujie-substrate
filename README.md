# micro-wujie-substrate

一个 `wujie` 基座，完整内容查看微前端主仓库：https://github.com/cgfeel/zf-micro-app

`wujie` 和其他的微前端（`qiankun`、`micro-app`）解决方案不同点：

| 对比项｜`wujie` | 其他微前端 |
| --------------- | ---------- | ------ |
| `js`｜`wujie`   | 其他微前端 |
| ------          | ------     | ------ |

- `js`：其他微前端放到自己实现的沙箱，如：`proxy`、快照中实现，`wujie` 直接放到 `iframe` 里
- `css`：其他微前端通过修改作用域 `scopedCSS`
