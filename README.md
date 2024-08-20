# micro-wujie-substrate

一个 `wujie` 基座，完整内容查看微前端主仓库：https://github.com/cgfeel/zf-micro-app

`wujie` 和其他的微前端（`qiankun`、`micro-app`）解决方案不同点：

| 对比项   | `wujie`                                    | 其他微前端                                  |
| -------- | ------------------------------------------ | ------------------------------------------- |
| `script` | 放到沙箱 `iframe`                          | 放到自己实现的沙箱，如：`proxy`、快照中实现 |
| `css`    | 通过 `web component` 放到 `shadowDOM` 渲染 | 修改 `css` 作用域 `scopedCSS`               |

优点，天然隔离：

- 不需要自定义沙箱，直接使用 `iframe`，不需要遍历 `css` 计算 `scoped`

亮点：

- 理论上 `wujie` 可以把任何对外提供访问的网页做成子应用
- 提供 `iframe` 降级方案，对于不支持 `proxy` 和 `shadowDOM` 的情况

缺点：

- 对 `React v18` 并不友好，严格模式下会产生协议错误，见：issue [[查看](https://github.com/Tencent/wujie/issues/672)]
- 路由同步并不友好，子应用路由只能通过 `search` 反应到主应用中，不能使用 `pathname`

> 路由同步看过源码，目前设计只能通过 `search` 来实现，就是这么简单粗暴

疑惑：`wujie` 频繁操作 `Dom` 直接影响 `js` 性能

- 比如说非 `alive`模式或 `umd`模式下，`wuijie` 的每次应用切换，就是一次注销和重建
- `wujie` 不需要修正 `css` 的 `scope`，但要为子应用每一个元素打补丁，见 `patchElementEffect` [[查看](#patchelementeffect为元素打补丁)]

渲染原理：

| 分类        | 原理                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| `wujie`     | 拉取 `template` 放入 `web component`，将其挂载到指定节点                    |
| `micro-app` | 创建 `web component` 拉取资源，替换标签为自定义组件，由 `Dom tree` 渲染组件 |
| `qiankun`   | 基于 `single-spa`，拉取 `template`，劫持 `url` 经过计算将资源渲染到指定容器 |

> `micro-app` 也支持 `shadowDom` 和 `iframe` 沙箱，但需要在 `start` 时手动启用

总结分成 3 个部分：`wujie` 使用、复现和原理，项目全部整合在：

- `/wujie` [[查看](https://github.com/cgfeel/zf-micro-app/tree/main/wujie)]

## `wujie` 使用

包含项目：

- `react-project`：通过 `create-react-app` 搭建的子应用 [[查看](https://github.com/cgfeel/micro-wujie-app-cra)]
- `static-project`：自定义静态应用 [[查看](https://github.com/cgfeel/micro-wujie-app-static)]
- `substrate`：通过 `create-react-app` 搭建的基座主应用 [[查看](https://github.com/cgfeel/micro-qiankun-substrate)]
- `vue-project`：通过 `vue-cli` 搭建的子应用 [[查看](https://github.com/cgfeel/micro-wujie-app-vue3)]

### 搭建基座主应用

先回顾下 `micro-app` 基座流程：

- 入口文件 `start` 配置启动项
- 指定页面插入自定义组件 `<micro-app />`

> `micro-app` 会将加载的资源注入 `web component`

`wujie` 可以不使用 `start` 启动配置：

- 创建一个公共的组件 `Wujie.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/components/Wujie.tsx)]
- 通过 `startApp` 将 `web component` 添加的子应用挂载到指定的 `ref` 节点 [[查看](#startapp-启动流程)]
- 可以通过调用组件的方式加载子应用，例如: `react` 子应用 [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/ReactPage.tsx)]

> `wujie` 不需要通过 `start` 强制配置启动，但提供 `setupApp` 用来缓存配置，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

珠峰的课程中有两个错误：

- 官方文档不建议手动注销 `destroyApp` 子应用，如果还需要使用子应用的话 [[查看](https://wujie-micro.github.io/doc/api/destroyApp.html)]
- `startApp` 会返回一个方法 `destory`，可以直接用于注销应用，而不用传给 `destroyApp`，同样也不建议主动注销，会导致下次打开该子应用有白屏时间

### 搭建子应用

`react` 子应用：

- `.env`：需要修改端口号 [[查看](https://github.com/cgfeel/micro-wujie-app-cra/blob/main/.env)]

`vue` 子应用：

- `vue.config.js`：需要允许 `cors` [[查看](https://github.com/cgfeel/micro-wujie-app-vue3/blob/main/vue.config.js)]

可选：对于 `umd` 应用

- `global.d.ts`：添加全局类型声明 [[查看](https://github.com/cgfeel/micro-wujie-app-cra/blob/main/src/global.d.ts)]
- 入口文件暴露 `__WUJIE_MOUNT` 和 `__WUJIE_UNMOUNT` [[查看](https://github.com/cgfeel/micro-wujie-app-cra/blob/main/src/index.tsx)]

通过以上了解对 `wujie` 初步印象：

- `Tencent` 对通信非常偏爱，比如：`alloy-worker` [[查看](https://github.com/AlloyTeam/alloy-worker)]，还有小程序 `postMessage`

---- 分割线 ----

## `wujie` 复现

简单实现 `iframe` 和 `shadowRoot` 通信，详细见项目中的源码：

- 项目：`static-project` [[查看](https://github.com/cgfeel/micro-wujie-app-static)]
- 文件：`ifram2shadow-dom.html` [[查看](https://github.com/cgfeel/micro-wujie-app-static/blob/main/ifram2shadow-dom.html)]
- 运行方式：直接点开浏览器预览、或 `http-server`

整体分 4 部分：

- `index.html`：基座 `html` 文件
- `template`：子应用要运行的 `css` 和 `html`，要放入 `shadowDOM` 中
- `strScript`：子应用要执行的脚本字符，要放入 `iframe` 中
- `createCustomElement`：主应用自定义组件

`createCustomElement` 流程分 4 部分：

1. `createSandbox`：创建沙箱
2. `attachShadow`：创建 `shadowRoot`
3. `injectTemplate`：将 `css` 和 `html` 注入 `shadowRoot`
4. `runScriptInSandbox`：将 `js` 注入 `iframe`

沙箱分 2 个：

- `shadowRoot`：直接将 `css` 和 `html` 全部打包到一个 `div`，塞入 `shadowRoot`
- `iframe`：创建一个 `script` 元素，将执行的 `js` 作为元素内容插入 `iframe` 的 `head`

在 `script` 添加到 `iframe` 之前：

- 需要劫持 `iframe` 内 `script` 的方法，将上下文指向 `shadowRoot`

流程：

- 通过 `Object.defineProperty` 劫持 `iframe` 中的 `document.querySelector`
- 返回一个 `Proxy` 对象，代理 `sandbox.shadowRoot.querySelector`
- 在 `Proxy` 中通过 `apply` 纠正上下文 `this` 指向 `shadowDOM`

`Object.defineProperty` 劫持对象会执行两次 [[查看](https://github.com/cgfeel/micro-wujie-app-static/blob/d89ae52aa0418d9f7e3cec8ff289cd8dd5edbb1e/index.html#L80)]

第一次：由 `iframe` 中的子应用发起 `document.querySelector`

- 通过 `Object.defineProperty` 劫持 `iframeWindow.Document.prototype` 并返回 `Proxy` 对象
- 在 `Proxy` 对象首次 `apply` 时，参数 `thisArgs` 指向劫持的对象 `iframeWindow.Document.prototype`
- 返回 `thisArgs.querySelector` 相当于 `iframeWindow.Document.prototype.querySelector.apply(sandbox.shadowRoot, args)`
- 通过 `apply` 将上下文指向 `sandbox.shadowRoot`

第二次：由于 `Proxy` 对象再次调用了 `iframe` 的 `querySelector`，于是再次 `Object.defineProperty`

- 这个时候返回的 `Proxy` 对象 `apply` 中 `thisArgs` 指向 `sandbox.shadowRoot`
- 返回 `thisArgs.querySelector` 相当于：`sandbox.shadowRoot.querySelector.apply(sandbox.shadowRoot, args)`
- 由于这次是通过 `sandox` 发起 `querySelector`，将不再被 `iframe` 劫持

> 可以打开调试窗口 `sources` 在 `Proxy` 对象的 `apply` 方法中打上断点，刷新查看每次执行的上下文 `thisArgs` 的变化

劫持对象场景发散：

- 浮窗：劫持 `document`，捕获 `Dom` 对象指向 `shadowRoot`
- `iframe` 中 `history` 对象：实现同步同步

> 这部分将通过 `wujie` 源码解读在下方总结

---- 分割线 ----

## `wujie` 原理

和 `qiankun` 解读一样，为了便于阅读全部以当前官方版本 `9733864b0b5e27d41a2dc9fac216e62043273dd3` [[查看](https://github.com/Tencent/wujie/tree/9733864b0b5e27d41a2dc9fac216e62043273dd3)] 为准

> 这一章节链接指向官方仓库，由于内容比较长，每一条信息我都暴露了关键的对象名，可以打开链接复制关键的对象名，查看上下文对照理解。

先大致看下 `wujie` 提供的包，分别为 [[查看](https://github.com/Tencent/wujie/tree/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages)]：

- `wujie-core`：核心包 [[查看](#定义-web-component)]
- `wujie-react`：`React` 封装组件 [[查看](#packages---wujie-react)]
- `wujie-vue2`：`Vue2` 封装组件
- `wujie-vue3`：`Vue3` 封装组件

> 不是 `vue` 技术栈，并且封装的包是作为可选使用的单个组件，不是必须使用的

由于总结会很长，所以我将整个流程总结精简放在前面：

1. `preloadApp` 预加载（非 `alive` 模式和非预执行下的 `umd` 模式不推荐）[[查看](#preloadapp-预加载流程)]
2. `startApp` 根据实例情况决定初始化还是切换应用 [[查看](#startapp-启动流程)]
3. 首次启动和切换重建模式的应用，会 `destroy` 销毁后重新初始化 [[查看](#-destroy-销毁实例)]
4. 声明实例，创建沙箱 `iframe`、代理 `proxy`、通信 `EventBus` 等 [[查看](#-constructor-构造函数)]
5. `importHTML` 加载资源 [[查看](#importhtml-加载资源)]
6. `processCssLoader` 处理 `css-loader` [[查看](#processcssloader处理-css-loader)]
7. `active` 激活应用：将 `template` 根据 `degrade` 放入 `iframe` 容器或 `shadowRoot` 容器 [[查看](#-active-激活应用)]
8. `start` 启动应用：将 `script` 放入沙箱 `iframe`，发起通知事件和 `mount` [[查看](#-start-启动应用)]
9. 返回 `destroy` 以便手动销毁 [[查看](#-destroy-销毁实例)]

> 阅读建议，如果你做好准备阅读以下内容，这样可以提高效率：
>
> - “查看”指向源码链接或详细说明，记录罗列了关键内容，可以通过复制查找定位
> - 建议按照流程线去阅读
>
> 比如说：
>
> - 首次加载应用：从 `startApp` 开始，忽略已存在应用实例的情况，只看声明实例
> - 切换应用：从 `startApp` 开始，只看存在应用实例的情况
> - 预加载：从 `preloadApp` 开始看

### 定义 `web component`

`wujie` 和 `micro-app` 组件定义不同处：

| 分类                       | `micro-app`                                                                                                                                                                                       | `wujie`                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 挂载方式                   | 手动挂载 `web component` 到指定 `components tree` 中渲染                                                                                                                                          | 自动挂载，`active` 激活应用时通过 `createWujieWebComponent` 创建自定义组件，挂载到指定容器 [[查看](#-active-激活应用)] |
| 自定义组件名               | 支持                                                                                                                                                                                              | 不支持                                                                                                                 |
| 接受的属性                 | `name`、`url`、`iframe` 等配置，见：文档 [[查看](https://micro-zoe.github.io/micro-app/docs.html#/zh-cn/configure?id=%e9%85%8d%e7%bd%ae%e9%a1%b9)]                                                | 仅支持 `WUJIE_APP_ID` [[查看](#激活应用的补充)]                                                                        |
| `attributeChangedCallback` | 检查子应用 `name` 和 `url` 属性变更 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#11-attributechangedcallback-%E8%A7%82%E5%AF%9F%E5%B1%9E%E6%80%A7%E4%BF%AE%E6%94%B9)] | 不支持，但是子应用的 `name` 和 `url` 可以作为 `React` 组件的 `props`，更新后重新渲染并挂载到容器                       |
| `connectedCallback`        | 使用组件自增编号添加当前组件到映射表，并发起应用挂载                                                                                                                                              | 根据应用名拿到实例，打补丁后将 `shadowRoot` 绑定到实例中 [[查看](#connectedcallback挂载组件)]                          |
| `disconnectedCallback`     | 用组件编号从映射表中下线组件，并发起应用卸载                                                                                                                                                      | 根据应用名拿到实例并发起卸载 [[查看](#disconnectedcallback-卸载组件)]                                                  |
| 自定义更新组件             | 规则组件内部定义好了，只接受 `name` 和 `url` 的变更则                                                                                                                                             | 一旦更新应用就一定是重新渲染                                                                                           |
| 组件用途                   | 应用通信、资源容器、派发事件、决定启动和注销方式                                                                                                                                                  | 资源容器                                                                                                               |
| 优缺点                     | 强大，但功能上分工不清晰，`MicroAppElement` 处理完之后 `CreateApp` 还要做一遍对应操作，如：组件和应用分别 `mount`                                                                                 | 简单，几乎不用关心 `web component`，但很粗暴，只存在挂载和卸载，一旦更新就一定是销毁后重新挂载，效率不高               |

#### 关于 `defineWujieWebComponent`

目录：`shadow.ts` - `defineWujieWebComponent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L39)]

声明 `WujieApp` 自定义组件：

- 在入口文件中默认执行，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L170)]

> 因此，引入 `wujie` 包的时候就已经定义了 `web component`

`WujieApp` 提供了挂载和卸载 2 个方法

#### `connectedCallback`：挂载组件

- 设置 `shadowRoot` 模式为 `open`
- 通过 `getWujieById` 使用属性 `WUJIE_APP_ID` 拿到应用实例，见：`idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]
- 通过 `patchElementEffect` 为 `shadowRoot` 打补丁 [[查看](#patchelementeffect为元素打补丁)]
- 将 `shadowRoot` 绑定到实例上

几个概念名词：

- `web component`：通过 `WujieApp` 定义的组件，这里定义的组件名是 `wujie-app`
- `shadowRoot`：`shadowDom` 的根节点，与之相似有 `document` 是 `Dom` 的根节点
- `shadowRoot.host`：返回 `shadowRoot` 附加到 `Dom` 元素的引用，即：`web component`
- `shadowRoot.host.parentElement`：`web component` 的父节点，用于获取 `shadowRoot` 挂载节点
- `shadowRoot.firstChild`：`shadowRoot` 下第一个元素，在 `wujie` 中是 `html` 元素
- `documet.documentElement`：`document` 下的根元素，如：`html` 元素

> 以上几个对象将会在 `wujie` 中高频出现

#### `disconnectedCallback` 卸载组件

- 通过 `getWujieById` 使用属性 `WUJIE_APP_ID` 拿到应用实例，见：`idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]
- 发起卸载操作，见：`unmount` [[查看](#-unmount-卸载应用)]

### `startApp` 启动流程

目录：`index.ts` - `startApp` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L185)]

分 3 步：

1. 获取、更新配置信息
2. 存在沙箱实例就切换或销毁应用
3. 不存在沙箱实例或被销毁的应用，创建新的沙箱实例

运行应用分为 3 个模式：

1. `alive` 保活模式，启动和切换应用不会销毁实例 [[查看](#21-alive-保活模式运行应用)]
2. `umd` 单例模式，子应用通过 `window.__WUJIE_MOUNT` 重新渲染 [[查看](#22-umd-模式切换应用)]
3. 重建模式，其他方式都注销当前实例，等待重新创建 [[查看](#23-destroy-注销应用)]

有关 `wujie` 的运行模式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/mode.html)]

![`wujie` 的运行模式](https://github.com/cgfeel/micro-wujie-substrate/assets/578141/c4473f5d-9845-4df4-bac6-4506f8202a3d)

备注：

- `umd` 在文档中称为单例模式，为了和 `qiankun`、`micro-app` 对齐，以下统称 `umd` 模式
- 如果你的应用在切换时看到白屏建议使用 `alive` 模式或 `umd` 模式

#### 1. 获取应用实例和配置

从映射表 `idToSandboxCacheMap` 获取已记录的实例和配置 [[查看](#1-idtosandboxcachemap存储无界实例和配置)]：

- `getWujieById`：使用应用名获取应用实例，不存在返回 `null`
- `getOptionsById`：使用应用名获取已缓存的配置，不存在返回 `null`

> 配置只能通过 `setupApp` 缓存，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

合并并提取配置：

- 通过 `mergeOptions` 合并参数提供的配置和缓存的配置
- 解构并提取必要的配置，关于配置见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

#### 2. 存在沙箱实例，运行或销毁应用

应用场景：

| 模式    | 预加载后启动 | 预执行后启动 | 切换应用 |
| ------- | ------------ | ------------ | -------- |
| `alive` | 运行         | 运行         | 运行     |
| `umd`   | 销毁         | 运行         | 运行     |
| 重建    | 销毁         | 销毁         | 销毁     |

> 没有预加载初次 `startApp` 不存在应用实例，所有模式都必须创建实例 [[查看](#3-创建新的沙箱实例)]

渲染前的准备：

- 通过 `getPlugins` 更新实例的 `plugins`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#plugins)]
- 更新实例的 `lifecycles`， 见：文档 [[查看](https://wujie-micro.github.io/doc/guide/lifecycle.html)]
- 获取实例的 `iframeWindow` 对象，用于查看子应用挂载方法 `__WUJIE_MOUNT`
- 如果是预加载应用，需要等待预加载执行完毕，见：`runPreload` [[查看](#3-预加载微任务-runpreload)]

#### 2.1 `alive` 保活模式运行应用

和 `micro-app` 的 `keep-alive` 模式一样：

- 优点：切换路由不销毁应用实例，路由、状态不会丢失，在没有生命周期管理的情况下，减少白屏时间
- 缺点：多个菜单栏跳转到子应用的不同页面，不同菜单栏无法跳转到指定子应用路由

流程分 3 步：

**第一步：激活应用**

- 激活应用时会将 `shadowRoot.host` 挂载到指定 `el` 节点，见：`active` [[查看](#1-active-激活应用)]
- 由于 `alive` 模式不会销毁容器，所以激活时也不需要注入资源，见：容器在哪清除 [[查看](#5-容器在哪清除)]

**第二步：`start` 应用**

预加载但是没有 `exec` 预执行的情况下需要 `start` 应用：

- 调用生命周期中的 `beforeLoad`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#beforeload)]
- 通过 `importHTML` 提取需要加载的 `script` [[查看](#importhtml-加载资源)]
- 将提取的方法 `getExternalScripts` 传入 `sandbox.start` 启动应用 [[查看](#-start-启动应用)]

**第三步：`alive` 加载完成**

- 调用生命周期中的 `activated` 并返回子应用注销函数 `sandbox.destroy`
- 这里存在 `activated` 调用 2 次的情况，见：6.预加载中的 `bug` [[查看](#6预加载中的-bug)]

#### 2.2 `umd` 模式切换应用

通过 `umd` 切换应用的条件：

- 子应用存在 `__WUJIE_MOUNT` 方法挂载到 `iframeWindow`
- 预加载时通过 `exec` 预执行后 `startApp`，或完成首次 `startApp` 后每次切换回应用

**第一步：重新加载资源**

- 卸载应用实例，见：`unmount` [[查看](#-unmount-卸载应用)]
- 重新激活应用，见：`active` [[查看](#-active-激活应用)]
- 恢复动态加载的样式，见 `rebuildStyleSheets` [[查看](#-rebuildstylesheets-重新恢复样式)]

`unmount` 卸载应用：

- 清空容器、清理路由和事件，将应用还原至初始状态
- 否则 `active` 时可能会重复添加资源到容器，见：容器在哪清除 [[查看](#5-容器在哪清除)]

`active` 激活应用：

- 无论是 `preloadApp` 已加载过资源，还是切换应用，容器都会在 `unmount` 时清空
- 激活应用时会再次同步路由，并重新将资源注入容器

`rebuildStyleSheets` 恢复样式：

- `umd` 模式切换应用后，只促发 `mount` 函数挂载应用
- 应用中动态添加的样式需要通过 `styleSheetElements` 收集并恢复 [[查看](#2-stylesheetelements-收集样式表)]
- 完整的样式恢复表，见：应用中的 `css` 在哪里加载 [[查看](#5-应用中的-css-在哪里加载)]

**第二步：挂载应用**

和 `mount` 挂载 `umd` 模式的应用是一样的，见：`umd` 方式启动 [[查看](#1-umd-方式启动)]

做了 4 件事：

1. 挂载前使用沙箱的 `iframeWindow` 调用 `beforeMount`
2. 挂载应用，调用子应用 `__WUJIE_MOUNT`
3. 挂载后使用沙箱的 `iframeWindow` 调用 `afterMount`
4. 激活 `mountFlag` 表明已挂载，避免重复挂载，将 `destroy` 注销方法返回

#### 2.3 `destroy` 注销应用

流程：

- 见：`WuJie` 应用类的 `destroy` 方法 [[查看](#-destroy-销毁实例)]

注销应用的场景：

- 见：存在沙箱实例，运行或销毁应用 - 应用场景表格 [[查看](#2-存在沙箱实例运行或销毁应用)]

条件匹配的应用会注销已缓存实例后，再重新创建新实例：

- 包括重新提取资源、替换资源、转变为 `html` 注入容器，挂载容器，等一系列操作
- 因此可能会导致短暂白屏的现象，要避免这种情况建议使用 `alive` 或 `umd` 模式

> 注销应用后再次创建实例，会优先使用缓存提取并加载资源 [[查看](#2-资源缓存集合)]

#### 3. 创建新的沙箱实例

这一过程和 `preloadApp` 预加载应用流程是一样的 [[查看](#preloadapp-预加载流程)]：

| 流程               | 描述                                                                                                                   | `preloadApp`                   | `startApp`                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `addLoading`       | 启动应用时添加 `loading` [[查看](#启动应用时添加删除-loading)]                                                         | 不需要                         | 需要                                                                     |
| `sandbox`          | 通过 `WuJie` 声明实例，见：`constructor` [[查看](#-constructor-构造函数)]                                              | 需要                           | 需要                                                                     |
| `beforeLoad`       | 传递 `iframeWindow` 调用生命周期，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/lifecycle.html#beforeload)] | 需要                           | 需要                                                                     |
| `importHTML`       | 提取应用资源 [[查看](#importhtml-加载资源)]                                                                            | 需要                           | 需要                                                                     |
| `processCssLoader` | 处理 `css-loader`，并更新已提取的资源 [[查看](#processcssloader处理-css-loader)]                                       | 需要                           | 需要                                                                     |
| `alive`            | 激活应用 [[查看](#-active-激活应用)]                                                                                   | 需要                           | 除了预加载提供的参数外，还包括：`sync` 同步路由、`el` 挂载容器           |
| `start`            | 启动应用 [[查看](#-start-启动应用)]                                                                                    | 仅在提供 `exec` 预加载时才执行 | 需要                                                                     |
| `destroy`          | 返回注销方法 [[查看](#-destroy-销毁实例)]                                                                              | 不返回                         | 仅在 `start` 正常情况下返回，见：`bug` [[查看](#4-start-启动应用的-bug)] |

#### 4. `startApp` 的 `bug`

同样适用于 `preloadApp`：

- 启动或预加载应用时不提供 `name` 和 `url` 怎么处理

虽然在 `ts` 中已却明要求这两个参数必须提供：

- 但如果 `ignore` 或使用 `js` 的情况没有提供参数怎么处理

`micro-app` 中的处理方式：

- 在 `defineElement` 的 `attributeChangedCallback` 中观察 `name` 和 `url` 两个属性
- 只有都符合要求才开始挂载组件

#### 5. 应用中的 `css` 在哪里加载

| 分类                  | 加载方式                                                                         | 场景                                        |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| 应用内的静态样式      | `processCssLoader` [[查看](#processcssloader处理-css-loader)]                    | `preloadApp`、首次 `startApp` 初始化实例    |
| 手动配置 `css-loader` | `processCssLoaderForTemplate` [[查看](#processcssloaderfortemplate手动添加样式)] | `alive` 首次激活、其他模式每次激活          |
| 应用内的动态样式      | `patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]                    | `alive` 和 `umd` 首次激活、重建模式每次激活 |
| `umd` 模式恢复样式    | `rebuildStyleSheets` [[查看](#-rebuildstylesheets-重新恢复样式)]                 | 切换 `umd` 应用、`umd` 预执行后启动         |

> 加载的顺序也按照表格从上至下

`spa` 应用基本都是动态加载样式：

- `alive` 模式：切换应用不会销毁实例，所以下次激活时不用重复加载样式
- `umd` 模式：切换应用时只执行 `mount` 方法，之前加载的样式需要通过 `rebuildStyleSheets` 恢复
- 重建模式：每次启动都会重新注入 `css`

#### 6. 应用中的 `script` 在哪里加载

- `start`：通过 `execQueue` 队列加载：`js-loader`、子应用静态 `script` [[查看](#-start-启动应用)]
- `patchRenderEffect`：激活应用时，将入口 `script` 注入沙箱中，动态添加 `script chunk` [[查看](#patchrendereffect-为容器打补丁)]

`spa` 应用基本都是动态加载 `script chunk`：

- `alive` 模式：切换应用不会销毁实例，所以下次激活时不用重复加载 `script`
- `umd` 模式：卸载应用 `unmount` 时，只清空 `shadowRoot` 不清空沙箱，切换应用不需要重复加载 `script`
- 重建模式：每次启动都会重新注入 `script`

> 目前：主动降级时 `umd` 模式不清空容器，原因我想可以是因为 `hrefFlag`，要做分支判断

### `preloadApp` 预加载流程

目录：`index.ts` - `preloadApp` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L282)]

参数：`preOptions`，见官方文档 [[查看](https://wujie-micro.github.io/doc/api/preloadApp.html)]

`preloadApp` 预加载通过 `requestIdleCallback` 在空闲时间处理，不处理的情况有 2 个：

- 应用实例已存在
- 当前的 `url.search` 能够找到预加载的应用名，此时需要直接加载

> 同一个应用不能重复预加载，否则会造成误判，如：`active` 时因为 `shadowRoot` 存在而又找不到 `el` 挂载点

预加载分 3 步：

#### 1. 获取配置

- 通过 `getOptionsById` 获取配置信息 `cacheOptions`
- 通过 `mergeOptions` 合并参数 `preOptions` 和 `cacheOptions`，优先采用 `preOptions`
- 从合并的 `options` 中提取配置用于预加载

> 配置信息只能通过 `setupApp` 缓存，如果没有缓存则返回 `null`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

#### 2. 声明一个实例

- 将拿到的配置信息通过 `Wujie` 声明实例 `sandbox`
- 通过 `runPreload` 为实例挂起一个微任务 `preload`

> 微任务挂载在实例上 `sandbox.preload`，在 `startApp` 时会通过 `await` 确保预加载已完成才能继续加载应用，这种方式和 `qiankun` 中的 `frameworkStartedDefer` 原理是一样的

#### 3. 预加载微任务 `runPreload`

- 使用 `iframeWindow` 调用生命周期 `beforeLoad`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/lifecycle.html#beforeload)]
- 通过 `importHTML` 获取应用资源，此时资源中的样式和 `script` 都替换成注释 [[查看](#importhtml-加载资源)]
- 通过 `processCssLoader` 处理 `css-loader` 并加载资源中的静态样式替换对应注释 [[查看](#processcssloader处理-css-loader)]
- 激活应用 `active` [[查看](#-active-激活应用)]
- 根据配置 `exec` 决定是否启动应用 `start` [[查看](#-start-启动应用)]

默认 `exec` 不会预执行：

- 从 `importHTML` 提取 `getExternalScripts` 并执行，见：发挥的作用 [[查看](#getexternalscripts加载-script-资源)]
- 通过 `await` 会将此前已经提交微任务的队列作为上下文同步任务执行

#### 4. 对比 `startApp` 的配置

对比文档会发现 `preloadApp` 的配置和 `startApp` 差别挺大：

- 但是可以通过 `setupApp` 提前缓存配置，所以单纯从文档对比就失去意义了
- 从声明实例比较，`preloadApp` 和 `startApp` 提供的参数是一样的
- 只有 `active` 激活应用时参数各有不同

预加载缺少 `loading`：

- 预加载的应用不需要 `loading`，而 `startApp` 会通过 `addLoading` 创建 `loading` [[查看](#启动应用时添加删除-loading)]
- 有没有 `loading` 将会决定 `renderElementToContainer` 注入资源时是否清空挂载节点 [[查看](#renderelementtocontainer将节点元素挂载到容器)]

预加载不需要提供挂载容器 `el`：

- 沙箱的 `iframe` 将作为临时的容器，应用会在 `active` 激活时注入 `iframe`
- 而沙箱 `iframe` 在页面中是不可见的，因此也看不到预加载的应用
- `startApp` 时会通过 `active` 从沙箱 `iframe` 中销毁，或取出挂载到指定节点，见：容器在哪清除 [[查看](#5-容器在哪清除)]

引发了一个思考：

- 把所有的子应用全部预加载到 `iframe` 中，会不会对基座的 `document` 产生影响
- 答案是不会，对此做了一个测试：10w 表单在不同容器下的表现 [[查看](https://codepen.io/levi0001/pen/xxoVLXx)]

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

- `micro-app` 预加载参考，见：`microApp.start` - 注 ⑥ [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#microappstart-%E5%90%AF%E5%8A%A8%E5%BA%94%E7%94%A8)]
- `micro-app` 预执行主要体现在沙箱对预渲染的处理，见：2.3. `WithSandBox` 默认沙箱 - 看预渲染相关部分 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#23-withsandbox-%E9%BB%98%E8%AE%A4%E6%B2%99%E7%AE%B1)]

#### 6.预加载中的 `bug`

**问题 1：`activated` 重复调用**

- 预加载 `alive` 模式的应用，默认 `exec` 不预执行，在 `startApp` 启动应用的时候生命周期 `activated` 会调用 2 次

哪 2 次：

- `start` 应用时队列执行 `mount` 调用 1 次
- `start` 之后返回 `destory` 前调用 1 次

**问题 2：缺失必要的参数判断**

- 见：`startApp` 的 `bug` [[查看](#4-startapp-的-bug)]

#### 7.预加载的意义

预加载优化有 4 点：

1. 提前缓存应用入口资源，加载并缓存资源中的样式和 `script` [[查看](#2-资源缓存集合)]
2. 提前将 `template` 注入沙箱 `body` 作为临时容器，见：`active` [[查看](#-active-激活应用)]
3. 提前将 `script` 注入沙箱 `head`，见：`start` [[查看](#-start-启动应用)]
4. 提前收集样式元素打补丁，见：`styleSheetElements` [[查看](#2-stylesheetelements-收集样式表)]

不同模式下预加载对应的优化点：

| 模式    | 预加载 | 预执行  |
| ------- | ------ | ------- |
| `alive` | 1、2   | 1、2、3 |
| `umd`   | 1      | 1、3、4 |
| 重建    | 1      | 1       |

- `umd` 和重建模式预加载后 `startApp` 会销毁实例，只能用于提前缓存资源
- `umd` 预执行后 `startApp` 会清空容器重新注入资源
- `umd` 模式需要用到 `styleSheetElements`，其他模式不需要

除此之外可以通过 `setupApp` 提前缓存配置，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

- 这样避免预加载和启动应用时重复填写配置信息

### `WuJie` 应用类

目录：`sandbox.ts` - `WuJie` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L50)]

用于创建应用实例，和 `micro-app` 的 `CreateApp` 的作用是一样的 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#createapp-%E5%88%9B%E5%BB%BA%E5%BA%94%E7%94%A8%E7%B1%BB)]：

| 分类           | `micro-app`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `wujie`                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 创建实例       | `CreateApp`：应用实例类 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#createapp-%E5%88%9B%E5%BB%BA%E5%BA%94%E7%94%A8%E7%B1%BB)]                                                                                                                                                                                                                                                                                                                                                                           | `WuJie`：应用实例类，也是沙箱实例类                                                                                 |
| 映射表         | `appInstanceMap` 应用实例映射表，和组件映射表不同                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `idToSandboxCacheMap` 实例映射表，可以通过应用名从映射表获取实例 [[查看](#1-idtosandboxcachemap存储无界实例和配置)] |
| 映射表添加方式 | `appInstanceMap.set`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `addSandboxCacheWithWujie` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]                                       |
| 加载资源       | 自动：构造函数调用 `loadSourceCode` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#11-loadsourcecode-%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90)]                                                                                                                                                                                                                                                                                                                                                                | 手动：通过 `importHTML` 等方法获取 `template`，之后再通过 `active` 注入资源到容器中 [[查看](#-active-激活应用)]     |
| 启动沙箱       | 构造函数调用 `createSandbox` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#21-createsandbox-%E5%88%9B%E5%BB%BA%E6%B2%99%E7%AE%B1)]                                                                                                                                                                                                                                                                                                                                                                        | 构造函数调用 `iframeGenerator` [[查看](#iframegenerator创建沙箱-iframe)]                                            |
| 沙箱 `proxy`   | `proxy`、`iframe`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `iframe` - `proxy` 或者降级时仅用 `iframe` [[查看](#wujie-中的代理)]                                                |
| 手动 `start`   | 不支持手动启动                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `startApp` 或 `preloadApp` 时调用应用 `start` 方法 [[查看](#-start-启动应用)]                                       |
| `mount` 应用   | 自动：由组件或资源加载完毕决定，在 `mount` 中会 `start` 沙箱 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#32-mount-%E6%8C%82%E8%BD%BD%E5%BA%94%E7%94%A8)]                                                                                                                                                                                                                                                                                                                                                | 仅支持由 `start` 方法通过队列执行挂载 [[查看](#-mount-挂载应用)]                                                    |
| `unmount` 应用 | 由组件 `disconnectedCallback` 发起 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#22-disconnectedcallback-%E5%8D%B8%E8%BD%BD%E7%BB%84%E4%BB%B6)]                                                                                                                                                                                                                                                                                                                                                           | 组件 `disconnectedCallback` [[查看](#disconnectedcallback-卸载组件)]、手动销毁 `destroy` [[查看](#其他)]            |
| 复杂度         | 分了 3 类，组件实例：`MicroAppElement` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#defineelement-%E8%87%AA%E5%AE%9A%E4%B9%89%E7%BB%84%E4%BB%B6-microappelement)]，应用实例：`CreateApp` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#createapp-%E5%88%9B%E5%BB%BA%E5%BA%94%E7%94%A8%E7%B1%BB)]，沙箱实例：`IframeSandbox` 或 `WithSandBox` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#21-createsandbox-%E5%88%9B%E5%BB%BA%E6%B2%99%E7%AE%B1)] | 只要关心 `WuJie` 应用实例、组件实例几乎可以忽略                                                                     |
| 优点           | 支持多种隔离方案，自动加载资源、配置沙箱、挂载应用                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 简单，只有 `iframe` 作为沙箱天然隔离，支持容器降级处理                                                              |
| 缺点           | 过于复杂，从语意上看有的方法在 3 个实例上相互重叠，容易混淆；不支持容器降级处理                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 过于零散，缺乏逻辑抽象分离，源码 `bug` 有点多                                                                       |

> 无论是 `wujie` 还是 `micro-app` 在解读的分支源码中都存在不同的逻辑问题

#### 📝 `constructor` 构造函数

#### 1. `inject` 注入子应用 3 个对象：

- `idToSandboxMap`：`appInstanceMap` 应用实例映射表 [[查看](#1-idtosandboxcachemap存储无界实例和配置)]
- `appEventObjMap`：`EventBus` 事件映射表 [[查看](#2-appeventobjmap存储-eventbus-托管的事件)]
- `mainHostPath` 主应用 `host`

这里做了个判断：

| 所在环境                 | 嵌套情况   | 注入方式                                               |
| ------------------------ | ---------- | ------------------------------------------------------ |
| 基座创建应用实例         | 作为子应用 | 通过 `window.__WUJIE.inject` 从上一层获取整个注入对象  |
| 基座创建应用实例         | 最顶层基座 | 声明最初要注入的对象 `this.inject`                     |
| 子应用通过 `window` 调用 | 作为子应用 | `window.__WUJIE.inject[name]` 从上一层获取对应的映射表 |

> 这样无论是子应用还是基座，最终拿到的 `inject` 对象都是同一个，见：`appEventObjMap` 流程图 [[查看](#2-appeventobjmap存储-eventbus-托管的事件)]

#### 2. 提取配置初始化属性

见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]，列举几个关键属性：

**`degrade` 主动降级**

- 由配置提供，如果没有提供也会根据当前环境决定是否采用降级方案

**`plugins` 插件系统**

- 通过 `getPlugins` 拍平配置，并合并默认的插件返回一个数组

**`bus` 事件通信**

- 通过 `EventBus` 进行通信，`EventBus` 依赖 `appEventObjMap` 确保父子通信对象唯一性，见：存储 `eventBus` 托管的事件 [[查看](#2-appeventobjmap存储-eventbus-托管的事件)]
- 同时将 `bus` 赋值给 `provide` 对象，使子应用内部可以通过 `window.$wujie?.bus` 进行通信

#### 3. 创建沙箱 `iframe`

- 通过 `appRouteParse` 提取 `urlElement`、`appHostPath`、`appRoutePath` [[查看](#approuteparse-提取链接)]
- 获取基座的 `host`：`mainHostPath`
- 通过 `iframeGenerator` 初始化沙箱 `iframe` [[查看](#iframegenerator创建沙箱-iframe)]

#### 4. 创建代理

根据 `degrade` 决定创建：

- `localGenerator` 降级代理 [[查看](#-localgenerator-降级情况下的代理)]
- `proxyLocation` 代理 [[查看](#-proxygenerator-非降级情况下的代理)]

区别：

| 分类       | `degrade` 降级代理  | `proxyLocation` 代理 |
| ---------- | ------------------- | -------------------- |
| `window`   | 沙箱 `iframeWindow` | `proxyWindow`        |
| `document` | `proxyDocument`     | `proxyDocument`      |
| `location` | 沙箱 `location`     | `proxyLocation`      |

- 通过流程图了解两个代理的区别 [[查看](#wujie-中的代理)]
- `proxyDocument` 的差别，见：`localGenerator` - `proxyDocumennt` [[查看](#1-劫持空对象作为-proxydocument)]
- 代理对象的问题，见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

流程：

- 通过代理方法拿到 `proxyWindow`、`proxyDocument`、`proxyLocation`（降级模式没有 `proxyWindow`）
- 将这些对象绑定在 `wujie` 实例中方便调用，见：代理在哪调用 [[查看](#proxywindow-在哪调用)]

#### 5. 将实例添加到映射表

在添加实例到映射表之前要将 `proxyLocation` 绑定在 `provide`，这样：

- 子应用就可以通过 `window.$wujie.location` 去调用 `proxyLocation`
- 在 `WuJie` 构造函数中 `provide` 绑定了 `bus` 和 `location`，见：实例中关键属性 [[查看](#-wujie-实例中关键属性)]

最后通过 `addSandboxCacheWithWujie` 将当前实例添加到映射表缓存起来，见：`idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]

#### 📝 `active` 激活应用

参数只有 1 个 `options` 对象，包含以下属性：

- `template`：注入到容器的应用资源
- `el`：容器挂载节点，预加载时不提供挂载节点，容器挂载到沙箱 `body`
- `props`：需要传入应用的数据
- `alive`：是否用保活模式激活应用
- `fetch`：自定义加载方法，不提供采用全局 `window` 的 `fetch` 方法
- `replace`：用于替换资源，存在 `bug`，见：通过配置替换资源 [[查看](#通过配置替换资源)]

除此之外，以下属性用于同步路由：

| 同步方法                                                           | `sync`                                      | `url`        | `prefix`   |
| ------------------------------------------------------------------ | ------------------------------------------- | ------------ | ---------- |
| `syncUrlToIframe` [[查看](#syncurltoiframe同步主应用路由到子应用)] | 决定同步路由来自当前 `url` 还是资源入口链接 | 资源入口链接 | 短连接集合 |
| `syncUrlToWindow` [[查看](#syncurltowindow同步子应用路由到主应用)] | 决定是否同步路由                            | 不需要       | 短连接集合 |

> 只有 `url` 是必选属性，其他都可选；`active` 的 `url` 存在 `bug`，见：特殊属性 [[查看](#2-特殊属性)]

分 5 部分：

1. 更新配置应用信息 [[查看](#1-更新配置应用信息)]
2. 处理子应用 `fetch` [[查看](#2-动态修改-fetch)]
3. 处理子应用路由同步 [[查看](#3-同步路由)]
4. 将 `template` 注入容器，如果容器不存在则需要创建新容器 [[查看](#4-创建容器渲染资源)]
5. 完成激活应用：注入 `template`、样式打补丁 [[查看](#5-完成激活应用)]

注入容器分为 3 种情况：

1. `degrade` 主动降级：无论切换应用还是初始化都会创建新的 `iframe` 容器
2. `shadowRoot` 切换应用：只有 `alive` 模式更换挂载节点，其他模式重新注入资源
3. `shadowRoot` 应用初始化：创建容器

有 2 种情况会 `active` 激活应用：

- `startApp` 无论是切换应用还是初始化实力 [[查看](#startapp-启动流程)]
- `preloadApp` 预加载应用 [[查看](#preloadapp-预加载流程)]

在 `active` 激活应用时容器节点变更有 4 种情况：

| 场景                     | 容器        | `degrade` 降级 | `el` 容器挂载点 | 容器挂载位置    |
| ------------------------ | ----------- | -------------- | --------------- | --------------- |
| 预加载应用、初次启动应用 | `iframe`    | `true`         | 没有            | 沙箱 `iframe`   |
| 启动应用、每次切换应用   | `iframe`    | `true`         | 已提供          | `el` 容器挂载点 |
| 预加载应用、初次启动应用 | `shadowDom` | `false`        | 没有            | 沙箱 `iframe`   |
| 启动应用、每次切换应用   | `shadowDom` | `false`        | 已提供          | `el` 容器挂载点 |

> 每次 `active` 会根据当前情况来选择容器和挂载的节点，对于如预加载后 `startApp` 这样的情况，建议查看：容器在哪清除 [[查看](#5-容器在哪清除)]

#### 1. 更新配置应用信息

第一步：用参数 `options` 更新实例，部分属性，见：实例中关键属性 [[查看](#-wujie-实例中关键属性)]

需要额外说明的属性：

- `hrefFlag`：设置为 `false` 表明当前容器来自基座，见：特殊属性 [[查看](#2-特殊属性)]
- `provide`：绑定在 `this.provide.props`，应用中通过 `window.$wujie.props` 获取
- `activeFlag`：表明应用已激活

第二步：等待 `iframe` 初始化 `await this.iframeReady`

见 `iframeGenerator` - `iframeReady` [[查看](#iframegenerator创建沙箱-iframe)]

需要等待 `iframeReady` 的场景：

- 除了 `alive` 和 `umd` 模式切换应用时 `iframeReady` 已加载完毕，其他情况都有可能需要等待
- 如果加载顺利的话，`iframeReady` 会在 `active` 之前加载完毕，见：`iframeGenerator` [[查看](#iframegenerator创建沙箱-iframe)]

> 在 `qiankun` 中有个 `frameworkStartedDefer`，用途是一样的，见：`startSingleSpa` [[查看](https://github.com/cgfeel/micro-qiankun-substrate?tab=readme-ov-file#23-startsinglespa-%E5%90%AF%E5%8A%A8%E5%BA%94%E7%94%A8)]
>
> - 都是先发起一个微任务后，继续执行后续流程；
> - 在启动应用时会等待微任务执行完毕，才开始挂载应用

#### 2. 动态修改 `fetch`

仅限提供 `fetch` 配置，原因：

- 配置重写 `fetch` 函数时：相对路径通过基座的 `url` 进行补全
- 子应用 `fetch` 时：相对路径通过沙箱中的 `base` 元素进行补全

于是：

- 重写 `fetch` 函数通过 `getAbsolutePath` 指向 `proxyLocation` [[查看](#getabsolutepath获取绝对路径)]
- 将重写的 `fetch` 绑定到 `iframeWindow` 和应用实例中

但是基座用不到，加载资源通常是绝对路径：

- `importHTML`：提取应用资源，用的 `fetch` 还未指向 `proxyLocation`
- `processCssLoaderForTemplate`：手动加载样式，这里是针对所有应用的，通常会指定一个公共资源路径

> 当配置没有提供 `fetch` 时，会默认通过 `window.fetch`

子应用不需要变更路径：

- 子应用 `fetch` 是相对路径时，通过 `base` 元素自动转换成绝对链接

只适合通过基座修改 `fetch` 这一场景：

- 因为 `fetch` 是在基座的作用域下，拿不到应用的 `base` 元素
- 如果子应用发出来的 `fetch` 请求是相对路径，需要通过 `getAbsolutePath` 转换一下路径

比如说：

- 通过基座获取 `authorization` 统一重写所有子应用的 `fetch` 鉴权
- 而对于子应用中通过相对路径获取本地资源的请求，会转换成和应用对应的路径

关于 `fetch` 等相关的链接，见：子应用中的链接指向 [[查看](#子应用中的链接指向)]

#### 3. 同步路由

执行过程，从左到右：

| 执行方式                    | `syncUrlToIframe` | `syncUrlToWindow` |
| --------------------------- | ----------------- | ----------------- |
| `alive` 预执行              | 执行              | 执行              |
| `alive` 预执行后 `startApp` | 不执行            | 执行              |
| `alive` 切换应用            | 不执行            | 执行              |
| 其他模式                    | 执行              | 执行              |

- `syncUrlToIframe`：同步主应用路由到子应用 [[查看](#syncurltoiframe同步主应用路由到子应用)]
- `syncUrlToWindow`：同步子应用路由到主应用 [[查看](#syncurltowindow同步子应用路由到主应用)]

嵌套顺序：

- 先从基座至上而下，然后应用从下往上
- 基座嵌套基座，也是这样层层传递

> `alive` 模式不需要执行 `syncUrlToIframe` 的情况是因为初始化时已执行，之后只需监听子应用的路由变更同步到主应用

#### 4. 创建容器渲染资源

通过 `template` 更新 `this.template`，作为需要注入容器的资源。需要说明的是 `alive` 和 `umd` 模式，实例已存在的情况下 `startApp` 不需要提供资源。因为在 `preloadApp` 或首次 `startApp` 时 `template` 已绑定在应用实例中。

#### 4.1. `degrade` 主动降级渲染

用 `iframe` 作为容器，应用中的弹窗由于在 `iframe` 内部将无法覆盖整个页面，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#degrade)]

关联属性 `degradeAttrs`，文档没有说明：

- 在 `wujie` 中所有的 `iframe` 容器只设置了宽高 `100%`，这并不能够适应实际情况
- 使用这个配置可以通过 `style` 适配容器节点的样式
- 同样适用于劫持应用的 `location.href` 的 `iframe` 临时容器，见：`locationHrefSet` [[查看](#locationhrefset拦截子应用-locationhref)]

`degradeAttrs` 是一个固定的配置，如何根据应用配置不同的属性：

- 通过不同的组件分开 `startApp`，从而配置不同的属性
- 同理也适用于其他固定的配置信息，需要根据不同的应用做出差异化的表现

> 注意：不要试图通过样式去匹配不同 `iframe` 容器的 `id`，因为当子应用发生链接劫持，替换为临时的劫持容器，设定好的样式会随容器 `id` 一同丢失。

主动降级分 3 个部分：

1. 创建 `iframe` 容器并挂载到指定节点
2. 销毁沙箱记录，为创建的 `iframe` 新容器打补丁
3. 注入 `template` 到 `iframe` 容器中

为了便于理解，整个总结中将容器及相关对象划分如下：

- 沙箱 `iframe`：用于存放应用 `script` 的沙箱，见：`iframeGenerator` [[查看](#iframegenerator创建沙箱-iframe)]
- `iframe` 容器：降级时存放应用资源的容器，其中 `script` 会被注释
- 劫持容器：通过 `locationHrefSet` 劫持子应用中通过 `location.href` 跳转的页面 [[查看](#locationhrefset拦截子应用-locationhref)]
- `shadowRoot`（容器）：默认情况下存放应用资源的容器，其中 `script` 会被注释 [[查看](#42-挂载子应用切换初始化预加载)]

> 相应的 `iframeWindow`、`iframeBody`、`iframeDocument` 全部为沙箱 `iframe` 中的对象

第一步：创建 `iframe`

- `rawDocumentQuerySelector` 获取沙箱 `iframeBody`
- `initRenderIframeAndContainer` 创建 `iframe` 容器挂载到指定节点 [[查看](#创建-iframe-容器)]

`iframe` 容器的挂载点：

- `el`：`startApp` 时通过配置指定
- `iframeBody`：`preloadApp` 临时存放在沙箱中

> 如果 `startApp` 没有提供 `el` 挂载节点，也会存放在沙箱 `iframeBoody` 中。此时应用不会报错但不可见。

第二步：更新容器，销毁 `iframeBody`

- 将挂载的节点绑定到 `this.el`
- 若提供了 `el` 容器，清空 `iframeBody`，确保渲染容器只有 1 个，见：容器在哪清除 [[查看](#5-容器在哪清除)]
- `patchEventTimeStamp`：修复 `vue` 的 `event.timeStamp` 问题
- `onunload`：当销毁子应用时主动 `unmount` 子应用

`this.el` 挂载节点有啥用：

- `removeLoading` 消除 `loading` [[查看](#启动应用时添加删除-loading)]
- 实例 `destroy` 时通过 `clearChild` 清空挂载节点 [[查看](#-destroy-销毁实例)]
- `popstate` 后退时将渲染容器替换劫持容器挂载到节点，见：`processAppForHrefJump` [[查看](#processappforhrefjump-监听前进和后端)]

`onunload` 是一个废弃的方法，随时可能被浏览器弃用

- 目的应该用于点击 `iframe` 容器中第三方链接离开子应用时注销应用实例

第三步：注入 `template` 到容器中

在降级处理过程中，通过 `this.document` 来区分是初次加载还是切换应用

- `this.document` 在降级状态下每次 `active` 应用时，用于记录 `iframe` 容器
- `this.document` 主要用于区分是否是初次加载，以及记录、恢复事件 [[查看](#记录恢复-iframe-容器事件)]
- 无论是初次加载还是切换应用，降级状态都会新建 `iframe` 容器，即便 `alive` 模式也不例外

注入 `template` 有 3 种情况：

`分支 1` - `alive` 模式下切换应用

- 将 `this.document` 中的 `html` 根元素替换 `iframe` 容器中的 `html` 根元素
- 在保活场景恢复所有元素事件，见：记录、恢复 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]

`分支 2` - 非 `alive` 模式下切换应用

- 通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe-容器)]
- `recoverDocumentListeners` 非保活场景需要恢复根节点的事件，防止 `react16` 监听事件丢失，见：记录、恢复 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]

`分支 3` - 初次渲染

- 通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe-容器)]

至此整个降级过程完成，直接返回不再执行下面流程

#### 4.2. 挂载子应用：切换、初始化、预加载

第一步：挂载容器用到指定节点

`degrade` 降级状态通过 `this.document` 来区分初次加载还是切换应用，而默认状态通过 `this.shadowRoot` 来区分。

注入 `template` 有 3 种情况：

`分支 1`：切换应用

- 通过 `renderElementToContainer` 将 `this.shadowRoot.host` 挂载到指定节点 [[查看](#renderelementtocontainer将节点元素挂载到容器)]
- `alive` 模式：完成切换后直接返回，不再继续执行资源注入容器的流程
- `umd` 模式：虽然实例存在 `shadowRoot`，但 `active` 前会通过 `unmount` 清空容器 [[查看](#5-容器在哪清除)]
- 重建模式：`active` 前会随应用一同销毁，不存在 `shadowRoot`，也不走这个分支

`分支 2`：初次加载

- 获取 `iframeBody`，如果没有提供挂载节点，作为备用
- 通过 `createWujieWebComponent` 创建自定义组件：`wujie-app`
- 通过 `renderElementToContainer` 将创建的组件挂载到指定容器 [[查看](#renderelementtocontainer将节点元素挂载到容器)]

> `shadowRoot` 在创建 `web component` 时候绑定到实例，见：`connectedCallback` [[查看](#connectedcallback挂载组件)]

`分支 3`： 预加载应用

- 预加载也是初次加载和 `分支 2` 流程一模一样
- 不同的是预加载不提供挂载节点 `el`，而是用 `iframeBody` 作为临时挂载节点
- 预加载之后 `startApp` 如果没有销毁实例的情况下，会按照 `分支 1` 执行流程

第二步：注入 `template` 到容器中

- 通过 `renderTemplateToShadowRoot` 将 `template` 渲染到 `shadowRoot` [[查看](#rendertemplatetoshadowroot-渲染资源到-shadowroot)]
- 包括 `umd` 模式和重建模式，注入 `template` 之前 `shadowRoot` 仅仅是个空壳

注入资源后会发生什么：

- 之前添加的 `loading` 因为资源注入，而撑开挂载节点变得可见 [[查看](#启动应用时添加删除-loading)]
- 由于当前只注入了已注释 `script` 的静态资源，而对于 `spa` 应用来说此还未渲染
- 需要等到 `start` 启动应用，将入口 `script` 添加到沙箱 `iframe` 后才会渲染应用 [[查看](#-start-启动应用)]

#### 5. 完成激活应用

- 通过 `patchCssRules` 为子应用样式打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]
- 更新 `this.provide.shadowRoot`

`this.provide` 是子应用中 `window` 全局对象中的 `$wujie`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/wujie.html#wujie)]：

- 在实例构造时通过 `patchIframeVariable` 将其注入 `iframeWindow` [[查看](#patchiframevariable-为子应用-window-添加属性)]
- `shadowRoot` 仅限默认状态下激活时才提供，降级状态下不存在

在子应用中获取跟节点：

| 分类            | `iframe` 容器                  | `shadowRoot` 容器              |
| --------------- | ------------------------------ | ------------------------------ |
| `shadowRoot`    | 不存在                         | `window.$wujie.shadowRoot`     |
| 容器根节点      | `window.__WUJIE.document`      | `window.__WUJIE.shadowRoot`    |
| 沙箱 `document` | `Node.prototype.ownerDocument` | `Node.prototype.ownerDocument` |

在子应用中 `document` 一定是沙箱 `iframe.contentDocument`，因为：

- 子应用所有的 `script` 都运行在沙箱 `iframe`

而在子应用中 `document` 的指定的 `property` 则会指向 `proxyDocument`，因为：

- 沙箱 `iframe` 初始化时通过 `patchDocumentEffect` 劫持了 `iframeWindow.Document.prototype` 属性 [[查看](#patchdocumenteffect修正沙箱-document-的-effect)]
- 劫持的属性会在 `get` 时指向 `proxyDocument` [[查看](#wujie-中的代理)]

> 而 `proxyDocument` 只有获取 `script` 指向沙箱 `iframe.contentDocumennt`，其余全部指向容器，比如 `iframe` 容器的 `document`，或是 `shadowRoot`

为此沙箱 `iframe` 初始化时保留了沙箱 `document` 4 个原始方法：

- 通过 `initIframeDom` 绑定在 `iframe.contentWindow` [[查看](#initiframedom初始化-iframe-的-dom-结构)]

此外 `document` 下的 `head`、`body` 也会通过 `patchDocumentEffect` 劫持 [[查看](#patchdocumenteffect修正沙箱-document-的-effect)]

- `head` 指向容器的 `head`，`body` 指向容器的 `body`

而容器的 `head` 和 `body` 又通过 `patchRenderEffect` 重写了指定的操作 [[查看](#patchrendereffect-为容器打补丁)]

- 通过 `head` 或 `body` 插入 `Dom` 时，会根据元素类型自动分配插入沙箱 `iframe` 还是容器

为了方便拿到 `head` 和 `body`

- `shadowRoot` 容器：通过实例 `shadowRoot['head'|'body']` 获取
- `iframe` 容器：通过实例 `sandbox['head'|'body']` 获取

> 子应用中也可以直接从 `document['head'|'body']` 获取

#### 6. 激活应用的 `bug`

启动应用不提供 `el` 容器

- 虽然在 `ts` 规范里已明确要求必须提供 `el` 容器，但是如果 `ignore` 或 `js` 项目就没提供怎么办呢？

触发情况：

- 受影响：切换 `shadowDom` 容器的应用
- 不受影响：预加载、没有预加载初次启动、降级处理，会将沙箱 `iframe` 作为备用容器

解决办法：

- 和 `micro-app` 组件挂载一样做条件判断，条件不满足的情况直接返回不做任何渲染

#### 7. 激活应用的补充

无论容器是 `iframe` 还是 `shadowRoot`，都要给容器添加属性 `WUJIE_APP_ID` 值为应用名，用途：

- 通过 `querySelector` 查找 `iframe[${WUJIE_APP_ID}="${id}"]` 找到 `iframe` 容器
- 通过自身属性 `WUJIE_APP_ID` 获取应用实例

> 添加属性是由 `wujie` 内部实现，使用者无需手动添加，这里写出来是作为增加对 `wujie` 的了解

`WUJIE_APP_ID` 定义都来自 `active` 激活应用时创建容器：

- `createIframeContainer`：创建 `iframe` 容器 [[查看](#创建-iframe-容器)]
- `createWujieWebComponent`：创建 `shadowRoot` 容器

#### 📝 `start` 启动应用

参数：

- `getExternalScripts`：返回加载应用中静态 `script` 集合的函数 [[查看](#getexternalscripts加载-script-资源)]

返回：

- 类型 `Promise<void>` 的微任务，通过 `await` 确保应用成功启动

如果 `this.iframe` 被销毁的情况会直接返回不再处理：

- `this.iframe` 只有在销毁应用 `destroy` 设为 `null` [[查看](#-destroy-销毁实例)]

`start` 调用场景有 3 个：

- `startApp` 预加载 `alive` 模式的应用后 `startApp` [[查看](#21-alive-保活模式运行应用)]
- `startApp` 创建新的应用实例 [[查看](#3-创建新的沙箱实例)]
- `preloadApp` 配置 `exec` 预执行 [[查看](#5-通过-exec-预执行)]

> 执行 `start` 启动应用前必须先 `active` 激活应用 [[查看](#-active-激活应用)]

#### 1. 收集队列

整个 `start` 的流程就是对 `this.execQueue` 队列的收集和提取并执行：

- 在队列中 `push` 进来的都是同步的执行方法，执行队列通过 `shift` 实现先入先出
- 在队列下标的每个方法中有可能存在微任务和宏任务，但执行顺序看所在执行的队列前后顺序
- 因为每个队列的执行都是在上一个队列执行过程中通过 `shift` 提取并执行

**`this.execQueue.push` 共计 7 处：**

- `beforeScriptResultList`：插入代码前通过插件添加的 `script`
- `syncScriptResultList` + `deferScriptResultList`：子应用中同步 `script`，包含 `defer`
- `this.mount`：基座主动调用 `mount` 方法
- `domContentLoadedTrigger`：触发 `DOMContentLoaded` 事件
- `afterScriptResultList`：插入代码后插件添加的 `script`
- `domLoadedTrigger`：触发 `loaded` 事件
- 返回 `Promise`：所有的 `execQueue` 队列执行完毕，`start` 才会在最后 `resolve`

**有 1 处存在即执行：**

- `asyncScriptResultList`：子应用中带有 `async` 的 `script`

总共 8 处，然后根据用途还可以细分如下

**必须会添加到队列有 4 处：**

- `this.mount`、`domContentLoadedTrigger`、`domLoadedTrigger`、返回的 `Promise` 对象

**根据集合添加到队列有 3 处：**

- `beforeScriptResultList`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-before-loaders)]
- `afterScriptResultList`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-after-loader)]
- `syncScriptResultList` + `deferScriptResultList`：提取子应用的 `script`

> `beforeScriptResultList` 和 `afterScriptResultList` 下标类型文档介绍有限，建议查看源码类型 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L22)]

**提取子应用的 `script`：**

通过 `getExternalScripts` 得到 `scriptResultList` [[查看](#getexternalscripts加载-script-资源)]

声明 3 个集合：

- `syncScriptResultList`：同步代码
- `asyncScriptResultList`：`async` 无需保证加载顺序，所以不用放入执行队列
- `deferScriptResultList`：`defer` 需要保证加载顺序并且在触发 `DOMContentLoaded` 前完成

遍历 `scriptResultList` 根据属性分类添加到上述 3 个集合，关于属性见：`processTpl` 提取资源 [[查看](#processtpl-提取资源)]

> 无论是同步代码还是异步代码，`getExternalScripts` 提取的 `script` 都是应用中的静态资源，而不是动态添加的 `script`；而像 `React` 和 `Vue` 这样的 `SPA` 应用通常只暴露一个静态的 `script` 作为入口，其余的 `script` 和样式动态添加，见：`execQueue` 应用启动执行队列 [[查看](#1-execqueue-应用启动执行队列)]

**遍历的集合下标是 `promise` 有 2 处：**

- 同步和异步代码执行：`syncScriptResultList`、`asyncScriptResultList`
- 共同点：集合中的每一个方法都返回 `Promise`、需要在微任务中执行 `insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)]
- 不同点：`syncScriptResultList` 需要等待队列按顺序提取执行，`asyncScriptResultList` 遍历同时立即发起微任务

**插入队列 `execQueue` 的动作全部都是上下文：**

- 在阅读执行队列前需要说明的是，所有队列都是在上下文中 `push`
- 即便是最后返回的 `Promise`，也是在 `Promise` 方法中同步插入执行的队列

#### 2. 执行队列

无论怎么添加队列，最终都是通过 `this.execQueue.shift()()` 从头部弹出插入队列的方法并执行

开始执行：

- 执行队列从 334 行开始，按照上下文主动提取并发起执行，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L334)]
- `asyncScriptResultList` 不加入队列，会以 `Promise` 微任务的形式在当前上下文执行完毕后依次执行

需要说明的是：

- 开始提取 `execQueue` 是在 `start` 返回 `Promise` 之前执行，队列方法和 `Promise` 内部方法是上下文关系
- 所以队列开始时，返回的 `Promise` 还没有将最后要执行的队列插入 `execQueue`

循环插入队列共有 3 处：

- 分别是：`beforeScriptResultList`、`syncScriptResultList` + `deferScriptResultList`、`afterScriptResultList`
- 每个队列通过 `insertScriptToIframe` 注入 `script` 到沙箱 `iframe` [[查看](#insertscripttoiframe为沙箱插入-script)]
- 注入 `script` 之后再将 `window.__WUJIE.execQueue.shift()()` 注入沙箱 `iframe`
- 这样每个 `push` 的队列，会在沙箱 `iframe` 加载完 `script` 后通过 `shift` 提取下一个任务并执行

主动插入队列有 4 处：

- `mount`、`domContentLoadedTrigger`、`domLoadedTrigger`、返回的 `Promise`
- 会在执函数末尾添加 `this.execQueue.shift()?.();` 提取并执行接下来的队列

如果没有主动配置 `fiber` 为 `false` 的情况下：

- 除最后返回的 `Promise` 之外，所有的队列将包裹在宏任务 `requestIdleCallback` 中空闲执行
- 但是每个队列的执行，必须是在上一个队列结束后通过 `shift` 提取并执行

无论队列中执行的是上下文，还是微任务，亦或者是宏任务，最终都需要按照队列顺序来

> 在 `WuJie` 实例中通过 `this.requestIdleCallback` 执行空闲加载，它和 `requestIdleCallback` 的区别在于，每次执行前先判断实例是否已销毁沙箱 `iframe`

只有 1 种情况可以无视队列顺序：

- `asyncScriptResultList`：子应用中异步加载的 `script`

而最后返回的 `promise` 也只做 1 件事：

- 插入最终执行的队列，在队列的方法中将执行 `resolve` 通知外部 `start` 完成

#### 3. 队列执行顺序

队列有 3 处微任务：

- `asyncScriptResultList`：异步代码
- `syncScriptResultList` + `deferScriptResultList`：同步代码
- 返回的 `Promise` 对象

> 只有异步代码是立即添加微任务，其他按照 `execQueue` 队列顺序等待提取并执行

`fiber` 没有关闭的情况下有 7 处宏任务：

- 除了通过返回的 `Promise` 插入末尾的队列，都会通过 `requestIdleCallback` 插入宏任务

> 执行的顺序按照 `execQueue` 队列先后顺序执行

执行顺序如下：

1. `asyncScriptResultList` 遍历异步代码，将微任务放入微队列等待执行
2. 334 行开始提取第 1 个队列并执行 `this.execQueue.shift()()`
3. 执行 `beforeScriptResultList`，如果存在的话
4. 执行 `syncScriptResultList` + `deferScriptResultList`，如果存在的话
5. 依次执行 `mount`、`domContentLoadedTrigger`
6. 执行 `afterScriptResultList`，如果存在的话
7. 执行 `domLoadedTrigger`
8. 通过返回的 `Promise` 方法中执行最后添加到 `execQueue` 的方法

`asyncScriptResultList` 执行顺序：

- 会在 `execQueue` 队列中第 1 个微任务或宏任务之前完成所有异步代码注入

`fiber` 模式，第 1 任务：

- `beforeScriptResultList` 存在的话，第 1 个队列是宏任务，否则继续往下看
- 同步代码存在的话，第 1 个队列是微任务，否则就一定会是宏任务

非 `fiber` 模式，第 1 个任务：

- `beforeScriptResultList` 存在外联 `script`，第 1 个队列是宏任务
- 同步代码存在的话，第 1 个队列是微任务
- `afterScriptResultList` 存在外联 `script`，第 1 个队列是宏任务
- 在最后返回的 `Promise` 对象 `resolve` 完成任务前执行 `asyncScriptResultList`

> 执行顺序从上至下，有 1 条满足后面的就不用再看；以上无论是不是 `fiber` 模式都不包含同步任务，因为对于微任务来说，同步任务必然会优先执行

为什么外联 `script` 存在宏任务：

- 队列中无论是 `appendChild` 还是 `dispatchEvent` 都是同步操作
- 只有通过 `src` 加载的 `script` 会通过 `onload` 回调执行 `execQueue.shift()()`
- 而 `onload` 是宏任务，执行前，会优先完成上一个宏任务中的微任务

如果 `execQueue` 在返回 `Promise` 之前，队列中只有同步执行的方法，会存在一个 `bug`，见：`start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

为什么关注 `asyncScriptResultList` 执行顺序：

- 因为 `execQueue` 队列中所有同步的方法、微任务、宏任务，都按照队列先后顺序 `one by one`
- 通过 `asyncScriptResultList` 可以作为参考对象，很好的了解整个队列的执行顺序

> 一道思考题：在子应用中所有静态 `script` 将被分类为“同步代码”和“异步代码”，这些静态的 `script` 会怎样加载并注入沙箱 `iframe` 的？这个问题会在下面解答，见：队列前的准备 [[查看](#5-队列前的准备)]

**关于微任务队列：**

在 `micro-app` 有一个 `injectFiberTask`，见 `micro-app` 源码分析中注 ⑭ [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#13-extractsourcedom-%E6%88%90%E5%8A%9F%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90%E5%9B%9E%E8%B0%83)]，对比如下：

| 对比项   | `wujie`                                                      | `micro-app`                                                 |
| -------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| 添加队列 | 根据不同类型，手动添加每一组队列                             | `injectFiberTask`                                           |
| 集合对象 | `execQueue`                                                  | `fiberLinkTasks`                                            |
| 添加方式 | `push`                                                       | `push`                                                      |
| 执行方式 | `this.execQueue.shift()?.()`，在当前队列提取下一个队列并执行 | `serialExecFiberTasks`，通过 `array.redus` 拍平队列依次执行 |
| 立即执行 | `asyncScriptResultList`，遍历集合添加到微任务中执行          | 调用 `injectFiberTask` 时提供 `fiberTasks` 为 `null`        |

> 比较而言 `micro-app` 的 `injectFiberTask`，更简洁、抽象，灵活度也更高

#### 4. `start` 启动应用的 `bug`

问题 1：

- 如果 `execQueue` 除了最后返回的 `Promise` 对象之外，没有微任务也没有宏任务
- 那么返回的 `Promise` 内部方法中插入 `execQueue` 末尾的队列永远无法执行

原因：

- 开始提取并执行队列的方法，相对于返回的 `Promise` 函数优先执行，它们是上下文关系
- 如果返回的 `Promise` 之前全部都是上下文同步关系，那么当队列执行完毕后，才会将 `Promise` 中的队列插入 `execQueue`
- 这样就意味着永远不会执行末尾队列中的 `resove`，因此 `start` 被中断

问题 2：

- 如果 `beforeScriptResultList` 或 `afterScriptResultList` 存在 `async` 属性的 `script`
- 将导致无法提取执行下一个队列，造成流程中断后面的 `script` 将不能插入沙箱 `iframe`

原因：

- 沙箱 `iframe` 注入 `script` 后，会根据 `async` 去判断要不要执行下一条队列

额外产生的影响：

- 队列暂停，等待执行 `start` 后续流程将会在所在的 `async` 方法内中断

`preloadApp` 出现问题的场景：

- 预加载本身不会导致问题，因为预加载默认不会 `start`，即便配置 `exec` 启动应用 `start`，问题也会发生在 `startApp` 切换应用时

`startApp` 启动应用 `start` 问题的场景：

| 触发条件             | 包含模式                                           | 问题 1                                              | 问题 2                             |
| -------------------- | -------------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| `alive` 预加载后启动 | 已激活还未启动的 `alive` 模式应用                  | 生命周期 `activated` 可能会不执行，`destroy` 不返回 | 流程中断导致后续 `script` 加载失败 |
| 非 `alive` 应用启动  | `umd` 模式预加载后首次启动，重建模式每次启动和切换 | `destroy` 不返回                                    | 流程中断导致后续 `script` 加载失败 |
| `exec` 预执行后启动  | 所有模式                                           | 卡在 `await sandbox.preload` 暂停不再执行           | 流程中断导致后续 `script` 加载失败 |

> 在触发条件中有两个概念：预加载和预执行，见：通过 `exec` 预执行 [[查看](#5-通过-exec-预执行)]

非 `fiber` 出现问题的模式：

| 模式                                          | 原因                                                               |
| --------------------------------------------- | ------------------------------------------------------------------ |
| 模式 ①：应用内不存在 `script`                 | 返回的 `Promise` 函数中还没有添加 `resolve` 队列时，队列已停止调用 |
| 模式 ②：应用内只有内联 `script`               | 和模式 ① 一样                                                      |
| 模式 ③：应用内所有 `script` 带有 `async` 属性 | 和模式 ① 一样                                                      |

手动注入带有 `async` 属性的 `script`：

| 模式                             | 原因                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 模式 ④：`beforeScriptResultList` | 不会执行 `nextScriptElement` 从而导致后续队列无法执行                                                         |
| 模式 ⑤：`afterScriptResultList`  | 和模式 ③ 一样，区别在于只终止了 `domLoadedTrigger`、返回的 `Promise` 对象，以及 `async` 中等待 `start` 的方法 |

`fiber` 下在模式 ①、②、③ 都是正常执行：

- 没有特殊声明默认为 `fiber`，除了最后返回的 `Promise`，所有队列都包裹在 `requestIdleCallback`
- 而返回的 `Promise` 函数内部在当前任务属于上下文，优先于宏任务 `requestIdleCallback` 添加到队列

存在子应用同步代码会正常执行模式 ①、②、③：

- 同步代码和异步代码指的是子应用的静态 `script`，例如：入口文件
- 同步代码是一个微任务集合，执行微任务前，返回的 `Promise` 内部函数已 `push` 最后队列
- 而对于子应用中带有 `async` 属性的静态 `script` 分到异步代码中执行，不在队列考虑范围

所有模式下异步代码会正常执行：

- 异步代码通过遍历执行 `Promise` 队列，不受 `execQueue` 影响
- 但异步代码执行完毕并不能说明应用启动成功了

非 `fiber` 模式手动插入带有 `src` 属性且 `content` 为空的 `script`，不存在属性 `async` 可正常执行：

- 因为 `window.__WUJIE.execQueue.shift()()` 是通过 `script` 的 `onload` 执行
- `onload` 是一个宏任务，会在当前宏任务执行完毕之后再执行，没有 `async` 就不会中断流程

复现问题 1：没有 `script`

- `static-app`：创建一个没有 `script`，没有 `style` 的静态子应用 [[查看](https://github.com/cgfeel/micro-wujie-app-static)]
- 添加一个 `StaticPage.tsx` 页面组件，关闭 `fiber`，不添加 `js-loaders` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/StaticPage.tsx)]
- 应用组件 `Wujie.tsx`：添加 `startApp` 返回的函数 `destroy` 并打印 [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/components/Wujie.tsx)]

复现结果：

- 点开 `static` 应用，打开调试面板，刷新页面什么都没返回
- 点开 `react` 应用，返回 `destroy` 方法

复现问题 1：存在 `async` 的 `script`

- 原理和问题 1 一样，子应用中添加路由 `/async`，在页面中添加一段 `async` 属性的 `script` [[查看](https://github.com/cgfeel/micro-wujie-app-static/blob/main/async/index.html)]
- 在基座中添加相应的组件 `AsyncPage.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/AsyncPage.tsx)]

复现结果：

- 和问题 1 一样，子应用中 `script` 的 `async` 会通过异步集合 `asyncScriptResultList` 添加到沙箱 `iframe` 中
- `asyncScriptResultList` 不会影响 `execQueue`

修复问题 1：

- 源码 334 行 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L334)]，第 1 个执行队列 `this.execQueue.shift()();` 前主动添加一个微任务
- 这样确保最后一个队列提取一定是在微任务下执行，而返回的 `Promise` 函数内部属于上下文
- 这样在执行额外添加的微任务前，返回的 `Promise` 已经将最后的队列插入 `execQueue`
- 这样确保了队列最后能够顺利 `resolve`

```
this.execQueue.push(() => Promise.resolve().then(
  () => this.execQueue.shift()?.()
));
this.execQueue.shift()();
```

复现问题 2：`jsBeforeLoaders` 打断应用加载

- 复现前确保 `react` 应用正常，复制一份 `ReactPage.tsx` 作为 `BeforePage.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/BeforePage.tsx)]
- 添加 `jsBeforeLoaders`：要求带有 `src` 和 `async`

复现结果：

- `ReactPage.tsx` 正常，`BeforePage.tsx` 应用加载过程中被 `jsBeforeLoaders` 打断不会 `mount` 应用

问题 2 的设计初衷：

- 因为异步代码 `asyncScriptResultList` 它本身和 `execQueue` 队列集合是没有关系的
- 但异步代码也是执行 `insertScriptToIframe` 将 `script` 插入沙箱 `iframe` 中
- 如果异步代码也去调用 `execQueue.shift()()`，那么就会造成队列执行顺序错乱了

修复问题 2：

- 遍历 `beforeScriptResultList` 和 `afterScriptResultList` 时去掉 `script` 的 `async`，如下：

```
beforeScriptResultList.forEach(({ async, ...beforeScriptResult }) => {})
afterScriptResultList.forEach(({ async, ...afterScriptResult }) => {})
```

因为只有通过配置手动添加 `async` 的 `script` 才会出现这个问题

> 由于目前还在研究阶段，没有对官方提 PR。

**关于 `bug` 的总结：**

1. 使用 `wujie` 过程中谨慎关闭 `fiber`，默认是不会关闭 `fiber` 的
2. 不要在 `beforeScriptResultList` 或 `afterScriptResultList` 传入带有 `async` 属性的对象，虽然 `ScriptObjectLoader` 这个对象是允许配置 `async` 的，虽然官方在文档中也并没有说 `async` 是可选配置，但是擅自添加 `async` 在源码中是有逻辑问题的

#### 5. 队列前的准备

`execFlag` 设置为 `true`，表示已启动应用：

- `execFlag` 会在 `destroy` 设 `null`，从这里知道注销应用后只能重新创造应用实例

通过 `importHTML` 包装方法 `getExternalScripts` 提取要注入沙箱的静态 `script` 集合 [[查看](#getexternalscripts加载-script-资源)]

- `getExternalScripts` 返回的 `script` 集合中，属性 `contentPromise` 是一个微任务
- 这也就是为什么同步代码和异步代码都是通过微任务将 `script` 添加到 `iframe` 中执行的原因

> 为了保证其顺序，也因此不管是微任务也好，还是宏任务也好，都要求在上一个队列执行完后提取执行下一个队列

一道思考题：子应用中静态 `script` 是怎么注入到沙箱 `iframe`

1. 通过 `importHTML` 提取应用资源 [[查看](#importhtml-加载资源)]
2. 通过 `processTpl` 提取资源中的样式和 `script`，并替换成注释 [[查看](#processtpl-提取资源)]
3. 通过 `processCssLoader` 提取样式替换资源中的注释后通过 `active` 注入容器 [[查看](#processcssloader处理-css-loader)]
4. `start` 应用时调用 `importHTML` 提供的包装方法 `getExternalScripts` 提取 `script` [[查看](#getexternalscripts加载-script-资源)]
5. 将提取的 `script` 分为同步代码或异步代码分别处理，同步代码加上手动注入的 `script` 一同添加到队列
6. 通过 `insertScriptToIframe` 将队列中提供的 `script` 注入沙箱 `iframe` [[查看](#insertscripttoiframe为沙箱插入-script)]

`iframeWindow` 提取沙箱的 `window`，用于注入 `script`

- 同时绑定 `__POWERED_BY_WUJIE__` 到沙箱 `window`，便于子应用确认运行环境

执行队列之前会通过 `removeLoading` 关闭 `loading` 状态：

- 关于加载状态，见：启动应用时添加、删除 `loading` [[查看](#启动应用时添加删除-loading)]

删除 `loading` 的条件：

- 没有提供 `__WUJIE_UNMOUNT` 的所有模式，因为 `start` 不能像 `active` 那样判断当前应用是初次加载还是切换应用

`umd` 模式 `start` 时会重复调用 `removeLoading`：

- 第 1 遍：在执行队列前，`__WUJIE_UNMOUNT` 还没有挂载
- 第 2 遍：将应用入口 `script` 注入沙箱后，`mount` 时沙箱 `window` 已绑定 `__WUJIE_MOUNT`

> 重复删除 `loading` 只能导致重复执行，不会出现使用上的问题

#### 6. 必须添加队列的 4 个方法

**1. 主动调用 `mount` 方法**

- 见：`mount` 挂载应用 [[查看](#-mount-挂载应用)]

**2. 触发 `DOMContentLoaded` 事件**

- 创建 `DOMContentLoaded` 自定义事件，分别由沙箱 `iframeWindow.document` 和 `iframeWindow` 触发

**3. 触发 `loaded` 事件**

- 自定义事件 `readystatechange`，由沙箱 `iframeWindow.document` 触发
- 自定义事件 `load`，由沙箱 `iframeWindow` 触发

**4. 返回 `Promise`**

- 通过在返回的 `Promise` 函数中添加队列最后要执行的任务
- `resolve` 释放返回的微任务，用于通知 `start` 完毕

#### 📝 `mount` 挂载应用

触发场景：

- 只能在应用 `start` 时通过 `execQueue` 队列执行 `mount` [[查看](#-start-启动应用)]

不执行挂载的情况：

- `alive` 模式：只有 `execFlag` 还未激活时才会通过 `start` 执行 `mount`
- `umd` 模式：`mountFlag` 已经挂载的情况

除了重建模式外，切换应用永远不会触发 `mount`：

- 挂载应用只能通过 `start` 启动应用，非重建模式下切换应用不执行 `start` [[查看](#-start-启动应用)]
- 但是重建模式下 `mount` 挂载应用，除了发起下一个队列不会执行其他操作

#### 1. `umd` 方式启动

- 从沙箱 `window` 中检测到 `__WUJIE_MOUNT` 才能执行当前流程
- 再次关闭挂载节点 `loading` 状态，见：启动应用时添加、删除 `loading` [[查看](#启动应用时添加删除-loading)]
- 使用 `iframeWindow` 调用生命周期 `beforeMount`
- 调用子应用的 `__WUJIE_MOUNT` 去渲染应用
- 使用 `iframeWindow` 调用生命周期 `afterMount`
- 设置 `mountFlag` 避免重复挂载

> 删除 `loading` 存在重复执行的情况，见：队列前的准备 - 关闭加载状态 [[查看](#5-队列前的准备)]

`fiber` 模式下，`__WUJIE_MOUNT` 执行顺序：

- 注入 `script` 后，无论是同步还是异步绑定 `__WUJIE_MOUNT`，都会在 `mount` 前优先绑定到沙箱 `window`
- 因为 `fiber` 模式下 `mount` 包裹在宏任务 `requestIdleCallback` 中

非 `fiber` 模式下，同步上下文绑定 `__WUJIE_MOUNT`：

- 执行方式和 `fiber` 模式是一样的，因为他们是上下文关系

非 `fiber` 模式下，异步绑定 `__WUJIE_MOUNT` 导致的 `bug`：

- `__WUJIE_MOUNT` 无法执行，不展示应用
- 因为 `mount` 应用时，异步的微任务还没有绑定 `__WUJIE_MOUNT` 到沙箱 `windnow` 上
- 再次切换应用会恢复正常

解决办法见：`start` 启动应用的 `bug` - 问题 1 [[查看](#4-start-启动应用的-bug)]

> 从这点再次说明：请谨慎关闭 `fiber`

#### 2. `alive` 模式

- 使用 `iframeWindow` 调用生命周期 `activated`
- 这里存在 `activated` 调用 2 次的情况，见：预加载中的 `bug` [[查看](#6预加载中的-bug)]

#### 3. 执行下一个队列

- `this.execQueue.shift()?.()`
- 这是所有模式必须做的流程，也是重建模式在 `mount` 时唯一做的事
- 综上所述，`mount` 挂载应用似乎只关心 `umd` 初次渲染应用，设计的过于鸡肋

#### 📝 `unmount` 卸载应用

卸载流程分为 3 部分：

#### 1. 卸载应用 - 所有模式

- `activeFlag` 失活，见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- 清理路由，见：`clearInactiveAppUrl` [[查看](#clearinactiveappurl清理路由)]

> 重建模式在卸载应用时，虽然只做了这一个步骤，但是每次 `startApp` 时会将整个实例都销毁 `destroy` [[查看](#-destroy-销毁实例)]

#### 2. 卸载 `alive` 模式的应用

- 使用沙箱 `iframeWindow` 触发生命周期 `deactivated`

#### 3. 卸载 `umd` 模式的应用

准备卸载 `umd` 模式子应用，要求：

- `mountFlag` 状态已挂载，见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- 子应用中存在 `__WUJIE_UNMOUNT`
- 不是 `alive` 模式并且不是 `hrefFlag` 劫持容器，见：特殊属性 [[查看](#2-特殊属性)]

卸载 `umd` 模式子应用：

- 使用沙箱 `iframeWindow` 触发生命周期 `beforeUnmount`
- 调用子应用挂载在 `window` 上的 `__WUJIE_UNMOUNT`
- 使用沙箱 `iframeWindow` 触发生命周期 `afterUnmount`
- `mountFlag` 标记为未挂载
- `this.bus.$clear`：清空子应用所有监听的事件，见：`WuJie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]

非 `degrade` 降级需要对 `shadowRoot` 补充操作：

- 清空 `shadowRoot` 下所有元素，并清理记录在实例 `head`、`body` 的事件

最后将实例的 `head`、`body` 下的元素全部删除

- 所有删除的元素会在下次 `active` 激活应用时，重新注入应用资源
- 清空的监听事件，也会在下次 `active` 激活应用时重新监听

#### 4. 触发场景

容器注销会触发应用 `umount`：

| 模式     | 卸载场景 | 流程 1 | 流程 2 | 流程 3 |
| -------- | -------- | ------ | ------ | ------ |
| `alive`  | 容器注销 | 执行   | 执行   | 不执行 |
| `umd`    | 容器注销 | 执行   | 不执行 | 执行   |
| 重建模式 | 容器注销 | 执行   | 不执行 | 不执行 |

> 流程 1、2、3 分别对应上述归纳 3 类流程

容器注销触发的方式：

- `iframe` 容器：`onunload`
- `shadowRoot` 容器：`disconnectedCallback`

`alive` 模式 `unmount` 时只做了 3 件事：

- 标记 `activeFlag`、清理路由、触发声明周期事件
- 不清理容器，也不注销应用，下次切换回应用时也不需要重复加载资源

`startApp` 触发应用 `umount`：

| 模式               | 卸载场景              | 流程 1 | 流程 2 | 流程 3 |
| ------------------ | --------------------- | ------ | ------ | ------ |
| `umd` 切换应用     | `active` 前 `unmount` | 执行   | 不执行 | 执行   |
| `umd` 预执行后启动 | `active` 前 `unmount` | 执行   | 不执行 | 执行   |
| `umd` 预加载后启动 | 自动 `destroy`        | 执行   | 不执行 | 执行   |
| 重建模式存在实例   | 自动 `destroy`        | 执行   | 不执行 | 不执行 |
| 重建模式初始实例   | 不执行 `unmount`      | 不执行 | 不执行 | 不执行 |
| `alive`            | 不执行 `unmount`      | 不执行 | 不执行 | 不执行 |

以下模式会执行 2 次 `umount`：

- `umd` 模式：容器注销 1 次，`startApp` 启动 1 次
- 重建模式：容器注销 1 次，`startApp` 启动通过 `destory` 销毁实例 1 次

> 前提条件：应用实例已存在 `idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]

其他触发应用 `umount` 的场景：

- 手动 `destroy` 注销应用 [[查看](#-destroy-销毁实例)]
- 监听 `popstate`，浏览器前进后退触发 `iframe` 容器 `onunload`

> 这 2 个场景执行方式参考：容器注销 `unmount` 执行流程

关于 `onunload`：

- 仅存在降级时 `iframe` 容器，用于代替 `web component` 中的 `disconnectedCallback`
- 不巧的是这个事件随时可能会被浏览器删除
- 监听 `popstate` 后退，会根据 `hrefFlag` 决定是否重新渲染并监听 `onunload` [[查看](#processappforhrefjump-监听前进和后端)]

