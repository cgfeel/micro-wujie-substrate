# micro-wujie-substrate

一个 `wujie` 基座，完整内容查看微前端主仓库：https://github.com/cgfeel/zf-micro-app

`wujie` 和其他的微前端（`qiankun`、`micro-app`）解决方案不同点：

| 对比项 | `wujie`                                        | 其他微前端                                  |
| ------ | ---------------------------------------------- | ------------------------------------------- |
| `js`   | 直接放到 `iframe` 里                           | 放到自己实现的沙箱，如：`proxy`、快照中实现 |
| `css`  | 直接放到 `web component` 通过 `shadowDOM` 渲染 | 修改 `css` 作用域 `scopedCSS`               |

优点，效率高：

- 不需要自定义沙箱，直接使用 `iframe` 天然隔离
- 不需要遍历 `css` 计算 `scoped`

亮点：

- 理论上 `wujie` 可以把任何对外提供访问的网页做成子应用
- 提供 `iframe` 降级方案，对于不支持 `proxy` 和 `shadowDOM` 的情况

缺点：

- 对 `React v18` 并不友好，严格模式下会产生协议错误 [[查看](https://github.com/Tencent/wujie/issues/672)]
- 路由同步并不友好，子应用路由只能通过 `hash` 反应到主应用中，目前还没看到解决方案

渲染原理：

| 分类        | 原理                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| `wujie`     | 拉取 `template` 放入 `web component`，将自定义组件插入 `Dom`                |
| `micro-app` | 创建一个 `web component` 拉取资源，替换标签为自定义组件插入 `Dom`           |
| `qiankun`   | 基于 `single-spa`，拉取 `template`，劫持 `url` 经过计算将资源渲染到指定容器 |

> `micro-app` 也支持 `shadowDom` 和 `iframe` 沙箱，但需要手动启用

---

本次总结分成 3 个部分

- `wujie` 使用
- `wujie` 复现，简单实现 `iframe` 和 `shadowRoot` 通信
- `wujie` 原理

关于 `wujie` 所有的项目全部整合在：

- `/wujie` [[查看](https://github.com/cgfeel/zf-micro-app/tree/main/wujie)]

## `wujie` 使用

包含项目：

- `react-project`：通过 `create-react-app` 搭建的子应用 [[查看](https://github.com/cgfeel/micro-wujie-app-cra)]
- `substrate`：通过 `create-react-app` 搭建的基座主应用 [[查看](https://github.com/cgfeel/micro-qiankun-substrate)]
- `vue-project`：通过 `vue-cli` 搭建的子应用 [[查看](https://github.com/cgfeel/micro-wujie-app-vue3)]

### 搭建基座主应用

先回顾下 `micro-app` 基座流程：

- 入口文件 `start`
- 指定页面插入自定义组件 `<micro-app />`

> `micro-app` 会将加载的资源传入 `web component`

`wujie` 可以不使用 `start` 启动配置：

- 创建一个公共的组件 `Wujie.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/components/Wujie.tsx)]，通过 `startApp` 将 `web component` 添加的子应用插入指定的 `ref`
- 任何页面可以通过调用组件的方式，例如加载 `react` 子应用 [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/ReactPage.tsx)]

> `wujie` 不需要强制启动配置，但并不代表不支持，见 `setupApp` [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

珠峰的课程中有两个错误：

- 官方文档不建议手动注销 `destroyApp` 子应用，如果还需要使用子应用的话 [[查看](https://wujie-micro.github.io/doc/api/destroyApp.html)]
- `startApp` 会返回一个方法 `destory`，可以直接用于注销应用，而不用传给 `destroyApp`，同样也不建议主动注销，会导致下次打开该子应用有白屏时间

### 搭建子应用

`react` 子应用：

- 需要修改端口号：`.env` [[查看](https://github.com/cgfeel/micro-wujie-app-cra/blob/main/.env)]

`vue` 子应用：

- 需要允许 `cors`：`vue.config.js` [[查看](https://github.com/cgfeel/micro-wujie-app-vue3/blob/main/vue.config.js)]

`wujie` 配置相对来说更简单，但是它存在两个致命的缺点：

- 对 `React v18` 并不友好、路由同步只能使用 `hash`

> 路由同步这块我翻了官方文档，还没有找到解决方法，这点我自己都有点不太相信

通过以上了解对 `wujie` 初步印象：

- `Tencent` 真的对通信非常偏爱，比如：`alloy-worker` [[查看](https://github.com/AlloyTeam/alloy-worker)]，还有小程序 `postMessage`
