# micro-wujie-substrate

一个 `wujie` 基座，完整内容查看微前端主仓库：https://github.com/cgfeel/zf-micro-app

`wujie` 和其他的微前端（`qiankun`、`micro-app`）解决方案不同点：

| 对比项 | `wujie`                                        | 其他微前端                                  |
| ------ | ---------------------------------------------- | ------------------------------------------- |
| `js`   | 直接放到 `iframe` 里                           | 放到自己实现的沙箱，如：`proxy`、快照中实现 |
| `css`  | 直接放到 `web component` 通过 `shadowDOM` 渲染 | 修改 `css` 作用域 `scopedCSS`               |

优点，天然隔离：

- 不需要自定义沙箱，直接使用 `iframe`
- 不需要遍历 `css` 计算 `scoped`

亮点：

- 理论上 `wujie` 可以把任何对外提供访问的网页做成子应用
- 提供 `iframe` 降级方案，对于不支持 `proxy` 和 `shadowDOM` 的情况

缺点：

- 对 `React v18` 并不友好，严格模式下会产生协议错误 [[查看](https://github.com/Tencent/wujie/issues/672)]
- 路由同步并不友好，子应用路由只能通过 `hash` 反应到主应用中，目前还没看到解决方案

疑惑：

- 频繁的草哟 `Dom` 是 H 直接影响 `js` 性能的原因
- 目前微前端框架都会有设置到，但 `wujie` 需要频繁劫持 `iframe` 和 `shadowDom` 进行通信
- 比如说默认情况下 `wuijie` 的每次应用切换，就是一次 `iframe` 的注销和重建

渲染原理：

| 分类        | 原理                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| `wujie`     | 拉取 `template` 放入 `web component`，将自定义组件插入 `Dom`                |
| `micro-app` | 创建 `web component` 拉取资源，替换标签为自定义组件，展示在 `Dom tree` 中   |
| `qiankun`   | 基于 `single-spa`，拉取 `template`，劫持 `url` 经过计算将资源渲染到指定容器 |

> `micro-app` 也支持 `shadowDom` 和 `iframe` 沙箱，但需要在 `start` 时手动启用

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

- 入口文件 `start` 配置启动项
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

### 总结

`wujie` 配置相对来说更简单，但是它存在两个致命的缺点：

- 对 `React v18` 并不友好、路由同步只能使用 `hash`

> 路由同步这块我翻了官方文档，还没有找到解决方法，这点我自己都有点不太相信

通过以上了解对 `wujie` 初步印象：

- `Tencent` 真的对通信非常偏爱，比如：`alloy-worker` [[查看](https://github.com/AlloyTeam/alloy-worker)]，还有小程序 `postMessage`

---- 分割线 ----

## `wujie` 复现

简单实现 `iframe` 和 `shadowRoot` 通信，详细见项目中的源码：

- 项目：`static-project` [[查看](https://github.com/cgfeel/micro-wujie-app-static)]
- 文件：`index.html` [[查看](https://github.com/cgfeel/micro-wujie-app-static/blob/main/index.html)]
- 运行方式：直接点开浏览器预览

整体分 4 部分：

- `index.html`：基座 `html` 文件
- `template`：子应用要运行的 `css` 和 `html`，要放入 `shadowDOM` 中
- `script string`：子应用要执行的脚本字符，要放入 `iframe` 中
- `web component`：主应用自定义组件

流程分 4 部分：

1. `createSandbox`：创建沙箱
2. `attachShadow`：创建 `shadowDom`
3. `injectTemplate`：将 `css` 和 `html` 注入 `shadowDom`
4. `runScriptInSandbox`：将 `js` 注入 `iframe`

沙箱分 2 个：

- `shadowRoot`：直接将 `css` 和 `html` 全部打包到一个 `div`，塞入 `shadowRoot`
- `iframe`：创建一个 `script` 元素，将执行的 `js` 作为元素内容插入 `iframe` 的 `head`

难点，劫持 `iframe` 内 `script` 的方法，将上下文指向 `shadowRoot`：

- 在 `script` 插入到 `iframe` 之前，通过 `Object.defineProperty` 劫持 `iframe` 中的 `document.querySelector`
- 返回一个 `Proxy` 对象，代理 `sandbox.shadowRoot.querySelector`
- 在 `Proxy` 中通过 `apply` 纠正上下文 `this` 指向 `shadowDOM` 进行通信

`Object.defineProperty` 劫持对象会执行两次 [[查看](https://github.com/cgfeel/micro-wujie-app-static/blob/d89ae52aa0418d9f7e3cec8ff289cd8dd5edbb1e/index.html#L80)]，第一次：

- 由 `iframe` 中的子应用发起 `document.querySelector`
- 通过 `Object.defineProperty` 劫持 `iframeWindow.Document.prototype` 并返回 `Promise` 对象
- 在 `Promise` 对象首次 `apply` 时，参数 `thisArgs` 指向 `Object.defineProperty` 劫持的对象
- 并返回 `thisArgs.querySelector`，相当于 `iframeWindow.Document.prototype.querySelector`，通过 `apply` 将上下文指向 `sandbox.shadowRoot`

第二次：

- 由于返回的对象再次调用了 `iframe` 对象的 `querySelector`，于是第二次进入 `Object.defineProperty`
- 这个时候返回的 `Promise` 对象 `apply` 中 `thisArgs` 指向 `sandbox.shadowRoot`
- 于是相当于在 `shadowDOM` 中执行了 `sandbox.shadowRoot.querySelector.apply(sandbox.shadowRoot, args)`

> 可以打开调试窗口 `sources` 在 `Proxy` 对象的 `apply` 方法中打上断点，刷新查看每次执行的上下文 `thisArgs` 的变化

劫持对象场景发散：

- 浮窗，劫持到全局的 `window` 去执行：`document.body.appendChild(document.createElement())`
- `iframe` 中的路由管理 `history.pushState`，将这些方法同步到主应用

---- 分割线 ----

## `wujie` 原理

和 `qiankun` 解读一样，为了便于阅读全部以当前官方版本 `9733864b0b5e27d41a2dc9fac216e62043273dd3` [[查看](https://github.com/Tencent/wujie/tree/9733864b0b5e27d41a2dc9fac216e62043273dd3)] 为准

> 这一章节链接指向官方仓库，由于内容比较长，每一条信息我都暴露了关键的对象名，可以打开链接复制关键的对象名，查看上下文对照理解。

先大致看下 `wujie` 提供的包，分别为 [[查看](https://github.com/Tencent/wujie/tree/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages)]：

- `wujie-core`：核心包 [[查看](#定义-web-component)]
- `wujie-react`：`React` 封装组件 [[查看](#packages---wujie-react)]
- `wujie-vue2`：`Vue2` 封装组件
- `wujie-vue3`：`Vue3` 封装组件

> 不是 `vue` 技术栈，所以这里暂且略过，`wujie` 封装的组件包是作为可选使用

### 定义 `web component`

`wujie` 和 `micro-app` 组件定义不同处：

| 分类                       | `micro-app`                                                                                                                                                                                       | `wujie`                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 挂载方式                   | 手动：挂载 `web component` 到指定 `components tree` 中渲染                                                                                                                                        | 自动：初次激活 `active` 应用时通过 `createWujieWebComponent` 自动创建容器渲染到指定容器，见：挂载子应用 [[查看](挂载子应用)] |
| 自定义组件名               | 支持                                                                                                                                                                                              | 不支持                                                                                                                       |
| 接受的属性                 | `name`、`url`、`iframe` 等配置，见：文档 [[查看](https://micro-zoe.github.io/micro-app/docs.html#/zh-cn/configure?id=%e9%85%8d%e7%bd%ae%e9%a1%b9)]                                                | 仅支持 `WUJIE_APP_ID`                                                                                                        |
| `attributeChangedCallback` | 检查子应用 `name` 和 `url` 属性变更 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#11-attributechangedcallback-%E8%A7%82%E5%AF%9F%E5%B1%9E%E6%80%A7%E4%BF%AE%E6%94%B9)] | 不支持，但是子应用的 `name` 和 `url` 可以作为 `React` 组件的 `props`，更新后重新渲染并挂载到容器                             |
| `connectedCallback`        | 声明组件自增变编号添加到组件映射表、发起应用挂载                                                                                                                                                  | 根据 `name` 属性拿到实例：为沙箱 `iframeWinow` 打补丁、将当前组建指向实例的 `shadowRoot`                                     |
| `disconnectedCallback`     | 用组件编号从组件映射表中下线、发起应用卸载                                                                                                                                                        | 根据 `name` 属性拿到实例并发起卸载                                                                                           |
| 自定义更新规则             | 不接受，更新规则组件内部定义好了则                                                                                                                                                                | 由开发人员自己决定，一旦更新应用就一定是重新渲染                                                                             |
| 其他用途                   | 应用通信、资源容器、派发事件、决定启动和注销方式                                                                                                                                                  | 资源容器                                                                                                                     |
| 优缺点                     | 强大，但功能上 `MicroAppElement` 处理完之后 `CreateApp` 还要做一遍对应操作，如：组件和应用分别 `mount`                                                                                            | 简单，开发者几乎不用关心 `web component` 的存在                                                                              |

加载 `WujieApp` 自定义组件方式：

- 在入口文件中直接调用 `defineWujieWebComponent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L170)]
- 当引入 `startApp` 的时候，就已经定义好了 `web component`

关于 `defineWujieWebComponent`：

目录：`shadow.ts` - `defineWujieWebComponent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L39)]

只提供了两个方法：

- `connectedCallback`：完成挂载将自身设置为 `shadowDOM`，通过应用名获取实例 `sandbox`，将自身作为实例的 `shadowRoot`
- `disconnectedCallback`：卸载组件通过应用名获取实例 `sandbox`，并调用实例 `unmount`

在挂载组件时，将自身作为实例 `shadowRoot` 之前需要通过 `patchElementEffect` 打补丁：

- 根据沙箱 `iframe` 的 `proxyLocation` 去定义 `shadowRoot` 的 `baseURI`
- 将 `ownerDocument` 指向 `iframe` 沙箱的 `iframeWindow.document`
- 告知已补丁 `_hasPatch`，不再需要补丁
- 通过 `execHooks` 遍历 `plugins`，提取 `patchElementHook` 将 `shadowRoot` 和沙箱 `iframe` 传递过去挨个执行

### `startApp` 启动流程

目录：`index.ts` - `startApp` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L185)]

分 3 步：

1. 获取、更新配置信息
2. 存在沙箱实例就切换或销毁应用
3. 不存在沙箱实例或被销毁的应用，创建新的沙箱实例

切换应用分为 3 个情况：

1. `alive` 保活模式启动
2. 子应用通过 `window.__WUJIE_MOUNT` 发起渲染
3. 其他方式都注销当前实例

详细见文档：运行模式 [[查看](https://wujie-micro.github.io/doc/guide/mode.html)]

![企业微信截图_69bf2b27-521a-451b-9413-fa370efe73bd](https://github.com/cgfeel/micro-wujie-substrate/assets/578141/c4473f5d-9845-4df4-bac6-4506f8202a3d)

> `alive` 模式和子应用 `mount` 切换应用后会直接返回，其他情况销毁应用后会重新创建实例，如果你的应用在切换时看到白屏建议使用 `alive` 或 `mount`

#### 1.1 `getWujieById`：获取已存在的沙箱的实例

- 使用应用名，从映射表 `idToSandboxCacheMap` 获取沙箱中的实例，如果沙箱不存在返回 `null`
- 目录：`common.ts` - `getWujieById` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L15)]

添加映射表有 2 个方法，分别为：

- `addSandboxCacheWithWujie` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L23)]：收集 `Wujie` 实例对象，收集在每个映射对象的 `wujie` 属性
- `addSandboxCacheWithOptions`：收集 `setupApp` 设置应用信息，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]，收集在每个映射对象的 `options` 属性

使用 `addSandboxCacheWithWujie` 只有 1 处调用；

- `Wujie` 构造函数 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L532)]

创建 `Wujie` 实例有 2 个地方：

- `preloadApp`：预加载，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/preloadApp.html)]
- `startApp`：启动应用，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

使用 `addSandboxCacheWithOptions` 只有一处：

- `setupApp` 缓存子应用配置 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L179)]

从这里可以知道：

- `preloadApp`：预加载可以极大的提升子应用首次打开速度
- `startApp`：只要应用名和链接没变，通过组件重复插入子应用不会重复创建实例
- `setupApp`：可以预先为 `startApp` 和 `preloadApp` 提供信息

关于映射表 `idToSandboxCacheMap`：

- 一个 `Map` 对象：`new Map<String, SandboxCache>()`，应用名为 `key`，实例为 `SandboxCache`
- `SandboxCache` 包含 2 个属性：`wujie`：`Wujie` 类的实例，`options`：分别来自 `preloadApp` 和 `startApp` 配置信息
- `getWujieById` 获取的就是 `wujie` 实例

#### 1.2 获取应用配置

`getOptionsById` 获取配置信息：

- 拿应用名，从映射表 `idToSandboxCacheMap` 获取实例配置 `options`，不存在返回 `null`

`mergeOptions` 合并配置配置：

- 将 `startApp` 拿到的 `options` 和已存在实例的 `options` 合并得到新的配置信息，并结构提取必要的信息，见源文件 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L190)]

#### 2. 存在沙箱实例，切换应用

应用场景：

| 模式         | `preloadApp` 后初次加载                                  | 切换已加载的应用         |
| ------------ | -------------------------------------------------------- | ------------------------ |
| `alive` 模式 | 支持                                                     | 支持                     |
| `mount` 模式 | 不支持，初次加载 `mount` 方法还没有挂载到 `iframeWindow` | 支持                     |
| 其他模式     | 将销毁应用后重新创建实例                                 | 将销毁应用后重新创建实例 |

渲染前的准备：

- 通过 `getPlugins` 更新实例的 `plugins`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#plugins)]
- 更新实例的 `lifecycles`， 见：文档 [[查看](https://wujie-micro.github.io/doc/guide/lifecycle.html)]
- 获取实例的 `iframeWindow` 对象，用于查看子应用挂载方法 `__WUJIE_MOUNT`
- 如果实例预加载应用，需要等待预加载执行完毕，见：`runPreload` [[查看](#3-预加载微任务-runpreload)]

#### 2.1 `alive` 保活模式切换应用

和 `micro-app` 的 `keep-alive` 模式一样：

- 优点：切换路由不销毁应用实例，路由、状态不会丢失，在没有生命周期管理的情况下，减少白屏时间
- 缺点：多个菜单栏跳转到子应用的不同页面，不同菜单栏无法跳转到指定子应用路由

流程分 3 步：

**第一步：激活应用**

- 将拿到的配置信息激活子应用：`active`，见：1. `active` 激活应用 [[查看](#1-active-激活应用)]

这里会有个问题：

- 场景：预加载应用后启动应用，每次切换应用
- 都会重复 `active` 激活应用，影响效率

原因：

- `active` 激活应用本身的意义就是将应用容器根据加载状态，在不同挂载点来回切换
- 这是 `wujie` 天然缺陷，但通常不会影响使用

**第二步：`start` 应用**

预加载但是没有 `exec` 启动的情况下需要 `start` 应用：

- 调用生命周期中的 `beforeLoad`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#beforeload)]
- 通过 `importHTML` 提取需要加载的 `script`，见：`importHTML` [[查看](#importhtml-加载资源)]
- 将提取的方法 `getExternalScripts` 传入应用 `sandbox.start` 启动应用 [[查看](#-start-启动应用)]

> 应用启动没有根据 `execFlag` 来判断

应用中的 `css` 在哪里处理？

- 其实在启动之前已经通过 `processCssLoader` [[查看](#processcssloader处理-css-loader)] 做了处理

`alive` 模式或 `umd` 模式下包含的场景：

- 预加载时替换应用资源通过 `active` 将 `template` 挂载到容器，待启动应用时将容器移动到指定 `el` 节点，`template` 不需要变更
- 初次启动应用通过 `active` 将 `template` 挂载到容器，下次切换应用时容器资源不变

其他模式往下看初始化应用实例

- 调用生命周期中的 `activated` 并返回子应用注销函数 `sandbox.destroy`

### `preloadApp` 预加载流程

目录：`index.ts` - `preloadApp` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L282)]

参数：`preOptions`，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/preloadApp.html)]

`preloadApp` 预加载通过 `requestIdleCallback` 在空闲时间处理，不处理的情况有 2 个：

- 应用实例已存在
- 当前的 `url` 挂载的应用中包含预加载的应用，无需预加载直接加载

整体分 3 步：

1. 获取配置
2. 声明一个应用实例 `sandbox`
3. 挂起预加载微任务 `runPreload`

#### 1. 获取配置

- 通过 `getOptionsById` 获取配置信息 `cacheOptions`
- 通过 `mergeOptions` 合并参数 `preOptions` 和 `cacheOptions`，优先采用 `preOptions`
- 从合并的 `options` 中提取配置用于预加载

> `cacheOptions` 存在于：
>
> - 通过 `startApp` 提前配置 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]，如果没有配置则不存在。
> - 配置信息只能通过 `startApp` 缓存

#### 2. 声明一个实例

- 将拿到的配置信息通过 `Wujie` 声明实例 `sandbox`
- 通过 `runPreload` 为实例挂起一个微任务 `preload`

> 微任务挂载在实例上 `sandbox.preload`，在应用切换时候会作为 `await`，这种方式和 `qiankun` 中的 `frameworkStartedDefer` 原理是一样的

#### 3. 预加载微任务 `runPreload`

- 使用 `iframeWindow` 调用生命周期 `beforeLoad`
- 通过 `importHTML` 获取：`template`、`getExternalScripts`、`getExternalStyleSheets`，见 `importHTML` [[查看](#importhtml-加载资源)]
- 通过 `processCssLoader` 将执行 `importHTML` 时，替换成注释的样式更新为对应的内联样式
- 激活应用 `active` [[查看](#-active-激活应用)]
- 根据配置 `exec` 决定是否启动应用 `start`

> 这里有个问题，当 `exec` 不成立时 `await getExternalScripts()` 没有任何效果，见：注 n `scriptResultList` [[查看](#5-队列前的准备)]

#### 4. 对比 `startApp` 的配置

只说几个关键性的配置

预加载缺少 `loading`：

- 预加载的应用不需要 `loading`，而 `startApp` 即便不传入 `loadinng` 的情况下也会插入一个空的 `loading`
- 无论插入 `loading` 与否，都会在资源注入容器前遍历并清空容器
- 不同的是：提供 `loading` 的 `startApp` 是在 `addLoading` 清空容器，预加载是通过 `active` 在 `renderElementToContainer` 清空容器 [[查看](#renderelementtocontainer将节点元素挂载到容器)]

预加载不需要提供挂载容器 `el`：

- 应用沙箱的 `iframe` 将作为临时的容器，应用会在激活时 `active` 注入 `iframe`
- 而 `iframe` 在页面中是不可见的，因此也看不到预加载的应用
- 在启动应用时 `active` 会从沙箱 `iframe` 取出来放入指定 `el` 中

在这里引发了一个思考：

- 把所有的子应用全部预加载到 `iframe` 中，会不会对基座的 `document` 产生影响
- 答案是不会，对此做了一个测试：10w 表单在 `document` 和 `iframe` 以及 `shadowDom` 下不同的表现 [[查看](https://codepen.io/levi0001/pen/xxoVLXx)]

#### 5. 通过 `exec` 预执行

- 仅 `preloadApp` 支持的配置项，`exec` 会在预加载时启动应用 `start`
- 和 `startApp` 一样，也会将子应用中的 `script` 插入沙箱 `iframe`，调用 `mount` 等相关事件和方法

在 `micro-app` 中也有预加载，区别在于：

| 分类                         | `micro-app`                                                  | `wujie`                                                  |
| ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| 加载方式                     | 通过 `start` 配置 `preFetchApps`，或通过 `microApp.preFetch` | 只能通过 `preloadApp`                                    |
| 仅加载静态资源               | 支持                                                         | 不支持                                                   |
| 将载静态资源解析成可执行代码 | 解析并处理资源，不渲染                                       | 将资源中的 `script` 和样式替换成注释，暂存在沙箱中不可见 |
| 执行代码并在后台渲染         | 支持                                                         | `active` 注入资源，`start` 启动应用                      |
| 关闭沙箱和样式作用域         | 可选                                                         | 不支持                                                   |
| 关闭子应用请求的自动补全     | 可选                                                         | 不支持                                                   |

- 预加载参考，见：`microApp.start` - 注 ⑥ [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#microappstart-%E5%90%AF%E5%8A%A8%E5%BA%94%E7%94%A8)]
- `wujie` 预执行主要体现在沙箱对预渲染的处理，见：2.3. `WithSandBox` 默认沙箱 - 看预渲染相关部分 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#23-withsandbox-%E9%BB%98%E8%AE%A4%E6%B2%99%E7%AE%B1)]

#### 6.预加载中的 `bug`

问题：

- 预加载 `alive` 模式的应用，默认 `exec` 不预执行，在 `startApp` 启动应用的时候生命周期 `activated` 会执行 2 次

为什么 2 次：

- `start` 应用时 `mount` 执行 1 次
- `start` 之后返回 `destory` 前执行 1 次

### `Wujie` 应用类

目录：`sandbox.ts` - `Wujie` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L50)]

用于创建一个应用实例，和 `micro-app` 的 `CreateApp` 是一样的：

| 分类           | `micro-app`                                                                                               | `wujie`                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 创建实例       | `CreateApp`：应用实例                                                                                     | `Wujie`：应用实例，也是沙箱实例                                          |
| 映射表         | `appInstanceMap` 存应用实例，和组件映射表不同                                                             | `idToSandboxCacheMap` 唯一映射表，组件挂载时通过 `name` 从映射表获取实例 |
| 映射表添加方式 | `appInstanceMap.set`                                                                                      | `addSandboxCacheWithWujie`                                               |
| 加载资源       | 自动：构造函数调用 `loadSourceCode`                                                                       | 手动：`active` 激活应用                                                  |
| 启动沙箱       | 构造函数调用 `createSandbox`                                                                              | 构造函数调用 `iframeGenerator`                                           |
| 沙箱支持       | `proxy`、`iframe`                                                                                         | `iframe`                                                                 |
| 手动 `start`   | 不支持手动启动，通过 `mount` 挂载                                                                         | `startApp` 或 `preloadApp` 时调用应用 `start` 方法                       |
| `mount` 应用   | 自动：由组件或资源加载完毕决定，在 `mount` 中会 `start` 沙箱                                              | 不支持外部调用，由 `start` 方法通过队列执行                              |
| `unmount` 应用 | 由组件 `disconnectedCallback` 发起                                                                        | 由组件 `disconnectedCallback` 发起                                       |
| 复杂度         | 分了 3 类，组件实例：`MicroAppElement`，应用实例：`CreateApp`，沙箱实例：`IframeSandbox` 或 `WithSandBox` | 只要关心实例 `Wujie`、组件实例几乎可以忽略                               |
| 优点           | 支持更广泛，支持多种沙箱，多个隔离方式                                                                    | 简单，专注 `iframe` 沙箱，支持降级处理                                   |
| 缺点           | 过于复杂，从语意上看，有的方法在 3 个实例上相互重叠，容易混淆，除此之外并不支持降级处理                   | 过于零散，缺乏逻辑抽象分离                                               |

> 无论是 `wujie` 还是 `micro-app` 在解读的分支源码中都存在不同的逻辑问题

#### 📝 `active` 激活应用

分 2 部分：

1. 更新配置应用信息，包含：沙箱 `iframe` 初始化、修正 `fetch`、同步路由
2. 挂载子应用

挂载子应用又可以分为 3 种情况：

1. `degrade` 主动降级渲染
2. 切换应用
3. 应用初始化，包含：正常加载、预加载

有 4 种情况会 `active` 激活应用：

- `startApp` 切换 `alive` 保活模式的应用
- `startApp` 切换 `umd` 模式的应用
- `startApp` 创建新的应用实例
- `preloadApp` 预加载应用

在 `active` 激活应用时容器节点变更有 4 种情况：

| 容器        | `degrade` 降级 | `el` 容器挂载点 | 包含场景                   | 容器挂载位置    |
| ----------- | -------------- | --------------- | -------------------------- | --------------- |
| `iframe`    | `true`         | 没有            | 预加载应用、初次启动应用   | 沙箱 `iframe`   |
| `iframe`    | `true`         | 已提供          | 预加载后启动应用、切换应用 | `el` 容器挂载点 |
| `shadowDom` | `false`        | 没有            | 预加载应用、初次启动应用   | 沙箱 `iframe`   |
| `shadowDom` | `false`        | 已提供          | 预加载后启动应用、切换应用 | `el` 容器挂载点 |

> 每次 `active` 会根据当前情况来选择容器和挂载的节点

#### 先看激活应用的 `bug`

问题 1：启动应用不提供 `el` 容器

- 虽然在 `ts` 规范里已明确要求必须提供 `el` 容器，但是如果 `ignore` 或 `js` 项目就没提供怎么办呢？

触发情况：

- 受影响：切换 `shadowDom` 容器的应用
- 不受影响：预加载、没有预加载初次启动、降级处理，会将沙箱 `iframe` 作为备用容器

问题 2：`preloadApp` 提供 `el` 容器，但不提供 `exec` 执行

- 既然提供 `el` 挂载点，那么无论是 `iframe` 降级还是 `shadowDom`，都会将容器挂载到 `el` 节点
- 不提供 `exec` 去队列将应用 `script` 注入沙箱
- 假定 `el` 当前是一个可见节点，那么会看到一个没有 `script` 的应用

解决办法：

- 和 `micro-app` 一样做条件判断，条件不满足的情况直接返回不做任何渲染

#### 1. 更新配置应用信息

第一步：更新配置信息

- 将 `props` 拿到的信息更新当前实例

其中 `this.replace` 需要说明下：

- 来自：`startApp`、`setupApp`、`preloadApp` 配置 `replace`，详细见文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#replace)]
- 用于替换已提取应用的 `script` 内容
- 在激活应用时在分别在 `renderTemplateToIframe` 或 `renderTemplateToShadowRoot` 中调用 `patchRenderEffect` 为渲染的 `document` 打补丁
- 在 `patchRenderEffect` 内部会通过 `rewriteAppendOrInsertChild` 重写相应的方法
- 在 `rewriteAppendOrInsertChild` 中通过 `insertScriptToIframe` 在容器内插入脚本

`this.replace` 并非必要的，不需要替换就不用提供，之所以在这里提一下是为了介绍 `insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)]

> 在官方文档中说，`replace` 用于 `html`、`js`、`css`，回调的参数只有 `code`，拿不到具体的类型，只能根据具体代码进行替换

第二步：等待 `iframe` 初始化 `await this.iframeReady`

> 关于 `iframeReady`：
>
> 目录：`iframe.ts` - `iframeGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L815)]
>
> - 目的用于确保 `iframe` 初始化
> - 在 `Wujie` 实例构造函数时 `iframeGenerator` 已发起了 `stopIframeLoading` 微任务
> - 在激活时通过 `this.iframeReady` 确保已完成了初始化
> - 保活的情况下切回应用可能不需要考虑，除此之外在应用加载也需要通过 `active` 来激活应用，这个时候 `frameworkStartedDefer` 就很有用了
>
> 在 `qiankun` 中有一个 `frameworkStartedDefer`，和 `iframeReady` 用途是一样的

第三步：动态修改 `fetch`

- 替换 `fetch` 为自定义函数，在函数内部使用 `getAbsolutePath` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L206)] 将 `url` 结合 `baseurl`
- 将替换的 `fetch` 作为 `iframe` 的 `fetch`，并更新实例缓存下来，以便下次获取

第四步：同步路由

- `syncUrlToIframe` 先将路由同步到 `iframe`，然后通过 `syncUrlToWindow` 同步路由到浏览器 `url`
- 同理当 `wujie` 套 `wujie` 的时候也会优先同步 `iframe` 中的子应用

> 如果子应用已启动，又是 `alive` 模式，切换应用重新激活不需要 `syncUrlToIframe`

第五步：通过 `template` 更新 `this.template`，为后面渲染应用做准备

#### 2. `degrade` 主动降级渲染

概述：

- 采用 `iframe` 替换 `webcomponent`，`Object.defineProperty` 替换 `proxy`
- 对于不支持的环境会自动降级，除此之外还可以通过 `degrade` 主动降级
- 一旦采用降级方案，弹窗由于在 `iframe` 内部将无法覆盖整个应用
- 关联属性 `degradeAttrs`，配置详细见 `start` 文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

主动降级分 3 个部分：

1. 创建 `iframe` 并挂载到容器
2. 销毁沙箱记录，为创建的 `iframe` 新容器打补丁
3. 注入 `template` 渲染

> 为了便于理解在“1.2. 主动降级渲染”描述中 `iframeBody` 指沙箱 `iframe` 的 `body`，新创建的 `iframe` 称作“新容器”，用于代替 `web component`。

渲染分 3 种情况：

1. `alive` 模式切换应用
2. 非 `alive` 模式切换应用
3. 初次渲染

> 在这里通过 `this.document` 来区分是切换应用还是初次加载

第一步：创建 `iframe`

- `rawDocumentQuerySelector` 获取 `window` 或子应用内的 `iframeBody`
- `initRenderIframeAndContainer` 创建一个新的 `iframe` 用于代替 `shadowDom`
- 优先挂载 `iframe` 到指定容器，不存则在挂载到 `iframeBody`

> `initRenderIframeAndContainer` 内部做了两件事：i. 创建 `iframe` 并写入 `attrs`，ii. 渲染到容器后重写 `iframe` 的 `document`

第二步：更新容器，销毁 `iframeBody`

- 将挂载的容器更新为 `this.el`
- `clearChild` 销毁 `js` 运行 `iframeBody` 容器内部 `dom`
- `patchEventTimeStamp` 修复 `vue` 的 `event.timeStamp` 问题

> `onunload` 可以不用考虑，源码只做了声明没有调用

第三步：`分支 1` - `alive` 模式下切换应用

- 恢复 `html`：将之前记录子应用的 `<html>` 替换“新容器”的 `<html>`
- 在保活场景恢复全部事件：`recoverEventListeners` 注 n (`recoverEventListeners`)

> 注 n：`recoverEventListeners` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L324)] 遍历节点时，“新容器”已替换了 `html` 节点
>
> - 声明一个新的 `elementEventCacheMap` 用于收集筛选的事件
> - 通过 `iframeBody` 拿到沙箱实例 `sandbox`
> - 通过 `TreeWalker` 遍历 “新容器”的 `<html>`，每个节点对象为 `nextElement`
> - 从 `sandbox.elementEventCacheMap` 获取每个元素的事件集合
> - 遍历集合塞入新的 `elementEventCacheMap`，同时为 `nextElement` 添加事件监听
> - 最后将过滤后的事件更新沙箱实例中的 `sandbox.elementEventCacheMap`

第三步：`分支 2` - 非 `alive` 模式下切换应用

- 通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` 中，注 n (`renderTemplateToIframe`)
- `recoverDocumentListeners` 非保活场景需要恢复根节点的事件，防止 `react16` 监听事件丢失，注 n (`recoverDocumentListeners`)

> 注 n：`renderTemplateToIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L252)]
>
> - 通过 `renderTemplateToHtml` 使用 `iframeWindow` 创建一个 `html` 根元素
> - 并把 `template` 注入 `html` 元素并返回元素对象
> - 通过 `processCssLoaderForTemplate` 处理 `html` 中的 `css-before-loader` 以及 `css-after-loader`，详细见插件系统 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-before-loaders)]
> - 将处理后的 `processedHtml` 替换“新容器”的 `html`
> - 劫持 `iframe` 中的 `html` 使其 `parentNode` 可枚举 `enumerable`，可修改值 `configurable`，调用方法时指向 `iframeWindow.document`，关于对象的属性劫持见上方复现 [[查看](#wujie-复现)]
> - 通过 `patchRenderEffect`，重写了“新容器”的 `head`、`body` 的事件、`appendChild` 和 `insertBefore` 等方法
>
> `patchRenderEffect` 为“新容器” 打补丁
>
> - 用于子应用中动态操作 `Dom`，比如：`appendChild` 和 `insertBefore`
> - 在子应用动态添加 `script` 时，会通过 `insertScriptToIframe` 添加到沙箱的 `iframe` 中
>
> 补充说明：为什么要通过沙箱创建 `html` 元素，而不是直接注入 `template`
>
> - 在 `renderTemplateToHtml` 中需要通过 `iframeWindow` 获取 `sandbox` 实例
> - 将 `html` 元素的 `head` 和 `body` 分别指向实例

> 注 n：`recoverDocumentListeners` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L348)] 原理和 `recoverEventListeners` 注 n，不同在于：
>
> - `recoverDocumentListeners` 用于恢复根节点 `documen` 事件
> - 声明一个 `elementEventCacheMap` 用于记录新的事件
> - 将之前记录的应用 `<html>` 绑定的事件取出来，添加到“新容器”的 `<html>` 中
> - 最后用 `elementEventCacheMap` 更新 `sandbox.elementEventCacheMap`

第三步：`分支 3` - 初次渲染

- 通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` 中，注 n (`renderTemplateToIframe`)

最后：

- 无论哪种方式渲染，都将“新容器”的 `document` 作为当前实例的 `document`，方便下次切换应用 `active` 时直接使用。
- 至此整个降级过程完成，直接返回不再执行下面流程

#### 3. 挂载子应用：切换、初始化、预加载

第一步：挂载子应用到容器

`degrade` 主动降级通过 `this.document` 来区分切换应用和初次加载，而挂载应用通过 `this.shadowRoot` 来区分，如下有 3 个分支。

分支 1：切换应用

- 通过 `renderElementToContainer` [[查看](#renderelementtocontainer将节点元素挂载到容器)] 将 `this.shadowRoot.host` 挂载到指定容器
- 如果是 `alive` 模式跳出来，以下流程不再继续

> `this.shadowRoot.host`：
>
> - 指的是 `shadowRoot` 外层的 `web component`
> - 而 `this.shadowRoot` 是在组件 `connectedCallback` 时定义为组件的 `shadowRoot`
> - 在 `active` 模式下切换应用，`shadowRoot` 的 `template` 已在初始化时注入，所以激活后可以直接返回
> - 而非 `active` 模式下切换应用，会再次更新 `template`

分支 2：应用初始化

- 先获取 `iframeBody`，如果容器不存在时作为备用容器
- 通过 `createWujieWebComponent` 创建自定义组件
- 通过 `renderElementToContainer` [[查看](#renderelementtocontainer将节点元素挂载到容器)] 将创建的组件挂载到指定容器

> 从这里可以知道：
>
> - 初始化应用是创建一个 `web component`，挂载到指定容器
> - 创建组件时，通过 `defineWujieWebComponent` 会配置 `this.shadowRoot`
> - 这样下次切换再激活应用时会通过：`分支 1` 的流程

分支 3： 预加载应用

- 预加载应用是不需要指定容器用来挂载应用，所以会挂载到沙箱的 `iframeBody` 中
- 等到切换应用的时候，`this.shadowRoot` 已经存在，会直接将组件重新 `appendChild` 到 `shadowRoot`

> 拓展阅读：`renderElementToContainer` [[查看](#renderelementtocontainer将节点元素挂载到容器)]，通过这个函数来了解加载应用时 `loading` 处理

第二步：通过 `renderTemplateToShadowRoot` 将 `template` 渲染到 `shadowRoot`

和 `renderTemplateToIframe` 注 n (`renderTemplateToIframe`) 原理一样：

- 相同点：将 `template` 注入沙箱的 `iframe`，提取出 `html` 元素通过 `processCssLoaderForTemplate` 进行处理
- 不同点：将处理后的 `processedHtml` 插入 `shadowRoot`
- 不同点：在 `processedHtml` 第一个子集前面插入一个全屏无边距的 `div`，用于撑开容器为屏幕大小，便于展示浮窗等元素
- 不同点：获取 `shadowRoot` 的头部和尾部分别指向沙箱的 `head` 和 `body`
- 部分相同：劫持 `shadowRoot.firstChild` 的 `parentNode` 指向 `iframeWindow.document`
- 部分相同：通过 `patchRenderEffect` 给 `shadowRoot` 打补丁

第三步：通过 `patchCssRules` 为子应用样式打补丁

`degrade` 主动降级不处理、已处理过不处理

1. 兼容 `:root` 选择器样式到 `:host` 选择器上
2. 将 `@font-face` 定义到 `shadowRoot` 外部

> 这里我有点没看明白沙箱中的 `iframe` 里的 `:root` 哪来的
>
> - `iframe` 是在构造函数里通过 `iframeGenerator` 创建的
> - 创建时可以通过 `startApp` 通过 `attrs` 设置 `style`，问题是 `:root` 不能直接写在元素 `style` 上
> - 剩下就是 `template` 注入，而 `iframe` 在这个环节只做了一件事，创建一个 `html` 元素挂载到 `shadowRoot` 上
> - 最后剩下主动降级 `degrade`，但创建使用的 `iframe` 和沙箱的 `iframe` 不是同一个

第四步：更新 `this.provide.shadowRoot`

- `this.provide` 就是子应用中全局对象的 `$wujie`，详细见文档：全局变量 [[查看](https://wujie-micro.github.io/doc/guide/variable.html)]
- 在实例构造时通过 `iframeGenerator` 创建 `iframe` 的同时使用 `patchIframeVariable` 将其注入 `iframeWindow`

#### 📝 `start` 启动应用

参数：

- `getExternalScripts`：返回一个要加载的 `script` 集合的函数

`start` 本身是一个返回 `Promise<void>` 异步函数：

- 但如果 `this.iframe` 被销毁的情况会直接返回不再处理，`this.iframe` 只有在销毁应用 `destroy` 设为 `null`，见 `destroy`

`start` 有 3 个地方调用：

- `startApp` 切换一个 `alive` 模式的子应用时，子应用未启动
- `startApp` 创建一个应用实例后
- `preloadApp` 预加载应用配置 `exec` 预执行

> 执行 `start` 启动应用前必须先 `active` 激活应用

#### 1. 收集队列

整个 `start` 的流程就是对 `this.execQueue` 队列的收集和提取并执行：

- 在队列中 `push` 的下标都是同步的执行函数，执行队列通过 `shift` 实现先入先出
- 在队列下标的每个函数中有可能存在微任务和宏任务，但执行顺序看所在执行的队列前后顺序
- 因为每个队列的执行都是在上一个队列调用过程中的提取

**`this.execQueue.push` 共计 7 处：**

- `beforeScriptResultList`：插入代码前
- `syncScriptResultList` + `deferScriptResultList`：同步代码
- `this.mount`：框架主动调用 `mount` 方法
- `domContentLoadedTrigger`：触发 `DOMContentLoaded` 事件
- `afterScriptResultList`：插入代码后
- `domLoadedTrigger`：触发 `loaded` 事件
- 返回 `promise`：所有的 `execQueue` 队列执行完毕，`start` 才算结束，保证串行的执行子应用

**有 1 处存在即执行：**

- `asyncScriptResultList`：异步代码

> 以上说明来自源码注释，可以直接复制关键词搜索；如果以上总结还没看明白没关系，请继续往下看

总共 8 处，然后根据用途还可以细分如下

**必须会添加到队列有 4 处：**

- `this.mount`、`domContentLoadedTrigger`、`domLoadedTrigger`、返回 `promise`

**根据集合添加到队列有 3 处：**

- `beforeScriptResultList`：见 `js-before-loaders` [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-before-loaders)]
- `afterScriptResultList`：见 `js-after-loader` [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-after-loader)]
- `syncScriptResultList` + `deferScriptResultList`：根据参数 `getExternalScripts` 提取子应用的 `script`

> `beforeScriptResultList` 和 `afterScriptResultList` 下标类型文档介绍有限，建议查看源码 `TS` 类型 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L22)]

**提取子应用的 `script`：**

通过 `getExternalScripts` 得到 `scriptResultList`，详细见：`importHTML` [[查看](#importhtml)]

声明 3 个集合：

- `syncScriptResultList`：同步代码
- `asyncScriptResultList`：`async` 代码无需保证顺序，所以不用放入执行队列
- `deferScriptResultList`：`defer` 代码需要保证顺序并且 `DOMContentLoaded` 前完成，这里统一放置同步脚本后执行

遍历 `scriptResultList` 根据属性分类添加到上述 3 个集合，关于属性见：`processTpl` 提取资源 [[查看](#processtpl-提取资源)]

**遍历的集合下标是 `promise` 有 2 处：**

- 同步和异步代码执行：`syncScriptResultList`、`asyncScriptResultList`
- 共同点：集合中的每一项函数执行并返回 `promise`、需要在微任务中执行 `insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)]
- 不同点：`syncScriptResultList` 需要等待队列按顺序提取执行，`asyncScriptResultList` 遍历同时立即发起微任务

#### 2. 执行队列

无论怎么添加，最终都是通过 `this.execQueue.shift()()` 从头部弹出插入队列的函数并执行

开始执行：

- 执行队列从 334 行开始 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L334)]，按照上下文主动提取并发起执行
- `asyncScriptResultList`：异步代码不加入队列，会以 `promise` 微任务的形式在当前上下文执行完毕后依次执行

循环插入队列共有 3 处：

- 分别是：`beforeScriptResultList`、`syncScriptResultList` + `deferScriptResultList`、`afterScriptResultList`
- 执行的通过 `insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)] 将 `window.__WUJIE.execQueue.shift()()` 注入容器
- 这样每个 `push` 添加的队列，会在容器中 `shift` 提取下一个任务并执行

同步代码 `syncScriptResultList` + `deferScriptResultList`：

- 每个队列都是一个 `promise` 微任务，在微任务中根据 `fiber` 决定立即执行还是通过 `requestIdleCallback` 空闲执行

> 无论是同步代码还是异步代码，在 `fiber` 情况下每个微任务执行过程中都会添加一个宏任务 `requestIdleCallback`，其顺序依旧是按照队列，提取一次执行一次

主动插入队列有 4 处：

- `mount`、`domContentLoadedTrigger`、`domLoadedTrigger`、返回的 `Promise` 实例函数中
- 这种情况会在执函数末尾添加 `this.execQueue.shift()?.();` 执行一次提取一次

如果 `fiber` 为 `true`（默认）：

- 循环插入队列：会在空闲时间 `requestIdleCallback` 执行 `insertScriptToIframe`
- 主动插入队列：会在空闲时间 `requestIdleCallback` 执行指定的函数
- 由于执行队列需要先提取队列，所以无论是宏任务还是微任务，都会是在任务方法执行过程中提取下一个队列再执行

> 在 `Wujie` 实例中通过 `this.requestIdleCallback` 执行空闲加载，它和 `requestIdleCallback` 的区别在于，每次执行前先判断实例是否已销毁 `this.iframe`

通过返回的 `Promise` 添加到末尾的队列：

- 只做一件事：执行 `resolve`，以便通知外部 `start` 完成

#### 3. 队列执行顺序

队列有 3 处微任务：

- `syncScriptResultList` + `deferScriptResultList`：同步代码
- `asyncScriptResultList`：异步代码
- 返回的 `promise` 对象

> 返回的 `promise` 对象用于 `start` 外部通知执行完毕，在 `start` 内部 `promise` 的函数是同步的，队列的执行需要通过上下文调用 `this.execQueue.shift`

`fiber` 开启的情况下有 7 处宏任务：

- 除了通过返回的 `promise` 插入末尾的队列，都会通过 `requestIdleCallback` 插入宏任务
- 其中 `syncScriptResultList` + `deferScriptResultList` 和 `asyncScriptResultList` 会在微任务中添加宏任务

无论 `this.fiber` 的值与否都是按照队列的顺序执行：

- 即便开启 `fiber` 状态下，每次都将调用的函数通过 `requestIdleCallback` 将其放入一个宏任务中执行
- 但是要执行下一个队列，就一定要在上一个宏任务中提取 `this.execQueue.shift` 并执行

不同的是：

- 开启 `fiber` 会将执行方法包裹在 `requestIdleCallback`，在浏览器空闲时交给下一个宏任务执行

执行顺序：

1. `asyncScriptResultList` 遍历异步代码，添加微任务等待执行，注 n (`asyncScriptResultList`)
2. 334 行开始执行第一个队列 `this.execQueue.shift()()`
3. 执行 `beforeScriptResultList`，如果存在的话
4. 执行 `syncScriptResultList` + `deferScriptResultList`，如果存在的话
5. 依次执行 `mount`、`domContentLoadedTrigger`
6. 执行 `afterScriptResultList`，如果存在的话
7. 执行 `domLoadedTrigger`
8. 执行返回的 `promise` 对象中添加的末尾的队列

> 注 n：`fiber` 模式下 `asyncScriptResultList` 执行顺序如下
>
> - 如果 `beforeScriptResultList` 存在，会在集合的宏任务之前执行，如果不存在继续往下
> - 如果 `syncScriptResultList` + `deferScriptResultList` 存在，会在集合的微任务之前执行，如果不存在继续往下
> - 如果以上都不存在，会在 `mount` 之前执行
>   - 因为 `fiber` 模式下 `mount` 是放在 `requestIdleCallback` 中作为下一个宏任务中
>   - 而 `mount` 是必须插入队列的方法，所以要执行 `mount` 方法以及后续队列，一定要执行下一个宏任务
>   - 要执行下一个宏任务一定要先执行当前宏任务中的 `asyncScriptResultList` 微任务集合
>
> 非 `fiber` 模式下，通过 `beforeScriptResultList` 循环插入队列集合，带有 `src` 的外联 `script`：
>
> - 虽然宏任务 `requestIdleCallback` 不存在
> - 但带有 `src` 的 `script` 会通过 `onload` 去调用 `window.__WUJIE.execQueue.shift()()`
> - `onload` 也是宏任务，会在当前宏任务下微任务结束后开始执行
>
> 非 `fiber` 模式下，存在同步代码：
>
> - 会在 `syncScriptResultList` + `deferScriptResultList` 集合的微任务之前执行
>
> 非 `fiber` 模式下，通过 `afterScriptResultList` 循环插入队列集合，带有 `src` 的外联 `script`：
>
> - 同 `beforeScriptResultList`
>
> 非 `fiber` 模式下，如果以上都不存在：
>
> - 会在 `start` 之后执行，但是这里存在一个 `bug`，见：4. `start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

除了 `asyncScriptResultList` 之外以上微任务宏任务都会按照队列执行顺序执行，因为要执行队列就必须在上一个队列任务中调用 `this.execQueue.shift()()`

> 一道思考题：在子应用中所有带有 `src` 的链接将被分类为“同步代码”和“异步代码”，这类 `script` 会怎样插入 `iframe`？这个问题会在下面解答：5. 队列前的准备 [[查看](#5-队列前的准备)]

**关于微任务队列：**

在 `micro-app` 有一个 `injectFiberTask`，见 `micro-app` 源码分析中注 ⑭ [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#13-extractsourcedom-%E6%88%90%E5%8A%9F%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90%E5%9B%9E%E8%B0%83)]，对比如下：

| 对比项   | `wujie`                                                      | `micro-app`                                                 |
| -------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| 添加队列 | 根据不同类型，手动添加每一组队列                             | `injectFiberTask`                                           |
| 集合对象 | `execQueue`                                                  | `fiberLinkTasks`                                            |
| 添加方式 | `push`                                                       | `push`                                                      |
| 执行方式 | `this.execQueue.shift()?.()`，在当前队列提取下一个队列并执行 | `serialExecFiberTasks`，通过 `array.redus` 拍平队列依次执行 |
| 立即执行 | `asyncScriptResultList`，遍历集合添加到微任务中执行          | `injectFiberTask`，提供的 `fiberTasks` 为 `null`            |

> 比较而言 `micro-app` 的 `injectFiberTask`，更简洁、抽象，灵活度也更高

#### 4. `start` 启动应用的 `bug`

先说问题：

- 问题 1：如果 `start` 中没有微任务，也没有宏任务，由于队列最后是通过 `Promise` 函数插入队列，那么永远不会执行末尾队列
- 问题 2：如果 `beforeScriptResultList` 或 `afterScriptResultList` 存在 `async` 的 `script`，导致无法提取执行下一个队列造成流程中断，后面的 `script` 将不能插入沙箱 `iframe`

导致结果：

- 暂停队列，无法完成 `await sandbox.start()` 微任务

原因：

- `this.execQueue.shift()()` 优先于返回的 `promise` 函数内部执行，他们是上下文关系
- 如果提取执行队列过程中，没有微任务和宏任务，那么当最后一个队列 `this.execQueue.shift()()` 执行完，才将最后返回的 `promise` 函数中插入 `execQueue` 队列中
- 而最后的 `promise` 需要在 `execQueue` 队列的方法中执行 `resove`，因此被中断
- 或因为手动插入 `async` 的 `script` 导致队列中断

`preloadApp` 出现问题的场景：

- 预加载本身不会导致问题，因为预加载默认不会 `start`，即便配置 `exec` 启动应用 `start`，问题也会发生在 `startApp` 切换应用时

`startApp` 启动应用 `start` 问题的场景：

| 触发条件             | 包含的场景                                                        | 问题 1                                              | 问题 2                             |
| -------------------- | ----------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| `alive` 预加载后启动 | 激活还未 `start` 启动的 `alive` 应用                              | 生命周期 `activated` 可能会不执行，`destroy` 不返回 | 流程中断导致后续 `script` 加载失败 |
| 非 `alive` 应用启动  | `umd` 预加载后首次启动，非 `active` 和 `umd` 的应用每次启动和切换 | 生命周期 `activated` 可能会不执行，`destroy` 不返回 | 流程中断导致后续 `script` 加载失败 |
| `exec` 预执行后启动  | 所有模式                                                          | 卡在 `await sandbox.preload` 暂停不再执行           | 流程中断导致后续 `script` 加载失败 |

> 在触发条件中有两个概念：预加载和预执行，见：通过 `exec` 预执行 [[查看](#5-通过-exec-预执行)]

非 `fiber` 模式下出现问题的场景：

| 模式                                        | 触发前提                             | 问题原因                                                                                                                        |
| ------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 模式 ①：没有要插入的 `script`               | 只有必须插入 `execQueue` 的 4 个方法 | 按照上下文执行队列，最后一个 `this.execQueue.shift()?.()` 提取执行后，返回的 `Promise` 函数中还没有 `push` 添加通知已完成的队列 |
| 模式 ②：只有通过循环插入队列的内联 `script` | `script` 全部为内联元素没有 `src`    | 和模式 ① 一样                                                                                                                   |

集合队列存在一个带有 `async` 的 `script`，无论是否 `fiber` 都会出现问题：

| 模式                                                          | 触发前提                                                                       | 问题原因                                                                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 模式 ③：通过 `beforeScriptResultList` 插入队列的异步 `script` | 启动前通过 `js-before-loaders`配置，当集合中有一个队列带有 `async` 的 `script` | 队列通知已完成的 `Promise` 已添加到队列，但在插入 `script` 到 `iframe` 中由于 `script` 是 `async`，不会执行 `nextScriptElement` 从而导致后续队列无法执行 |
| 模式 ④：通过 `afterScriptResultList` 异步插入队列的 `script`  | 启动前通过 `js-after-loader`配置，当集合中有一个队列带有 `async` 的 `script`   | 和模式 ③ 一样，区别在于 `afterScriptResultList` 在执行前，应用的 `script` 已插入沙箱 `iframe`，也完成了 `mount`，中断的只有 `loaded` 事件                |

`fiber` 模式下在模式 ①、模式 ② 情况下都是正常的：

- 默认的模式，要执行下一个队列就要通过宏任务 `requestIdleCallback`
- 返回的 `promise` 函数内部在当前任务属于上下文，优先于下一个宏任务添加到队列

所有模式下同步代码会正常执行：

- 同步代码和异步代码指的是子应用的 `script`
- 同步代码是一个微任务集合，执行前返回的 `Promise` 函数内部已 `push` 最后一个任务
- 对于子应用中带有 `async` 属性的 `script` 分到异步代码中执行

所有模式下异步代码会正常执行：

- 异步代码直接遍历 `promise` 队列，不受 `execQueue` 影响，即便不提取队列也会按照微任务添加的顺序执行

非 `fiber` 模式，手动插入带有 `src` 且 `content` 为空的 `script`，不存在属性 `async` 可正常执行：

- 因为 `window.__WUJIE.execQueue.shift()()` 是通过 `script` 的 `onload` 执行
- `onload` 是一个宏任务，会在当前宏任务执行完毕之后再执行
- 没有 `async` 就不会中断流程

复现问题 1：没有 `script`

- `static-app`：创建一个没有 `script`，没有 `style` 的静态子应用 [[查看](https://github.com/cgfeel/micro-wujie-app-static)]
- 添加一个 `StaticPage.tsx` 页面组件 [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/StaticPage.tsx)]，关闭 `fiber`，不添加 `js-before-loaders`、`js-after-loader`
- 应用组件 `Wujie.tsx`：添加 `startApp` 返回的函数 `destroy` 并打印 [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/components/Wujie.tsx)]

复现结果：

- 点开 `static` 应用，打开调试面板，刷新页面什么都没返回
- 点开 `react` 应用，返回 `destroy` 方法

复现问题 2：存在 `async` 的 `script`

- 原理和问题 1 一样，子应用中添加路由 `/async`，在页面中添加一段 `async` 属性的 `script` [[查看](https://github.com/cgfeel/micro-wujie-app-static/blob/main/async/index.html)]
- 在主应用中按照 `StaticPage.tsx` 添加相应的组件 `AsyncPage.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/AsyncPage.tsx)]

复现结果：

- 和问题 1 一样，子应用中 `script` 的 `async` 会通过异步集合 `asyncScriptResultList` 添加到沙箱 `iframe` 中
- `asyncScriptResultList` 不会影响 `execQueue`

复现问题 3：`jsBeforeLoaders` 打断应用加载

- 复现前确保 `react` 应用正常，复制一份 `ReactPage.tsx` 作为 `BeforePage.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/BeforePage.tsx)]
- 添加 `jsBeforeLoaders`：要求带有 `src` 和 `async`

复现结果：

- `ReactPage.tsx` 正常，`BeforePage.tsx` 应用加载过程中被 `jsBeforeLoaders` 打断不会 `mount` 应用

修复问题 1、问题 2：

- 在 334 行 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L334)]，第一个执行队列入口 `this.execQueue.shift()();` 之前主动添加一个微任务
- 这样确保最后一个队列提取一定是在微任务下执行，而当前上下文一定会在最后一个微任务之前插入队列
- 这样确保了队列最后能够顺利 `resolve`

```
this.execQueue.push(() => Promise.resolve().then(
  () => this.execQueue.shift()?.()
));
this.execQueue.shift()();
```

问题 3 的设计初衷：

- 因为异步代码 `asyncScriptResultList` 它本身和 `execQueue` 队列集合是没有关系的
- 但异步代码也是执行 `insertScriptToIframe` 将 `script` 插入沙箱 `iframe` 中
- 如果异步代码也去调用 `execQueue.shift()()`，那么就会造成队列执行顺序错乱了

修复问题 3：

- 遍历 `beforeScriptResultList` 和 `afterScriptResultList` 时去掉 `script` 的 `async`，如下：

```
beforeScriptResultList.forEach(({ async, ...beforeScriptResult }) => {})
afterScriptResultList.forEach(({ async, ...afterScriptResult }) => {})
```

因为只有在启动时，配置添加 `async` 的 `script` 才会出现这个问题

> 由于目前还在研究阶段，没有对官方提 PR。

**总结：**

1. 使用 `wujie` 过程中谨慎关闭 `fiber`，默认是不会关闭 `fiber` 的
2. 不要在 `beforeScriptResultList` 或 `afterScriptResultList` 传入带有 `async` 属性的对象，虽然 `ScriptObjectLoader` 这个对象是允许配置 `async` 的，虽然官方在文档中也并没有说 `async` 是可选配置，但是擅自添加 `async` 在源码中是有逻辑问题的

#### 5. 队列前的准备

包含：

- `execFlag` 设置为 `true`，从这里知道 `execFlag` 表示是否启动应用
- `execFlag` 会在 `destroy` 设 `null`，从这里知道注销应用后只能重新创造应用实例
- `scriptResultList` 提取要执行的 `script`，注 n (`scriptResultList`)
- `iframeWindow` 提取沙箱的 `window`
- 为子应用注入全局对象：`__POWERED_BY_WUJIE__`

> 注 n：`scriptResultList`，这是个不影响使用的问题
>
> - 类型声明 `getExternalScripts` 是 `() => ScriptResultList`，没有 `promise` 是不需要 `await` 的
> - `getExternalScripts` 返回一个数组集合，集合中包含带有类型为 `promise` 的属性 `contentPromise`，函数本身不是微任务
>
> 由此可以知道：
>
> - 在遍历子应用每一项 `script` 时，`contentPromise` 项都是一个微任务
> - 这也就是为什么同步代码和异步代码都是通过微任务将 `script` 添加到 `iframe` 中执行的原因了
> - 而其他的循环插入队列的 `script` 不需要通过微任务去执行操作
> - 为了保证其顺序，也因此不管是微任务也好，还是宏任务也好，都要求在上一个队列执行完后提取执行下一个队列
>
> 一道思考题：子应用中所有带有 `src` 的外联 `script` 在 `wujie` 中会怎么处理
>
> 1. 通过 `importHTML` 将将子应用整个资源分类：`template`、`assetPublicPath`、`script`、`css` [[查看](#importhtml-加载资源)]
> 2. 通过 `processTpl` 将 `script` 分类配置：`scr`、`async`、`defer`、`content` 等 [[查看](#processtpl-提取资源)]
> 3. 通过 `getExternalScripts` 遍历 `script` 集合
> 4. 为每项 `script` 增加一个类型为 `promise` 的属性 `contentPromise`，详细见：`importHTML` 加载资源 - 4.1. `getExternalScripts` [[查看](#importhtml-加载资源)]
>
> 因此：
>
> - 子应用 `script` 只有外联的 `ES` 模块或带有 `ignore` 属性，会当做空内容
> - 其他情况都作为内联 `script` 处理，外联的 `script` 会在插入 `iframe` 前下载下来，即便是 `async` 或 `defer`

关闭加载状态：

- 在第一次提取队列 `this.execQueue.shift()?.()` 之前，会通过 `removeLoading` 关闭 `loading` 状态

> 在 `wujie` 中可以通过 `loading` 自定义一个加载元素，见文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

执行条件：

- 没有提供 `__WUJIE_UNMOUNT` 的 `umd` 模式，或非 `umd` 模式

> 这里虽然提供了 `this.alive` 模式作为检测，但是同时也增加了 `!isFunction(this.iframe.contentWindow.__WUJIE_UNMOUNT)` 判断，只要不是 `umd` 方式卸载应用，都会执行关闭 `loading` 状态

#### 6. 必须添加队列的 4 个方法

**1. 主动调用 `mount` 方法**

- 见：`mount` 挂载应用 [[查看](#-mount-挂载应用)]

**2. 触发 `DOMContentLoaded` 事件**

- 创建一个 `DOMContentLoaded` 自定义事件，分别由 `iframeWindow.document` 和 `iframeWindow` 触发

**3. 触发 `loaded` 事件**

- 自定义事件 `readystatechange`，由 `iframeWindow.document` 触发
- 自定义事件 `load`，由 `iframeWindow` 触发

**4. 返回 `Promise`**

- 通过在返回的 `Promise` 函数中添加队列最后要执行的任务
- `resolve` 释放返回的微任务，用于通知 `start` 完毕

#### 📝 `mount` 挂载应用

挂载应用会做 3 件事

#### 1. `umd` 方式启动

- 如果应用是 `umd` 方式挂载应用时触发
- 再次关闭挂载容器 `loading` 状态，见：5. 队列前的准备 [[查看](#5-队列前的准备)]
- 使用 `iframeWindow` 调用生命周期 `beforeMount`
- 调用子应用的 `__WUJIE_MOUNT` 去挂载应用
- 使用 `iframeWindow` 调用生命周期 `afterMount`
- 设置 `mountFlag` 避免重复挂载，`mountFlag` 会在 `unmount` 和 `destroy` 时更新

#### 2. `alive` 模式

- 使用 `iframeWindow` 调用生命周期 `activated`

#### 3. 执行下一个队列

- `this.execQueue.shift()?.()`

### `packages` - `wujie-react`

只看 `wujie-core` 和 `wujie-react`，其中 `WujieReact` 这个组件和基座演示的自定义组件是如出一辙，见自定义组件 [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/components/Wujie.tsx)]。

先看官方提供的 `react` 组件，只有一个文件 `index.js` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-react/index.js)]

静态属性：

- `propTypes`：定义组件的属性类型，用于类型检查。
- `bus`，`setupApp`，`preloadApp`，`destroyApp`：从 `wujie` 库引入的静态属性和方法，可能用于子应用的管理和控制。

> 外部可以直接通过 `WujieReact` 这个类获取静态属性

状态和引用：

- `state`：定义了一个 `myRef`，用于存储对 `DOM` 元素的引用。
- `destroy` 和 `startAppQueue` 是实例属性，用于存储销毁方法和启动应用的 `Promise` 队列，在组件中只做了定义没有使用。

**方法：**

`startApp`：

- 异步方法，用于启动子应用。
- 使用 `startApp` 方法传入组件的属性和引用的 `DOM` 元素。

生命周期方法：

- `componentDidMount`：在组件挂载后调用 `startApp` 方法启动子应用。
- `componentDidUpdate`：当组件的 `name` 或 `url` 属性发生变化时重新启动子应用。

`render` 方法：

- 渲染一个 `div` 元素，并将组件的宽度和高度设置为属性中的值。
- 通过 `ref` 属性将 `div` 的引用存储到 `myRef` 中。

文档：

- `React` 封装组件使用 [[查看](https://wujie-micro.github.io/doc/pack/react.html)]
- 封装组件的 `props` 参考 `startApp` [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

总结：

`WujieReact` 组件使用 `wujie` 库来管理子应用的生命周期，通过 `startApp` 方法启动子应用，并在组件更新时重新启动子应用。通过静态属性和类型检查确保组件的使用符合预期。

### 辅助方法

罗列阅读过程中一些重要的方法

#### `importHTML` 加载资源

加载子应用资源、获取提取资源的方法

目录：`entry.ts` - `importHTML` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L200)]

用于加载和处理资源内容，相当于：

- `qiankun` 的 `importEntry` [[查看](https://github.com/cgfeel/micro-qiankun-substrate?tab=readme-ov-file#212-prefetch-%E6%89%A7%E8%A1%8C%E9%A2%84%E5%8A%A0%E8%BD%BD)]
- `micro-app` 的 `HTMLLoader` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#12-htmlloader-%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90)]

> 除了 `qiankun` 使用的是 `import-html-entry` [[查看](https://github.com/kuitos/import-html-entry)]，其他都是单独开发的

先从入参看，参数为包含 3 个属性的 `params`：

- `url`：远程资源连接
- `html`：静态资源，存在则优先使用
- `opts`：包含加载和处理 `HTML` 的相关配置

`opts` 包含 4 个可选属性：

- `fetch`：默认的 `fetch` 还是自定义的 `fetch`
- `plugins`：子应插件，详细见文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#plugins)]
- `loadError`：子应用加载资源失败后触发，`startApp` 时配置
- `fiber`：空闲加载

最终返回 `Promise<htmlParseResult>`，其中 `htmlParseResult` 包含：

- `template`：处理后的资源内容
- `assetPublicPath`：资源路径
- `getExternalScripts`：提取外部 `script` 的方法，返回 `ScriptResultList[]` 集合 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L19)]
- `getExternalStyleSheets`：提取外部 `style` 的方法，返回 `StyleResultList[]` 集合 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L20)]

返回的资源会根据 `plugins` 是否存在 `htmlLoader` 来处理结果：

- 存在：使用自定义的 `loader` 函数处理 `html`，不缓存
- 不存在：使用默认的 `loader` 函数 `defaultGetTemplate` 处理，将结果缓存到 `embedHTMLCache` 以避免重复加载资源

用到 `importHTML` 的地方有 3 处：

- `preloadApp` 预加载
- `startApp` 切换 `alive` 模式的应用
- `startApp` 初次加载沙箱实例

子应用样式提取概览：

- 匹配的外联样式和内联样式会通过 `processTpl` 替换为注释 [[查看](#processtpl-提取资源)]
- 通过 `getExternalStyleSheets` 为每个 `style` 包裹一个 `Promise` 属性 `contentPromise`（当前章节.4）
- 通过 `processCssLoader` 统一在 `getEmbedHTML` 中再次替换成内联样式 [[查看](#getembedhtml-转换样式)]

子应用 `script` 提取概览：

- 只对 `ignore` 和 `ES` 不匹配的情况的 `script` 注释，注释后不会再还原 [[查看](#processtpl-提取资源)]
- 其他情况通过 `getExternalScripts` 为每个 `script` 包裹一个 `Promise` 属性 `contentPromise`（当前章节.4）
- 在启动应用 `start` 时，会将子应用的 `script` 分为：同步代码通过 `execQueue` 队列执行、异步代码通过微任务执行 [[查看](#-start-启动应用)]

整个流程分 3 步：

1. 提取必要的配置
2. 远程加载或直接返回要加载的资源
3. 处理资源

**1. 提取必要的资源：**

- `fetch`：只能是自定义的 `fetch` 或 `window.fetch`
- `fiber`：是否空闲加载
- 提取 `plugins` 用于自定义 `loader` 处理资源，提取 `loadError` 用于提取外部资源失败时使用
- `htmlLoader`：根据 `plguins` 返回自定义处理 `loader` 函数，不存在使用默认提供的 `defaultGetTemplate`
- 通过 `getEffectLoaders` 提取 `jsExcludes`：`js` 排除列表，注 n (`getEffectLoaders`)
- 通过 `getEffectLoaders` 提取 `cssExcludes`：`css` 排除列表
- 通过 `getEffectLoaders` 提取 `jsIgnores`：`js` 忽略列表
- 通过 `getEffectLoaders` 提取 `cssIgnores`：`css` 忽略列表
- 通过 `defaultGetPublicPath` 将子应用的 `url` 和 `localhost.href` 计算出资源路径

> 注 n：`getEffectLoaders` 提取的资源通过 `reduce` 最终拷贝返回一个新的 `Array<string | RegExp>` 对象

**2. 获取资源：**

通过 `getHtmlParseResult` 获取资源，接受 3 个参数：

- `url`：资源远程链接
- `html`：现有的资源
- `htmlLoader`：通过 `plugins` 传入的 `htmlLoader`，不存在使用 `defaultGetTemplate`

> 默认的 `defaultGetTemplate` 将不处理资源直接将传入的 `template` 返回

提供 `html` 时优先使用，否则通过 `fetch` 获取资源链接，如果获取失败记录在 `embedHTMLCache`，下次不再获取。

> `getHtmlParseResult` 相当于 `micro-app` 中的 `extractSourceDom` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#13-extractsourcedom-%E6%88%90%E5%8A%9F%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90%E5%9B%9E%E8%B0%83)]

**3. 处理返回资源：**

- 获取资源路径 `assetPublicPath`，注 n (`assetPublicPath`)
- 通过 `htmlLoader` 处理获取的资源
- 如果通过 `plugins` 传入 `htmlLoader` 处理，会将获取的资源作为字符参数传递过去
- 通过 `processTpl` 传入处理过后的 `html`、`assetPublicPath`，提取 `template`、`script`、`style`，见：`processTpl` 提取资源 [[查看](#processtpl-提取资源)]
- 最终返回资源对象，即上述最终返回的 `Promise<htmlParseResult>`

> 注 n：`assetPublicPath`
>
> - `qiankun` 和 `micro-app` 通过 `__webpack_public_path__` 配置资源路径
> - `qiankun` 根据 `window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__` 配置
> - `micro-app` 根据 `window.__MICRO_APP_PUBLIC_PATH__` 配置
> - `wujie` 不需要配置 `__webpack_public_path__`，通过 `defaultGetPublicPath` 计算子应用入口 `url` 为 `baseurl`

**4. 获取外部资源：**

`getExternalScripts` 获取 `script`，`getExternalStyleSheets` 获取 `css`，获取前都将资源遍历一遍：

- 剔除拥有外链且被 `jsExcludes｜cssExcludes` 排除的资源
- 遍历过滤后的集合，对拥有外链且被 `jsIgnores|cssIgnores` 资源对象打上 `ignore` 的属性

除此之外他们都会将 `fetch`、`loadError` 传过去作为处理，不同在于 `script` 还会将 `fiber` 传过去

**4.1. `getExternalScripts`：**

传过去一个集合 `ScriptObject[]`，直接 `map` 后返回。不同的是为每一项资源添加了一个 `promise` 方法 `contentPromise`，分为 3 个情况：

1. 有 `src`，且不是 `ES` 模块，通过 `fetchAssets` 加载资源
2. 有 `src` 的 `ES` 模块，返回一个空字符的 `promise`
3. 内联脚本内容作为 `promise` 返回

> 对于外链 `script` 且存在 `async` 或 `defer`，会根据 `fiber` 决定是在 `requestIdleCallback` 空闲情况下 `fetchAssets` 加载资源

**4.2. `getExternalStyleSheets`：**

传过去一个集合 `StyleObject[]`，直接 `map` 后返回。分为 2 个情况：

1. 内联样式用 `content` 换成一个 `promise` 对象 `contentPromise`
2. 外链样式添加 `promise` 对象 `contentPromise`，根据 `ignore` 决定返回空字符还是通过 `fetchAssets` 加载资源

**5. 存在的 2 个问题：**

一个似乎不影响使用的问题：

- 先全局搜索 `styles.push` 只有 2 处，且都没有设置 `ignore`，见：`processTpl` 源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/template.ts#L143)]
- 那么在所有通过 `importHTML` 提取出来的 `StyleObject` 都会被忽略 `ignore`

产生的问题：

- 子应用原版 `ignore` 属性的样式就真的被注释了啊。。。。

说它不影响使用是因为：

- 即便 `ignore` 正确收集，最终 `contentPromise` 还是以空字符输出 `Promise.resolve("")`
- `getEmbedHTML` 在处理外联 `css` 稍微不同，但最终结果还是被忽略，见 `getEmbedHTML` [[查看](#getembedhtml转换样式)]

一个重复加载的问题，包含场景：

- `preloadApp` 预加载应用后，`startApp` 启动非 `alive` 模式的应用
- `startApp` 切换非 `alive` 模式或 `umd` 模式的应用

每次切换非 `alive` 模式或 `umd` 模式的应用，会重复执行如下操作：

| 操作步骤                           | 必要性                                                                                           | `micro-app` 怎么做                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. 清空容器，注入 `loading`        | 根据情况决定                                                                                     | 注销组件时需要考虑清理子应用的状态和事件                                                                                                                                                                                                                                                                                                                               |
| 2. 创建新的应用实例 `Wujie`        | 非必要，`Wujie` 每次注销应用都是彻底销毁下次切换重建新实例                                       | 更改实例对应的属性用于对应下线的应用，待下次挂载时再次更新                                                                                                                                                                                                                                                                                                             |
| 3. 挂载前调用生命周期              | 必要                                                                                             | 必要                                                                                                                                                                                                                                                                                                                                                                   |
| 4. 加载 `css`                      | 非必要每次都加载，见：`processCssLoader` [[查看](#processcssloader处理-css-loader)]              | 所有的样式资源收集在资源映射表中 `sourceCenter.link`，见：`micro-app` - 注 ⑥ [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#microappstart-%E5%90%AF%E5%8A%A8%E5%BA%94%E7%94%A8)]，下次直接从映射表获取                                                                                                                                       |
| 5. 提取入口资源                    | 非必要每次都加载，见：`importHTML` [[查看](#importhtml-加载资源)]                                | 应用实例初始化时通过 `loadSourceCode` 加载资源 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#11-loadsourcecode-%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90)]，完成后通过 `onLoad` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#31-onload-%E5%8A%A0%E8%BD%BD%E5%AE%8C%E6%AF%95)] 记录在 `this.source.html` 便于下次获取 |
| 6. 激活应用 `active`               | 必要，每次激活应用就是对应用容器节点切换的操作，见：`active` [[查看](#-active-激活应用)]         | 不需要每次手动激活，实例 `unmount` 并不会销毁实例对应的资源                                                                                                                                                                                                                                                                                                            |
| 7.1. `start` 应用队列加载 `script` | 非必要每次都加载，见：`start` [[查看](#-start-启动应用)]，除此之外还需要清理之前注入的 `loading` | 不需要每次手动启动，所有的 `script` 资源收集在资源映射表中 `sourceCenter.script`，见：`micro-app` - 注 ⑥ [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#microappstart-%E5%90%AF%E5%8A%A8%E5%BA%94%E7%94%A8)]，下次直接从映射表获取                                                                                                           |
| 7.2. `start` 应用队触发事件        | 必要，如：`mount` 等 [[查看](#-mount-挂载应用)]                                                  | 必要                                                                                                                                                                                                                                                                                                                                                                   |
| 8. 挂载后调用生命周期              | 必要，但存在重复调用的问题，见：6.预加载中的 `bug` [[查看](#6预加载中的-bug)]                    | 必要                                                                                                                                                                                                                                                                                                                                                                   |

> 因此，对于非 `alive` 模式或 `umd` 模式的应用，在 `wujie` 切换时容器可能会有短暂的白屏问题

#### `processTpl` 提取资源

目录：`template.ts` - `processTpl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/template.ts#L143)]

用于从加载内容中提取出 `scripts` 和 `styles`，相当于：

- `micro-app` 中的 `flatChildren`，见：`micro-app` 源码分析，注 ⑭ [[查看](https://github.com/cgfeel/micro-app-substrate)]

从入参开始，接受 3 个参数：

- `tpl`：字符类型，要提取的源内容
- `baseURI`：字符类型，资源 `url`
- `postProcessTemplate`：可选参数，传入会在提取资源返回前进行最后处理

返回一个 `TemplateResult` 对象 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/template.ts#L64)] 包含 4 个属性：

- `template`：替换特定内容后的资源
- `scripts`：提取的脚本
- `styles`：提取的样式
- `entry`：入口资源

函数内部作了 2 件事：

- 声明对象用于收集提取的资源，分别是：`scripts`、`styles`、`entry`、`moduleSupport`、`template`
- 执行替换，按照 `replace` 分别执行如下

**1.替换备注：**

全部替换为空

**2.提取或替换 `link` 标签：**

有 2 个情况会将 `link` 标签替换为备注：

1. `ref="stylesheet"` 的外联样式
2. `preload|prefetch|modulepreload` 模式下，存在 `href` 的 `font` 类型资源

> 以上情况都不符合，会原封不动将数据返回，对于 `link` 标签不做替换，例如：`favicon`

替换备注有 2 种方式：

- `genIgnoreAssetReplaceSymbol`：带有 `ignore` 属性的外联样式
- `genLinkReplaceSymbol`：默认替换的方式

`genLinkReplaceSymbol` 在 2 中情况注释的不同处：

- 样式：不提供第二个参数，无无加载
- 字体：提供第二个参数，作为 `perfetch` 或 `preload`

> 记住这个模式在启动应用前 `processCssLoader` 根据注释替换资源

**3.提取或替换 `style` 内联样式：**

所有内联样式都会被注释替换，替换注释有 2 种：

- `genIgnoreAssetReplaceSymbol`：带有 `ignore` 属性的内联样式
- `getInlineStyleReplaceSymbol`：默认替换方式

默认替换方式做 2 件事：

- 将 `{ src: "", content: code }` 添加到 `styles`
- 记录当前样式在 `styles` 中的 `index`，在启动应用前 `processCssLoader` 根据注释替换资源

**4.提取或替换 `script`：**

先获取以下对象：

- `scriptIgnore`：提取带有 `ignore` 属性的 `script`
- `isModuleScript`：判断是否是 `ES` 模块的 `script`
- `isCrossOriginScript`：提取跨域行为 `crossorigin` 的 `script`
- `crossOriginType`：跨端的类型的值
  - 这里只提取 `anonymous` 不发送凭据和 `use-credentials` 发送凭据 2 个类型
  - `crossorigin` 不存在默认为空字符
- `moduleScriptIgnore`：`script` 作为被忽略的 `ES` 模块
  - 当浏览器支持 `ES` 模块而 `script` 标签带有 `nomodule` 属性
  - 或浏览器不支持 `ES` 模块并且当前 `script` 是 `module` 类型
- `matchedScriptTypeMatch`：提取 `script` 的 `type`，不存在为 `null`
- `matchedScriptType`：`script` 的 `type` 值，不存在为 `undefined`

分 3 个情况：

- 不是有效的可执行 `script`，直接返回不处理
- 有效的外部链接：不包含 `type="text/ng-template"` 且有 `src` 的外部 `script`
- 其他情况，如：内联 `script`、`ng-template`

用注释替换 `script` 有 2 种：

- `scriptIgnore`、`moduleScriptIgnore`

**4.1 有效的外部链接，先提取 3 个对象：**

- `matchedScriptEntry`：提取的 `script` 是带有 `entry` 的主入口
- `matchedScriptSrcMatch`：提取的 `script` 是带有 `src` 属性
- `matchedScriptSrc`：`script` 的 `src` 链接或 `undefined`

以下情况会 `throw`：

- 多入口：`entry` 和 `matchedScriptEntry` 同时存在

以下情况会设置入口 `entry`

- `entry` 为 `null`，`matchedScriptEntry` 存在，设置为 `matchedScriptSrc`
- 在设置之前会检查并更新 `matchedScriptSrc` 为有效的 `url`

> 如果 `src` 提供的是相对路径，会根据资源路由 `baseURI` 获取相对 `url`

`matchedScriptSrc`：对于已提取出 `src` 的情况会提取出一个对象插入 `scripts`

```
{
    src: matchedScriptSrc,
    module: isModuleScript,
    crossorigin: !!isCrossOriginScript,
    crossoriginType: crossOriginType,
    attrs: parseTagAttributes(match),
}
```

> 以上属性上述已说明， `parseTagAttributes` 会提取 `<script(.*)>` 标签中所有带有 `=` 的属性，将其作为 `key`、`value` 的键值对象返回

除此之外还会提取 `script` 中的 `async` 和 `defer` 属性，只有有一个属性存在，会在插入对象中添加如下属性

```
{
    async: isAsyncScript,
    defer: isDeferScript,
}
```

其他情况带有外链的 `script` 将直接返回不做任何处理

**4.2 内联 `script`：**

无论哪种情况内联 `script` 都会被注释代替，当内联 `script` 不存在 `scriptIgnore`，也不存在 `moduleScriptIgnore` 时：

- 通过 `getInlineCode` 提取 `script` 中的脚本内容
- 遍历每一行查看是否为空或已单行注释得到 `isPureCommentBlock`
- 如果是有效的内联 `script` 和上面外链 `script` 一样添加到 `scripts`

> 这里 `wujie` 好像没有考虑多行注释

插入 `scripts` 的 `item` 和外链不同点

```
{
    src: "",
    content: code,
}
```

#### `processCssLoader`：处理 `css-loader`

目录：`entry.ts` - `processCssLoader` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L56C23-L56C39)]

触发场景有 3 个：

- `preloadApp`：预加载应用
- `startApp`：初次加载应用（不包含预加载后 `alive` 模式的应用）
- `startApp`：每次切换非 `alive` 模式或 `umd` 模式的应用

参数：

- `sandbox`：应用实例
- `template`：已完成替换的入口资源，见：`processTpl` 提取资源 [[查看](#processtpl-提取资源)]
- `getExternalStyleSheets`：提取 `css` 资源的函数，返回 `css` 集合，见：`importHTML` 加载资源 [[查看](#importhtml-加载资源)]

获取并更新样式集合：

- 通过 `getCurUrl` 获取 `base url`
- 通过 `compose` 柯里化获取插件 `cssLoader`，见：`insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)] - `compose`
- 遍历 `getExternalStyleSheets()`，见：`importHTML` 加载资源 [[查看](#importhtml-加载资源)] - `getExternalStyleSheets`
- 目的是用 `cssLoader` 替换每一项 `css` 的 `contentPromise`，见文档：`css-loader` [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]

替换资源中的样式：

- 通过 `getEmbedHTML` 将之前注释的样式替换成内联样式 [[查看](#getembedhtml转换样式)]
- 如果有提供的话通过 `replace` 更新资源 [[查看](#1-更新配置应用信息)]
- 最后将更新的资源返回

`processCssLoader` 存在的重复执行的问题，见：`importHTML` - 5. 存在的 2 个问题 [[查看](#importhtml-加载资源)]

#### `getEmbedHTML`：转换样式

无论外联的 `link` 还是内联的 `style`，统一转换成内联样式，用来提升效率，还记得在 `processTpl` [[查看](#processtpl-提取资源)] 中样式替换成特定的备注吗，在这里将替换回来。

参数：

- `template`：子应用的资源，虽然是 `any` 但它只能是 `string`，因为 `processCssLoader` 传过来就是 `string`
- `styleResultList`：通过 `getExternalStyleSheets` 提取出来的 `styles` 集合，见：`importHTML` 加载资源 [[查看](#importhtml-加载资源)] - 4.2. `getExternalStyleSheets`

返回：

- 将替换后的资源通过 `promise` 的方式返回

流程，关联参考：`processTpl` 提取资源 [[查看](#processtpl-提取资源)]：

- 通过 `Promise.all` 迭代 `style` 集合中每一项的 `contentPromise`
- 如果是带有 `src` 的外联 `style` 替换 `genLinkReplaceSymbol` 注释的样式
- 如果是带有 `content` 的内联 `style` 替换 `getInlineStyleReplaceSymbol` 注释的样式

> 从这里知道每一个 `style` 已通过微任务确保替换前已完成加载

替换样式的 `bug`，`ignore` 无效，见：[[查看](#importhtml-加载资源)] - 4.2. `getExternalStyleSheets`

- 首先在提取样式时不会记录 `ignore`，所以在替换时候取 `ignore` 是一个无效值
- 其次对于包含 `ignore` 的外联 `style`，注释通过 `genIgnoreAssetReplaceSymbol` 替换，而不是 `genLinkReplaceSymbol`
- 恰巧两个错误起到了“负负得正”的效果，永远不会因为找到错误的注释替换成了错误的样式链接
- 最后对于内联 `style`，在替换时就没有考虑 `ignore`，即便 `ignore` 存在，也会在 `getExternalStyleSheets` 时候作为空值

#### `insertScriptToIframe`：为沙箱插入 `script`

向沙箱 `iframe` 中插入 `script`，而并非 `shadowDom`

目录：`iframe.ts` - `processTpl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L710)]

参数：

- `scriptResult`：需要插入的 `script` 对象，类型：`ScriptObject | ScriptObjectLoader`
- `iframeWindow`：沙箱的 `window`
- `rawElement`：子应用通过如：`insertBefore` 指定的第二个参考节点

不需要返回，这个函数围绕 2 个对象展开：

- `scriptResult`：插入沙箱 `iframe` 的 `script`
- `nextScriptElement`：需要插入到沙箱中，提取执行下一个 `execQueue`，见：`start 启动应用` [[查看](#-start-启动应用)]

调用场景有 2 个：

- `rewriteAppendOrInsertChild`：重写渲染容器对于 `script`节点的操作方法
- `Wujie.start`：启动应用，详细见：`start` 启动应用 [[查看](#-start-启动应用)]

> 重写渲染有 2 种情况，且都来自 `active` 激活应用，见：`active` 激活应用 [[查看](#-active-激活应用)]：
>
> - `degrade` 降级处理：优化 `iframe` 容器
> - 非 `dagrade`：优化 `shadowDom` 容器
>
> 它们的目的只有全都满足以下 2 个条件才可以：
>
> - 重写 `node` 操作，详细见：注 n (`renderTemplateToIframe`) - `patchRenderEffect` 为“新容器” 打补丁
> - 操作的节点元素为 `script`，让其添加到沙箱的 `iframe` 中

**第一步：获取配置**

将 `scriptResult` 强制作为 `ScriptObjectLoader` 分别提取配置，详细见：`processTpl` 提取资源 [[查看](#processtpl-提取资源)] - 4.提取或替换 `script`：

- `src`：`script` 的 `url`，可选类型：`string`
- `module`：是否为 `ES` 模块，可选类型：`boolean`
- `content`：`script` 的内容，可选类型：`string`
- `crossorigin`：是否为跨域类型的 `script`，可选类型：`boolean`
- `crossoriginType`：跨域类型，可选类型：`"" | "anonymous" | "use-credentials"`
- `async`：是否为异步加载的 `script`，可选类型：`boolean`
- `attrs`：`script` 带有 `=` 属性的键值对象
- `callback`：`plugins` 项中设置 `callback`，会在 `insertScriptToIframe` 执行最后调用，见文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html)]
- `onload`：和 `callback` 一样，不同的是 `onload` 是对于带有 `src` 的 `script`，在加载完毕后或加载失败后调用

> 这里吐槽一下，既然强制作为 `ScriptObjectLoader` 又何必传入联合类型呢，难道不是应该分开提取吗？

创建两个 `script` 对象：

- `scriptElement`、`nextScriptElement`

从沙箱对象中提取 3 个配置：

- `replace`：替换 `script` 内容的函数，见：1. 更新配置应用信息 [[查看](#1-更新配置应用信息)]
- `plugins`：提桶的 `plugins`，见文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html)]
- `proxyLocation`：根据引用入库链接提取的 `location` 对象

通过 `getJsLoader` 提取要插入 `script` 最终的代码：

- `getJsLoader` 是一个柯里化函数，接受两个参数：`plugins`、`replace`
- 返回一个执行函数，函数接受 3 个参数：
  - `code` 替换前的 `script` 内容
  - `src` 脚本 `url`
  - `base`：子应用入口链接，包括 `protocol`、`host`、`pathname`
- 返回的函数内部通过 `compose`，遍历 `plugins` 提取 `jsLoader` 作为参数，并将上面收到的 3 个参数传过去作为参数

`compose` 也是一个柯里化函数：

- 返回一个函数，接受上面提供的 3 个参数
- 在函数内部通过 `array.redus` 将 `plugins` 拍平
- 存在 `js-loader` 函数交由函数处理，否则将处理过的 `code` 交给下一个 `js-loader`，见文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-loader)]

最终返回：

- `js-loader` 过滤后的代码，如果 `js-loader` 没有提供，则将传入的 `code` 原封不动返回
- 如果提取的是带有 `src` 的 `script`，脚本的 `code` 内容是空，且没有提供 `js-loader`，那么返回的是一个空字符

从上面知道：

- 上面的处理过程围绕 `js-loader` 展开，`js-loader` 只能作为过滤替换，不是加载资源的函数
- `js-loader` 是通过柯里化延迟处理，在函数内部通过 `map` 过滤，通过 `redus` 拍平
- 都是在同一个宏任务中进行，即便 `script` 只提供了 `src` 链接，也不可以通过 `fetch` 这样的方式用微任务获取脚本
- 加载脚本在此之前通过 `importHTML` [[查看](#importhtml-加载资源)] 加载

为 `scriptElement` 添加属性：

- 将 `attrs` 提取排除和上述 `scriptResult` 提取的配置同名的属性添加到 `scriptElement`

**第二步：配置 `script`**

内联 `script`：

- 在非降级 `degrade` 状态下并且不是 `es` 模块的情况下，将整个 `script` 内容包裹在一个函数模块里
- 使用沙箱的 `proxy` 作为模块的：`this`、`window`、`self`、`global`，使用 `proxyLocation` 作为模块的 `location`

提取内联 `script` 的 `src` 属性：

- 但凡是个正规浏览器，通过 `Object.getOwnPropertyDescriptor` 拿 `script` 的 `src` 都是 `undefined`
- 因为 `src` 属性是从 `HTMLScriptElement` 接口继承的，而不是直接定义在特定的 `scriptElement` 对象上，见演示 [[查看](https://codepen.io/levi0001/pen/abgvWQj)]

> 那这里的意义是啥呢？我猜可能和注释一样：解决 `webpack publicPath` 为 `auto` 无法加载资源的问题，在 `node` 环境下可能不一样，待指正

外联 `script`：

- 设置 `src`，如果存在的话
- 设置 `crossorigin`，如果存在的话

`script` 补充操作：

- 如果 `module` 成立，设置 `scriptElement` 为 `es` 模块，
- 设置 `textContent`，外联 `script` 也会设置脚本内容，但是同时存在 `src` 和 `textContent`，会采用属性 `src`
- 设置 `nextScriptElement` 的脚本内容，用于插入 `script` 完成后，调用下一个队列

**第三步：声明监听方法并处理 `script`**

声明 `script` 完成后要执行的函数：

- 将沙箱的 `iframe` 的 `head` 作为容器 `container`
- 声明一个函数 `execNextScript`，只要 `async` 不存在就会将 `nextScriptElement` 添加到容器并执行
- 声明一个 `afterExecScript`，用于在 `scriptElement` 添加到容器后执行，函数做 2 件事：
  - 触发 `onload`：通过 `jsBeforeLoaders` 或 `jsAfterLoaders` 添加
  - 触发 `execNextScript`：以便执行下一个队列 `window.__WUJIE.execQueue.shift()()`

> 这里的逻辑是有问题的，见：`start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

检查错误：如果插入的 `script` 内容是 `html`

- 通过 `error` 输出错误，调用 `execNextScript` 以便执行下个队列

> 理论上说这里的逻辑在非 `fiber` 下是会有问题的，导致 `start` 启动应用中断，但由于捕获的情况本身就是错误的，那逻辑错误又如何呢？

打标记：

- 根据提供的 `script` 为插入的 `script` 打上标记 `WUJIE_SCRIPT_ID`，值是一个自增数字
- 调用场景：`rewriteAppendOrInsertChild`，见注 n：`renderTemplateToIframe` - `patchRenderEffect`

外联脚本执行后的处理：

- 要求：`script` 带有 `src`，内容为空
- 满足条件无论是 `onload` 还是 `onerror` 都会调用 `afterExecScript`

**第四步：插入 `script`**

- 在容器 `container` 中添加 `scriptElement`
- 调用 `callback` 并将沙箱的 `iframeWindow` 作为参数
- 提取并执行 `appendOrInsertElementHook`，见文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#appendorinsertelementhook)]
- 对于内联 `script` 元素无法触发 `onload`，直接调用 `afterExecScript`

**总结：**

- `insertScriptToIframe`：用处是将 `script` 添加到沙箱 `iframe` 中
- 包含：子应用的 `script`、启动应用是手动配置的、在应用中通过节点操作添加的
- 对于内联 `script` 会包裹一个模块，通过 `proxy` 更改 `window` 等对象的指向，避免全局污染
- 这个函数存在逻辑问题，见：`start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

#### `renderElementToContainer`：将节点元素挂载到容器

目录：`shadow.ts` - `renderElementToContainer` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L70)]

参数：

- `element`：挂载的节点，类型：`Element | ChildNode`
- `selectorOrElement`：容器，类型：`string | HTMLElement`

流程：

- 通过 `getContainer` 定位到容器 `container`
- 如果 `container` 存在，且不包含提供的节点元素，将其添加到容器
- 返回定位的容器 `container`

需要注意的是：

- 不存在 `LOADING_DATA_FLAG` 节点的情况下，挂载到容器前需要先 `clearChild` 清空容器

什么时候会提供 `LOADING_DATA_FLAG`：

- `addLoading` 时设置一个 `div` 用于挂载 `loading` 元素
- 而使用 `addLoading` 只有 `startApp` 初始化应用前执行

> 需要注意的是：
>
> - `startApp` 时可以通过配置 `loading` 来定义加载元素，见：文档[[查看](https://wujie-micro.github.io/doc/api/startApp.html#loading)]
> - 不提供 `loading` 也会执行 `addLoading` 添加一个空的 `loading` 到容器

为什么 `addLoading` 后就不需要清空容器：

- 因为 `addLoading` 开头两行和 `renderElementToContainer` 一样，现定位容器再清空容器
- 清空容器之后再添加样式、挂载 `loading`

如果执行 `addLoading` 后，`loading` 在哪清除：

- `start` 启动应用时，队列之前会 `removeLoading`，见：5. 队列前的准备 [[查看](#5-队列前的准备)]
- `mount` 挂载 `umd` 模式应用时，这里可能会重复清除

总结：

- 只要不是通过 `startApp` 初始化添加 `loading` 元素，每次执行 `renderElementToContainer` 都会清空容器
