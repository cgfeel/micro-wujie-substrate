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

> 不是 `vue` 技术栈，所以这里暂且略过，除了最后一章为 `react` 封装组件，以下内容均来自核心包

### 定义 `web component`

这里之所以提自定义组件，是为了便于了解组件生命周期触发的事件

`wujie` 定义组件和 `micro-app` 最大不同在于：

- `wujie` 不需要直接在 `Dom tree` 中直接挂载组件，因此也不需要自定义组件名
- `wujie` 不检查组件上任何属性的变更
- 作为 `web component` 对于 `wujie` 来说只是一个承载 `template` 的容器

因此：

- 使用者几乎可以不用关心 `WujieApp` 这个自定义组件类
- `WujieApp` 自定义组件类，在入口文件通过 `defineWujieWebComponent` 直接声明 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L170)]
- 当引入 `startApp` 的时候，就已经定义好了 `web component`

挂载组件：

- `wuie` 不需要手动挂载组件，挂载组件的办法只能通过 `createWujieWebComponent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L60)]
- 而 `createWujieWebComponent` 只在 `Wujie` 实例初始化调用 `active` 方法时才会执行，见：1.3. 挂载子应用 [[查看](#13-挂载子应用)]

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

#### 2. 存在沙箱实例，切换应用：

渲染前的准备：

- 通过 `getPlugins` 更新实例的 `plugins`，详细见文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#plugins)]
- 更新实例的 `lifecycles`， 详细见文档 [[查看](https://wujie-micro.github.io/doc/guide/lifecycle.html)]
- 获取实例的 `iframeWindow` 对象，用于查看子应用挂载方法 `__WUJIE_MOUNT`
- 如果实例预加载应用，需要等待预加载执行完毕

#### 2.1 `alive` 保活模式切换应用

和 `micro-app` 的 `keep-alive` 模式一样：

- 优点：切换路由不销毁应用实例，路由、状态不会丢失，在没有生命周期管理的情况下，减少白屏时间
- 缺点：多个菜单栏跳转到子应用的不同页面，不同菜单栏无法跳转到指定子应用路由

流程分 3 步：

- 将拿到的配置信息激活子应用：`sandbox.active`，详细见：1. `active` 激活应用 [[查看](#1-active-激活应用)]
- 预加载但是没有执行的情况 `!sandbox.execFlag`，提取执行脚本重新 `start` 实例，注 ②
- 将 `iframeWindow` 传递过去通知 `activated`，并返回注销应用的方法

### `Wujie` 应用类

目录：`sandbox.ts` - `Wujie` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L50)]

用于创建一个应用实例，和 `micro-app` 的 `CreateApp` 是一样的，它们共同点：

- 都可以创建应用实例
- `CreateApp` 将自身添加到 `appInstanceMap` 作为映射表，`Wujie` 将自身通过 `addSandboxCacheWithWujie` 添加到映射表 `idToSandboxCacheMap`
- 都提供 `mount` 和 `unmount` 这两个方法，用于加载和卸载应用

这里先从 `active` 来看，按照 `startApp` 的流程顺序来

#### 1. `active` 激活应用

分 2 部分：

1. 更新配置应用信息，包含：沙箱 `iframe` 初始化、修正 `fetch`、同步路由
2. 渲染子应用

渲染子应用又可以分为 3 种情况：

1. `degrade` 主动降级渲染
2. 切换应用
3. 应用初始化，包含：正常加载、预加载

#### 1.1. 更新配置应用信息

第一步：更新配置信息

- 将 `props` 拿到的信息更新当前实例
- 等待 `iframe` 初始化 `await this.iframeReady`

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

第二步：动态修改 `fetch`

- 替换 `fetch` 为自定义函数，在函数内部使用 `getAbsolutePath` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L206)] 将 `url` 结合 `baseurl`
- 将替换的 `fetch` 作为 `iframe` 的 `fetch`，并更新实例缓存下来，以便下次获取

第三步：同步路由

- `syncUrlToIframe` 先将路由同步到 `iframe`，然后通过 `syncUrlToWindow` 同步路由到浏览器 `url`
- 同理当 `wujie` 套 `wujie` 的时候也会优先同步 `iframe` 中的子应用

> 如果子应用已启动，又是 `alive` 模式，切换应用重新激活不需要 `syncUrlToIframe`

第四步：通过 `template` 更新 `this.template`，为后面渲染应用做准备

#### 1.2. `degrade` 主动降级渲染

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
> 补充说明：为什么在“新容器”创建 `html` 元素，直接注入 `template`
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

#### 1.3. 挂载子应用

第一步：挂载子应用到容器

根据 `this.shadowRoot` 来决定挂载，分 2 个情况：

1. 切换应用
2. 初次加载，包含预加载

> `degrade` 主动降级通过 `this.document` 来区分切换应用和初次加载，而挂载应用通过 `this.shadowRoot` 来区分

切换应用时：

- 通过 `renderElementToContainer` 将 `this.shadowRoot.host` 挂载到指定容器
- 如果是 `alive` 模式跳出来，以下流程不再继续

> `this.shadowRoot.host`：
>
> - 指的是 `shadowRoot` 外层的 `web component`
> - 而 `this.shadowRoot` 是在组件 `connectedCallback` 时定义为组件的 `shadowRoot`
> - 在 `active` 模式下切换应用，`shadowRoot` 的 `template` 已在初始化时注入
> - 而非 `active` 模式下切换应用，稍后会再次更新 `template`

应用初始化时会挂载到指定容器：

- 先获取 `iframeBody`，如果容器不存在时作为备用容器
- 通过 `createWujieWebComponent` 将创建的组件挂载到指定容器

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

至此整个激活过程结束

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

#### `importHTML`

目录：`entry.ts` - `importHTML` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L200)]

用于加载和处理资源内容，相当于：

- `qiankun` 的 `importEntry` [[查看](https://github.com/cgfeel/micro-qiankun-substrate?tab=readme-ov-file#212-prefetch-%E6%89%A7%E8%A1%8C%E9%A2%84%E5%8A%A0%E8%BD%BD)]
- `micro-app` 的 `HTMLLoader` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#12-htmlloader-%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90)]

> 除了 `qiankun` 使用的是 `import-html-entry` [[查看](https://github.com/kuitos/import-html-entry)]，其他都是单独开发的

先从入参和返回看，参数为包含 3 个属性的 `params`：

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

整个流程分 3 步：

1. 提取必要的配置
2. 远程加载或直接返回要加载的资源
3. 处理资源

**1.提取必要的资源：**

- `fetch`：只能是自定义的 `fetch` 或 `window.fetch`
- `fiber`：是否空闲加载
- 提取 `plugins` 用于自定义 `loader` 处理资源，提取 `loadError` 用于提取外部资源失败时使用
- `htmlLoader`：根据 `plguins` 返回自定义处理 `loader` 函数，不存在使用默认提供的 `defaultGetTemplate`
- 通过 `getEffectLoaders` 提取 `jsExcludes`：`js` 排除列表，注 n (`getEffectLoaders`)
- 通过 `getEffectLoaders` 提取 `cssExcludes`：`css` 排除列表
- 通过 `getEffectLoaders` 提取 `jsIgnores`：`js` 忽略列表
- 通过 `getEffectLoaders` 提取 `cssIgnores`：`css` 忽略列表
- 通过 `defaultGetPublicPath` 将子应用的 `url` 和 `localhost.href` 计算出资源路径

> 注 n：`assetPublicPath`
>
> - `qiankun` 和 `micro-app` 通过 `__webpack_public_path__` 配置资源路径
> - `qiankun` 根据 `window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__` 配置
> - `micro-app` 根据 `window.__MICRO_APP_PUBLIC_PATH__` 配置
> - `wujie` 不需要配置 `__webpack_public_path__`，默认是子应用入口 `url` 为 `baseurl`

**2.获取资源：**

通过 `getHtmlParseResult` 获取资源，接受 3 个参数：

- `url`：资源远程链接
- `html`：现有的资源
- `htmlLoader`：通过 `plugins` 传入的 `htmlLoader`，不存在使用 `defaultGetTemplate`

提供 `html` 时优先使用，否则通过 `fetch` 获取资源链接，如果获取失败记录在 `embedHTMLCache`，下次不再获取

**3.处理返回资源：**

- 获取资源路径 `assetPublicPath`，注 n (`assetPublicPath`)
- 通过 `htmlLoader` 处理获取的资源，默认的 `defaultGetTemplate` 不处理直接返回
- 如果通过 `plugins` 传入 `htmlLoader` 处理，会将获取的资源作为字符参数传递过去
- 通过 `processTpl` 传入处理过后的 `html`、`assetPublicPath`，提取 `template`、`script`、`style`，见：`processTpl` 提取资源 [[查看](#processtpl-提取资源)]
- 最终返回资源对象，即上述最终返回的 `Promise<htmlParseResult>`

> 注 n：`getEffectLoaders`
>
> - 提取的资源通过 `reduce` 最终拷贝返回一个新的 `Array<string | RegExp>` 对象
> - 在 `micro-app` 中有个 `flatChildren` 方法，和 `getEffectLoaders` 的用处是一样的，见 `micro-app` 源码分析，注 ⑭ [[查看](https://github.com/cgfeel/micro-app-substrate)]

#### `processTpl` 提取资源

目录：`template.ts` - `processTpl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/template.ts#L143)]

