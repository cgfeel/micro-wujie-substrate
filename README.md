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

### `packages` - `wujie-react`

先大致看下 `wujie` 提供的包，分别为 [[查看](https://github.com/Tencent/wujie/tree/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages)]：

- `wujie-core`：核心包
- `wujie-react`：`React` 封装组件
- `wujie-vue2`：`Vue2` 封装组件
- `wujie-vue3`：`Vue3` 封装组件

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

关于 `defineWujieWebComponent`：

目录：`shadow.ts` - `defineWujieWebComponent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L39)]

只提供了两个方法：

- `connectedCallback`：完成挂载将自身设置为 `shadowDOM`，通过应用名获取实例 `sandbox`，将自身作为实例的 `shadowRoot`
- `disconnectedCallback`：卸载组件通过应用名获取实例 `sandbox`，并调用实例 `unmount`

在挂载组件时，将自身作为实例 `shadowRoot` 之前需要通过 `patchElementEffect` 打补丁：

- 根据沙箱 `iframe` 的 `proxyLocation` 去定义 `shadowRoot` 的 `baseURI`
- 将 `ownerDocument` 指向 `iframe` 沙箱的 `iframeWindow.document`
- 告知已补丁 `_hasPatch`，不再需要补丁
- 通过 `execHooks` 遍历 `plugins`，提取 `patchElementHook`，将 `shadowRoot` 和沙箱 `iframe` 传递过去挨个执行

### `startApp` 启动流程

目录：`index.ts` - `startApp` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L185)]

#### 1. 获取实例和配置：

**1.1 `getWujieById`，获取已存在的沙箱的实例**

- 使用应用名，从映射表 `idToSandboxCacheMap` 获取沙箱中的实例，如果沙箱不存在返回 `null`
- 目录：`common.ts` - `getWujieById` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L15)]

添加映射表有 2 个方法，分别为：

- `addSandboxCacheWithWujie` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L23C17-L23C41)]：通过 `Wujie` 这个类创建的应用
- `addSandboxCacheWithOptions`：通过 `setupApp` 设置应用信息，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

创建 `Wujie` 实例有 2 个地方：

- `preloadApp`：预加载，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/preloadApp.html)]
- `startApp`：启动应用，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

从这里可以知道：

- `preloadApp`：预加载可以极大的提升子应用首次打开速度
- `startApp`：只要应用名和链接没变，通过组件重复插入子应用不会重复创建实例
- `setupApp`：可以预先为 `startApp` 和 `preloadApp` 提供信息

关于映射表 `idToSandboxCacheMap`：

- 一个 `Map` 对象：`new Map<String, SandboxCache>()`，应用名为 `key`，实例为 `SandboxCache`
- `SandboxCache` 包含 2 个属性：`wujie`：`Wujie` 类的实例，`options`：非别来自 `preloadApp` 和 `startApp` 配置信息
- `getWujieById` 获取的就是 `wujie` 实例

**1.2 获取应用配置**

`getOptionsById` 获取配置信息：

- `getWujieById` 获取 `wujie` 实例，`getOptionsById` 拿应用名获取实例配置 `options`，不存在返回 `null`

`mergeOptions` 合并配置配置：

- 将 `startApp` 拿到的 `options` 和已存在实例的 `options` 合并得到新的配置信息，并结构提取必要的信息，见源文件 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L190)]

#### 2. 已经初始化过的应用，快速渲染：

渲染前的准备：

- 通过 `getPlugins` 更新实例的 `plugins`，关于 `wujie` 的插件见文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#plugins)]
- 更新实例的 `lifecycles`， 关于 `wujie` 的生命周期见文档 [[查看](https://wujie-micro.github.io/doc/guide/lifecycle.html)]
- 获取实例的 `iframe` 对象的 `window`：`sandbox.iframe.contentWindow`，和上面复现演示一样
- 如果实例有预加载时挂载的微任务，优先执行

根据情况进行渲染：

#### 2.1 `alive` 保活模式

和 `micro-app` 的 `keep-alive` 模式一样，详细见文档说明 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#plugins)]

- 优点：切换路由不销毁应用实例，路由、状态不会丢失，在没有生命周期管理的情况下，减少白屏时间
- 缺点：多个菜单栏跳转到子应用的不同页面，不同菜单栏无法跳转到指定子应用路由

流程分 3 步：

- 激活子应用：`sandbox.active`，注 ①
- 预加载但是没有执行的情况 `!sandbox.execFlag`，提取执行脚本重新 `start` 实例，注 ②
- 将 `iframeWindow` 传递过去通知 `activated`，并返回注销应用的方法

> 注 ①：将拿到的最新的配置信息传递给 `sandbox.active` 激活应用
>
> 目录：`sandbox.ts` - `Wujie` - `active` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L139)]
>
> 第一步：更新配置信息
>
> - 将 `props` 拿到的信息更新当前实例
> - 等待 `iframe` 初始化 `await this.iframeReady`
>
> 关于 `iframeReady`：
>
> 目录：`iframe.ts` - `iframeGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L815)]
>
> - 目的用于确保 `iframe` 初始化
> - 在 `Wujie` 实例构造函数时 `iframeGenerator` 已发起了 `stopIframeLoading` 微任务
> - 在激活时通过 `this.iframeReady` 确保已完成了初始化
> - 保活的情况下切回应用可能不需要考虑，除此之外在应用加载也需要通过 `active` 来激活应用，这个时候 `frameworkStartedDefer` 就很有用了
>
> 还记得 `qiankun` 里的 `frameworkStartedDefer` 吧，`iframeReady` 和 `frameworkStartedDefer` 用途是一样的
>
> 第二步：动态修改 `fetch`
>
> - 替换 `fetch` 为自定义函数，在函数内部使用 `getAbsolutePath` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L206)] 将 `url` 结合 `baseurl`
> - 将替换的 `fetch` 作为 `iframe` 的 `fetch`，并更新实例缓存下来，以便下次获取
>
> 第三步：同步路由
>
> - `syncUrlToIframe` 先将路由同步到 `iframe`，然后通过 `syncUrlToWindow` 同步路由到浏览器 `url`
> - 如果是 `alive` 模式，重新激活不需要 `syncUrlToIframe`
> - 同理当 `wujie` 套 `wujie` 的时候也会优先同步 `iframe` 中的子应用
>
> 第四步：注入 `template` 更新 `this.template`
>
> 第五步：`degrade` 主动降级
>
> - 采用 `iframe` 替换 `webcomponent`，`Object.defineProperty` 替换 `proxy`
> - 对于不支持的环境会自动降级，除此之外还可以通过 `degrade` 主动降级
> - 一旦采用降级方案，弹窗由于在 `iframe` 内部将无法覆盖整个应用
> - 关联属性 `degradeAttrs`，配置详细见 `start` 文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]
>
> 原理：
>
> - `rawDocumentQuerySelector` 获取 `window` 或子应用内沙箱 `iframe` 的 `body`
> - `initRenderIframeAndContainer` 优先挂载到指定容器，不存在挂载在刚才的拿到的 `iframeBody`
> - `initRenderIframeAndContainer` 内部做了两件事：创建 `iframe` 并写入 `attrs`，渲染到容器后重写 `iframe` 的 `document`
> - 为了便于理解以下描述 `iframeBody` 指沙箱 `iframe` 的 `body`，新创建的称作 `iframe`，用于代替 `web component`
> - 将挂载的容器更新 `this.el`
> - `clearChild` 销毁 `js` 运行 `iframeBody` 容器内部 `dom`
> - `patchEventTimeStamp` 修复 `vue` 的 `event.timeStamp` 问题
>
> 如果存在子应用的 `document`，且 `alive` 模式下：
>
> - 将子应用的 `<html>` 替换新创建的 `iframe` 的 `<html>`
> - 通过 `recoverEventListeners` 遍历子应用的 `<html>` 所有元素
> - 通过 `elementEventCacheMap` 获取每个元素的事件集合做两件事：将集合添加到新的 `WeakMap` 对象 `elementEventCacheMap`，遍历集合为子应用对应的元素添加事件
> - 最后将过滤后的事件更新沙箱实例中的 `elementEventCacheMap` 属性
>
> 如果存在子应用的 `document`，不是 `alive` 模式：
>
> - 通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` 中
> - 在方法内部通过 `renderTemplateToHtml` 使用 `iframeWindow` 创建一个 `html` 根元素，并把 `template` 作为元素内容并返回回来
> - 通过 `processCssLoaderForTemplate` 处理 `html` 中的 `css-before-loader` 以及 `css-after-loader`，详细见插件系统 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-before-loaders)]
> - 将处理后的 `processedHtml` 替换创建的 `iframe` 的 `html`
> - 创建一个 `iframe` 中的 `html` 劫持对象，使其 `parentNode` 这个属性，可枚举 `enumerable`，可修改值 `configurable`，调用方法时指向 `iframeWindow.document`，关于对象的属性劫持见上方复现 [[查看](#wujie-复现)]
> - 通过 `patchRenderEffect`，重写了 `head`、`body` 的事件、 `appendChild` 或 `insertBefore` 方法
> - `recoverDocumentListeners` 非保活场景需要恢复根节点的事件，防止 `react16` 监听事件丢失，原理和 `recoverEventListeners` 是一样的
>
> 对于不存在子应用 `document` 的情况，只需通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` 中。
>
> 最后无论有没有子应用 `document`，都将创建的 `iframe.contentDocument` 作为当前实例（子应用）的 `document`，方便下次激活时直接使用，至此整个降级过程完成