用于从加载内容中提取出 `scripts` 和 `styles`，相当于：

- `micro-app` 中的 `extractSourceDom` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#13-extractsourcedom-%E6%88%90%E5%8A%9F%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90%E5%9B%9E%E8%B0%83)]

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
- 执行替换，按照 `replace` 分别执行

分别执行：

**1.替换备注：**

全部替换为空

**2.提取或替换 `link` 标签：**

有 3 个情况会将 `link` 标签替换为备注：

1. `ref="stylesheet"` 的样式文件，且存在 `href`
2. `ref="stylesheet"` 的样式文件，且存在 `href`，带有 `ignore` 属性
3. `preload|prefetch|modulepreload` 模式下，存在 `href` 的 `font` 类型资源

补充：

- 除了情况 2 注释不一样，其他都一样
- 只有情况 1，且没有`ignore` 属性的 `href` 链接，才会提取为 `{ src: newHref }` 添加到 `styles`
- 以上情况都不符合，会原封不动将数据返回，对于 `link` 标签不做替换

**3.提取或替换 `style` 内联样式：**

- 所有内联样式都会被注释替换
- 只有没有 `ignore` 的 `style` 才会被提取标签内容，作为 `{ src: "", content: code }` 添加到 `styles`

**4.提取或替换 `script`：**

先获取以下对象：

- `scriptIgnore`：提取带有 `ignore` 属性的 `script`
- `isModuleScript`：判断是否是 `ES` 模块的 `script`
- `isCrossOriginScript`：提取跨域行 `crossorigin` 为的 `script`
- `crossOriginType`：跨端的类型的值
  - 这里只提取 `anonymous` 不发送凭据和 `use-credentials` 发送凭据 2 个类型
  - `crossorigin` 不存在默认为空字符
- `moduleScriptIgnore`：`script` 作为被忽略的 `ES` 模块
  - 当浏览器支持 `ES` 模块而 `script` 标签带有 `nomodule` 属性
  - 或浏览器不支持 `ES` 模块并且当前 `script` 是 `module` 类型
- `matchedScriptTypeMatch`：提取 `script` 的 `type`，不存在为 `null`
- `matchedScriptType`：`script` 的 `type` 值，不存在为 `null`

分 3 个情况：

- 不是有效的可执行 `script`，直接返回不处理
- 有效的外部链接：不包含 `type="text/ng-template"` 且有 `src` 的外部 `script`
- 其他情况，如：内联 `script`、`ng-template`

以下情况会用注释替换 `script`：

- `scriptIgnore`、`moduleScriptIgnore`

**4.1 有效的外部链接，现提取 3 个对象：**

- `matchedScriptEntry`：提取的 `script` 是带有 `entry` 的主入口
- `matchedScriptSrcMatch`：提取的 `script` 是带有 `src` 属性
- `matchedScriptSrc`：`script` 的 `src` 链接或 `null`

以下情况会 `throw`：

- 多入口：`entry` 和 `matchedScriptEntry` 同时存在

以下情况会设置入口 `entry`

- `entry` 为 `null`，`matchedScriptEntry` 存在，设置为 `matchedScriptSrc`
- 在设置之前会检查并更新 `matchedScriptSrc` 为有效的 `url`

> 如果 `src` 提供的是相对路径，会根据资源路由 `baseURI` 获取相对 `url`

注释替换 `script` 的情况追加一种：

- `matchedScriptSrc` 存在时

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

> 以上属性上述已说明， `parseTagAttributes` 会提取 `<script(.*)>` 标签所有属性作为字符串返回

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

> 这里 `wujie` 没有考虑多行注释啊
