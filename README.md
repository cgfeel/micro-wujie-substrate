# micro-wujie-substrate

一个 `wujie` 基座，完整内容查看微前端主仓库：https://github.com/cgfeel/zf-micro-app

`wujie` 和 `qiankun`、`micro-app` 的不同解决方案：

| 对比项   | `wujie`                    | `micro-app`                | `wujie`             |
| -------- | -------------------------- | -------------------------- | ------------------- |
| 渲染容器 | `shadowDOM`、`iframe` 容器 | `shadowDOM`、`iframe` 容器 | `single-spa`        |
| `script` | 沙箱 `iframe`              | `proxy`、沙箱 `iframe`     | `proxy`、快照中实现 |
| `css`    | 渲染容器                   | `scopedCSS`、渲染容器      | `scopedCSS`         |

优点：天然隔离

- 直接使用 `iframe`，不需要遍历 `css` 计算 `scoped`

亮点：

- 理论上 `wujie` 可以把任何对外提供访问的网页做成子应用
- 对于不支持 `proxy` 和 `shadowDOM` 的情况提供 `iframe` 降级方案

缺点：

- 对 `React v18` 并不友好，严格模式下会产生协议错误，见：issue [[查看](https://github.com/Tencent/wujie/issues/672)]
- 路由同步并不友好，子应用路由只能通过 `search` 同步到网页链接中国，不能使用 `pathname`

疑惑：`wujie` 频繁操作 `Dom` 直接影响 `js` 性能

- 比如说默认的重建模式下，`wuijie` 每次切换应用就是一次注销和重建

渲染原理：

| 分类        | 原理                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| `wujie`     | 拉取 `template` 放入 `shadowRoot`，将容器挂载到指定节点                     |
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

- `umd` 模式切换应用后，只触发 `mount` 函数挂载应用
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

- 但如果 `ignore` 强制忽略或提供空字符怎么办？

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

| 分类           | `micro-app`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `wujie`                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 创建实例       | `CreateApp`：应用实例类 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#createapp-%E5%88%9B%E5%BB%BA%E5%BA%94%E7%94%A8%E7%B1%BB)]                                                                                                                                                                                                                                                                                                                                                                           | `WuJie`：应用实例类，也是沙箱实例类                                                                                    |
| 映射表         | `appInstanceMap` 应用实例映射表，和组件映射表不同                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `idToSandboxCacheMap` 实例映射表，可以通过应用名从映射表获取实例 [[查看](#1-idtosandboxcachemap存储无界实例和配置)]    |
| 映射表添加方式 | `appInstanceMap.set`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `addSandboxCacheWithWujie` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]                                          |
| 加载资源       | 自动：构造函数调用 `loadSourceCode` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#11-loadsourcecode-%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90)]                                                                                                                                                                                                                                                                                                                                                                | 手动：通过 `importHTML` 等方法获取 `template`，之后再通过 `active` 注入资源到容器中 [[查看](#-active-激活应用)]        |
| 启动沙箱       | 构造函数调用 `createSandbox` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#21-createsandbox-%E5%88%9B%E5%BB%BA%E6%B2%99%E7%AE%B1)]                                                                                                                                                                                                                                                                                                                                                                        | 构造函数调用 `iframeGenerator` [[查看](#iframegenerator创建沙箱-iframe)]                                               |
| 沙箱 `proxy`   | `proxy`、`iframe`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `iframe` - `proxy` 或者降级时仅用 `iframe` [[查看](#wujie-中的代理)]                                                   |
| 手动 `start`   | 不支持手动启动                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `startApp` 或 `preloadApp` 时调用应用 `start` 方法 [[查看](#-start-启动应用)]                                          |
| `mount` 应用   | 自动：由组件或资源加载完毕决定，在 `mount` 中会 `start` 沙箱 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#32-mount-%E6%8C%82%E8%BD%BD%E5%BA%94%E7%94%A8)]                                                                                                                                                                                                                                                                                                                                                | 仅支持由 `start` 方法通过队列执行挂载 [[查看](#-mount-挂载应用)]                                                       |
| `unmount` 应用 | 由组件 `disconnectedCallback` 发起 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#22-disconnectedcallback-%E5%8D%B8%E8%BD%BD%E7%BB%84%E4%BB%B6)]                                                                                                                                                                                                                                                                                                                                                           | 组件 `disconnectedCallback` [[查看](#disconnectedcallback-卸载组件)]、手动销毁 `destroy` [[查看](#其他默认提供的方法)] |
| 复杂度         | 分了 3 类，组件实例：`MicroAppElement` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#defineelement-%E8%87%AA%E5%AE%9A%E4%B9%89%E7%BB%84%E4%BB%B6-microappelement)]，应用实例：`CreateApp` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#createapp-%E5%88%9B%E5%BB%BA%E5%BA%94%E7%94%A8%E7%B1%BB)]，沙箱实例：`IframeSandbox` 或 `WithSandBox` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#21-createsandbox-%E5%88%9B%E5%BB%BA%E6%B2%99%E7%AE%B1)] | 只要关心 `WuJie` 应用实例、组件实例几乎可以忽略                                                                        |
| 优点           | 支持多种隔离方案，自动加载资源、配置沙箱、挂载应用                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | 简单，只有 `iframe` 作为沙箱天然隔离，支持容器降级处理                                                                 |
| 缺点           | 过于复杂，从语意上看有的方法在 3 个实例上相互重叠，容易混淆；不支持容器降级处理                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 过于零散，缺乏逻辑抽象分离，源码 `bug` 有点多                                                                          |

> 无论是 `wujie` 还是 `micro-app` 在解读的分支源码中都存在不同的逻辑问题

#### 📝 `constructor` 构造函数

#### 1. `inject` 注入子应用 3 个对象：

- `idToSandboxMap`：`appInstanceMap` 应用实例映射表 [[查看](#1-idtosandboxcachemap存储无界实例和配置)]
- `appEventObjMap`：`EventBus` 事件映射表 [[查看](#2-appeventobjmap存储-eventbus-托管的事件)]
- `mainHostPath` 主应用 `origin`

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
- 获取基座的 `origin`：`mainHostPath`
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
- `proxyDocument` 的差别，见：`localGenerator` - `proxyDocument` [[查看](#1-劫持空对象作为-proxydocument)]
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

- `startApp` 无论是切换应用还是初始化实例 [[查看](#startapp-启动流程)]
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

1. 通过 `setupApp` 根据应用保存不同的配置，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]
2. 通过不同的组件分开 `startApp`，从而配置不同的属性

> 同理也适用于其他固定的配置信息，需要根据不同的应用做出差异化的表现

不要试图通过样式去匹配不同 `iframe` 容器的 `id`：

- 当子应用发生链接劫持，替换为临时的劫持容器，设定好的样式会随容器 `id` 一同丢失

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

> 而 `proxyDocument` 只有获取 `script` 指向沙箱 `iframe.contentDocument`，其余全部指向容器，比如 `iframe` 容器的 `document`，或是 `shadowRoot`

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

> 因为异步代码属于微任务，上下文必然会优先执行

`fiber` 模式，第 1 任务：

- `beforeScriptResultList` 存在的话，第 1 个队列是宏任务，否则继续往下看
- 同步代码存在的话，第 1 个队列是微任务，否则就一定会是宏任务

非 `fiber` 模式，第 1 个任务：

- `beforeScriptResultList` 存在外联 `script`，第 1 个队列是宏任务
- 同步代码存在的话，第 1 个队列是微任务
- `afterScriptResultList` 存在外联 `script`，第 1 个队列是宏任务
- 在最后返回的 `Promise` 对象 `resolve` 完成任务前执行 `asyncScriptResultList`

> 执行顺序从上至下，有 1 条满足后面的就不用再看

为什么外联 `script` 是宏任务：

- 队列中无论是 `appendChild` 还是 `dispatchEvent` 都是同步操作
- 只有通过 `src` 加载的 `script` 会通过宏任务 `onload` 回调执行 `execQueue.shift()()`

> 如果 `start` 在返回 `Promise` 之前，队列中只有同步方法会存在问题，见：`start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

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
3. 通过 `processCssLoader` 加载样式并还原到入口资源 [[查看](#processcssloader处理-css-loader)]
4. 通过 `active` 将处理的入口资源注入容器 [[查看](#-active-激活应用)]
5. 通过 `patchRenderEffect` 为容器打补丁 [[查看](#patchrendereffect-为容器打补丁)]
6. 通过 `start` 提取 `script` 加入队列并依次提取，其中包括应用入口 `script` [[查看](#-start-启动应用)]
7. 通过 `insertScriptToIframe` 将提取的 `script` 注入沙箱 `iframe` [[查看](#insertscripttoiframe为沙箱插入-script)]
8. 由于已打补丁，通过 `rewriteAppendOrInsertChild` 处理动态添加的 `script` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]
9. 再次执行 `insertScriptToIframe` 将动态添加的以及后续队列的 `script` 注入沙箱 `iframe` [[查看](#insertscripttoiframe为沙箱插入-script)]

> `React` 入口 `script` 将作为同步代码在微任务中注入沙箱，然后通过微任务动态加载 `chunk script`

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

劫持容器不触发 `unmount`：

- 通过 `locationHrefSet` 发起的劫持容器是唯一不需要处理卸载的容器 [[查看](#locationhrefset拦截子应用-locationhref)]
- 劫持容器会随 `Dom` 渲染来决定是否从 `Dom tree` 中删除

#### 5. 容器在哪清除

**沙箱 `iframe`**

所有模式下都在 `destroy` 注销实例时设置为 `null`：

- 而重建模式，除了初次 `startApp` 之外每次一次启动就是一次 `destory`
- 除了 `alive` 模式，预加载没有预执行的情况下，首次 `startApp` 都会 `destory`

> 清空后的 `iframe` 只能通过创建 `WuJie` 实例才能重建

**容器 `iframe` - `document`**

和沙箱 `iframe` 一样，只要不是 `destroy` 就不会清除，但是每次激活应用就是对容器一次重建：

- `alive` 模式，将 `document` 的 `html` 元素添加到新容器
- 其他模式，重新注入 `template` 到新容器

那实例中的 `document` 存在的意义是什么呢：

- `alive` 模式，区别切换和首次加载，且换应用不需要注入资源
- 其他模式记录容器 `document` 上的事件，下次激活应用还原到新容器，见：事件恢复 [[查看](#记录恢复-iframe-容器事件)]

> 降级模式下，切换和首次加载应用的区别在于 `iframe` 容器是否恢复事件

预加载，容器怎么处理：

- 降级预加载 `iframe` 容器会添加到沙箱 `iframeBody` 中
- 注入资源前会根据提供的挂载点 `el`，将 `iframeBody` 清空
- 这样确保启动的子应用资源只会存放在新的 `iframe` 渲染容器里

预执行，容器怎么处理：

- 方式也和预加载是一样的

**容器 `shadowRoot`**

和沙箱 `iframe` 一样，只要不是 `destroy` 就不会清除：

- `alive` 模式，不会自动清除容器，重新激活应用时也不需要再次注入资源
- `umd` 模式，`unmount` 时会清空容器，下次激活时重新注入资源 [[查看](#3-卸载-umd-模式的应用)]
- 重建模式，每次切换应用 `active` 前都会 `destory` 后重建实例

预加载，容器怎么处理：

- `alive` 模式：将 `shadowRoot.host` 挂载到指定节点返回，不销毁不清空也不注入资源
- 其他模式：全部 `destroy` 注销后重新创建实例

预执行，容器怎么处理：

- `alive` 模式：和预加载一样，不销毁不清空也不注入资源
- `umd` 模式：`active` 之前会先 `unmount`，卸载应用时清空 `shadowRoot`
- 重建模式：全部 `destroy` 注销后重新创建实例

**劫持容器 `iframe`**

由 `locationHrefSet` 劫持子应用 `location.href` 创建的容器 [[查看](#locationhrefset拦截子应用-locationhref)]

- 由基座路由变更导致基座重新渲染，从而在 `Dom tree` 中移除
- `degrade` 模式下因为存在 `bug` 不会劫持，因此不存在劫持容器

劫持容器的恢复有 2 个办法：

- 因为基座路由变更，可以通过 `popstate` 前进恢复劫持容器 [[查看](#processappforhrefjump-监听前进和后端)]
- 通过劫持子应用 `location.href` 重建劫持容器

**极端情况：**

- `degrade` 预加载，正常启动；或者正常预加载，`degrade` 启动

`degrade` 由实例构造时决定：

- `alive` 预加载时决定 `degrade`
- `umd` 预执行将保留预加载时的实例，包括 `degrade`
- `umd` 预加载不预执行，`startApp` 后销毁实例，然后使用新的配置重建
- 重建模式每次都会 `destroy` 实例，然后使用新的配置重建

按照上面的规则决定实例最终会采用什么容器，从而保证能够正常加载渲染容器。这些容器该怎么注销、怎么清空请参考上述总结。

#### 📝 `patchCssRules` 子应用样式打补丁

#### 1. 原理阐述

在子应用渲染完毕之后，提取子应用所有的样式，筛选挂载到外部：

1. 兼容 `:root` 选择器样式到 `:host` 选择器上，即获取样式改名后新增到容器 `head` 下
2. 将 `@font-face` 定义到 `shadowRoot` 外部，即插入应用 `shadowRoot.host` 末尾

为什么打补丁？

- `shadowRoot` 作为跟元素匹配的是伪类是 `:host`，见：MDN [[查看](https://developer.mozilla.org/en-US/docs/Web/CSS/:host)]
- 在 `shadowDom` 中不能解析 `@font-face`，需要将其转移到 `document` 下

> 关于 `@font-face` 两篇外网资料: robdodson [[查看](https://robdodson.me/posts/at-font-face-doesnt-work-in-shadow-dom/)]、chromium [[查看](https://issues.chromium.org/issues/41085401)]

放入位置有什么讲究：

- `:host` 改名即可，放入容器的 `head` 会自动生效
- `@font-face` 放入 `doocument` 下即可，但为了便于管理放在 `shadowRoot.host` 里面

> 补丁样式清空的方式，见：单独总结 [[查看](https://github.com/cgfeel/zf-micro-app/blob/main/doc/wujie-umd-patch_css_rules.md#3-%E6%80%BB%E7%BB%93)]

调用场景：

- `active` 激活应用：将资源注入 `shadowRoot` 之后 [[查看](#-active-激活应用)]
- `rebuildStyleSheets`：`umd` 模式切换应用，重建样式之后 [[查看](#-rebuildstylesheets-重新恢复样式)]

不会执行操作的情况：

- `degrade` 降级：没有 `shadowRoot`，`iframe` 容器也不存在兼容样式的问题
- 配置 `cssIgnores` 作为外联加载的样式：只提取内联样式打补丁
- 入口资源中包含 `ignore` 属性的静态样式：将被注释代替
- `WUJIE_DATA_ATTACH_CSS_FLAG` 已处理过不处理

为什么处理过不再处理：

- 提取 `:host` 样式之后，会将其存入集合 `styleSheetElements` [[查看](#2-stylesheetelements-收集样式表)]
- `umd` 模式，下次切换应用会通过 `rebuildStyleSheets` 恢复样式 [[查看](#-rebuildstylesheets-重新恢复样式)]
- `alive` 模式，资源没有变化不需要任何处理
- 重建模式，每一次启动都是一次新的实例，所有流程重新来一遍

注意：

- `patchCssRules` 只能根据容器 `shadowRoot` 提取所有样式元素打补丁
- 而对于容器中动态添加的样式，需要通过 `handleStylesheetElementPatch` 来处理 [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]

> 准确来说 `patchCssRules` 是通过沙箱的 `iframe.contentDocument` 来获取所有的 `style` 元素，由于容器所有元素的 `ownerDocument` 都指向 `iframe.contentWindow.document`，因此可以从沙箱 `document` 可以获取所有 `style` 元素

流程和 `handleStylesheetElementPatch` 中宏任务的回调函数是一样的 [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]：

- 通过 `getPatchStyleElements` 从提供的 `stylesheet` 中提取指定的样式
- 若存在 `hostStyleSheetElement`：`:host` 样式元素，将其插入 `shadowRoot.head`
- 若存在 `fontStyleSheetElement`：字体样式元素，将其插入 `shadowRoot.host` 末尾
- 如果通过上述任意样式打过补丁，标记 `WUJIE_DATA_ATTACH_CSS_FLAG` 避免下次重复执行

#### 2. 重复提取样式的 `bug`

篇幅太长单独整理了一篇，见：`wujie` 中 `patchCssRules` 存在重复加载的 `Bug` [[查看](https://github.com/cgfeel/zf-micro-app/blob/main/doc/wujie-umd-patch_css_rules.md)]

在这里不得不吐槽一下，`wujie` 处理样式真的很零乱：

| 方法                                                                                                                                                                      | 样式类型 | 用途                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ |
| 1. `processTpl` [[查看](#processtpl-提取资源)]                                                                                                                            | 静态样式 | 将资源中的静态样式替换成注释                     |
| 2. `processCssLoader` [[查看](#processcssloader处理-css-loader)]                                                                                                          | 静态样式 | 加载从资源中提取的静态样式并替换资源中对应的注释 |
| 3. `processCssLoaderForTemplate` [[查看](#processcssloaderfortemplate手动添加样式)]                                                                                       | 静态样式 | 手动添加样式到应用头部和尾部                     |
| 4. `patchCssRules` [[查看](#-patchcssrules-子应用样式打补丁)]                                                                                                             | 所有类型 | 为容器中已存在的样式打补丁                       |
| 5. `rewriteAppendOrInsertChild`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L158)] | 动态样式 | 拦截应用动态添加样式                             |
| 6. `patchStylesheetElement` [[查看](#patchstylesheetelement劫持处理样式元素的属性)]                                                                                       | 动态样式 | 劫持处理样式元素的操作                           |
| 7. `handleStylesheetElementPatch` [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]                                                                           | 动态样式 | 为动态样式打补丁                                 |

- 对于方法：2、3，对比加载 `script`，方法全部归纳在 `start` [[查看](#-start-启动应用)]
- 对于打补丁的方法：4、7，执行的过程是一样的

除此之外以下方法执行过程也高度相似：

| 方法或流程                                                                               | 参考对象                                                                                                                                             | 相同点                                                                                   |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `startApp` 的实例初始化                                                                  | 预加载中 `runPreload`                                                                                                                                | 提取资源，实例初始化、`active`、`start`，见：对比 [[查看](#3-创建新的沙箱实例)]          |
| `umd` 切换应用 [[查看](#22-umd-模式切换应用)]                                            | 应用 `mount` [[查看](#1-umd-方式启动)]                                                                                                               | 执行生命周期方法、挂载应用                                                               |
| `getCssLoader`                                                                           | `getJsLoader`                                                                                                                                        | 一模一样，唯一的区别是提取插件的属性名，见：通过配置替换资源 [[查看](#通过配置替换资源)] |
| `createIframeContainer`                                                                  | `renderIframeReplaceApp`                                                                                                                             | 见：创建 `iframe` 容器 [[查看](#创建-iframe-容器)]                                       |
| `renderTemplateToShadowRoot` [[查看](#rendertemplatetoshadowroot-渲染资源到-shadowroot)] | `renderTemplateToIframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe-容器)]                                                                    | 创建 `html` 元素、手动插入样式、修正容器 `parentNode`，重写容器方法                      |
| `patchElementEffect` - `baseURI` [[查看](#patchelementeffect为元素打补丁)]               | `getCurUrl`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L201)] | 都是通过 `proxyLocation` 获取 `protocol` + `host` + `pathname`                           |

#### 📝 `rebuildStyleSheets` 重新恢复样式

仅限于 `umd` 模式切换应用，或预执行后启动应用：

- 由于 `umd` 模式初次 `start` 之后，再次启动不会重新注入执行 `script`
- 因此应用中的动态样式也不会重新注入，需要在 `mount` 前通过 `styleSheetElements` 恢复样式

> `styleSheetElements` 的样式收集来自 2 处 [[查看](#2-stylesheetelements-收集样式表)]

恢复方式：

- 遍历 `styleSheetElements` 集合中的样式元素，注入到容器的 `head` 元素下
- 通过 `patchCssRules` 为恢复的样式打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]

> 为样式打补丁存在重复加载的 `Bug`，见：单独总结 [[查看](https://github.com/cgfeel/micro-wujie-substrate?tab=readme-ov-file#handlestylesheetelementpatch%E4%B8%BA%E5%BA%94%E7%94%A8%E4%B8%AD%E5%8A%A8%E6%80%81%E6%A0%B7%E5%BC%8F%E6%89%93%E8%A1%A5%E4%B8%81)]

#### 📝 `destroy` 销毁实例

#### 1. 卸载应用

- 通过 `unmount` 卸载应用 [[查看](#-unmount-卸载应用)]
- 通过 `bus` 对象清理监听的通信，见：实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- 将实例中相关的属性设置为 `null`，见：实例中关键属性 [[查看](#-wujie-实例中关键属性)]

#### 2. 清空容器，销毁实例

- 如果容器挂载点 `el` 存在的话，通过 `clearChild` 讲其子集全部清空
- 从沙箱 `window` 中找到 `__WUJIE_EVENTLISTENER__`，清除记录的事件
- 找到沙箱挂载点，删除沙箱 `iframe` 元素
- 通过 `deleteWujieById` 从映射表中删除实例，见：`idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]

`__WUJIE_EVENTLISTENER__` 清除事件：

- 由于在 `patchIframeEvents` 中重写了沙箱 `window` 的 `removeEventListener` [[查看](#patchiframeevents-劫持沙箱-iframe-的-eventlistener)]
- 当向沙箱发起删除事件时，会先清空记录然后执行 `removeEventListener` 删除事件

> 原因见：转发 `window` 事件 [[查看](#__wujie_eventlistener__转发-window-事件)]

#### 📝 `Wujie` 实例中关键属性

#### 1. 常规属性

这里只列举部分关键的属性：

| 属性                   | 定义                                                                                                                                                                | `constructor` 初始化                                                           | `destroy` 注销          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| `activeFlag`           | 实例已激活                                                                                                                                                          | `undefined`，在 `active` 时为 `true`                                           | 在 `unmount` 中 `false` |
| `bus`                  | 通信对象，使用 `appEventObjMap` 获取事件映射表，通过 `inject` 实现父子应用指向同一个对象，见 `inject` [[查看](#1-inject-注入子应用-3-个对象)]                       | `EventBus`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/bus.html)]  | `null`                  |
| `degrade`              | 主动降级，用 `iframe` 作为应用容器                                                                                                                                  | 通过配置文件在构造函数中声明                                                   | 不处理                  |
| `elementEventCacheMap` | 当降级时用于保存应用中所有元素事件 [[查看](#elementeventcachemap降级容器事件)]                                                                                      | `WeakMap`，在构造函数中通过 `iframeGenerator` 发起记录                         | `null`                  |
| `execFlag`             | 应用启动状态                                                                                                                                                        | `undefined`，应用 `start` 后则为 `true`                                        | `null`                  |
| `execQueue`            | `start` 应用中的任务队列                                                                                                                                            | `[]`                                                                           | `null`                  |
| `id`                   | 应用名列                                                                                                                                                            | `name`，字符类型                                                               | 不处理                  |
| `mountFlag`            | `umd` 模式挂载 `true`，卸载 `false`                                                                                                                                 | `undefined`                                                                    | `null`                  |
| `provide`              | 为子应用提供通信 `bus`、代理的 `location`，可选对象：传递数据 `props`、`shadowRoot` 容器，见：文档 [[查看](https://wujie-micro.github.io/doc/api/wujie.html#wujie)] | 在构造函数里提供 `bus`、`location`，在 `active` 中提供 `props` 和 `shadowRoot` | `null`                  |
| `styleSheetElements`   | 收集应用中动态添加的样式，`:host` 补丁样式 [[查看](#2-stylesheetelements-收集样式表)]                                                                               | `[]`                                                                           | `null`                  |
| `sync`                 | 单向同步路由，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#sync)]                                                                           | `udefined`，只在 `active` 时通过配置文件设置                                   | 不处理                  |
| `template`             | `string` 类型，记录通过 `processCssLoader` 处理后的资源，在 `alive` 或 `umd` 模式下切换应用时可保证资源一致性                                                       | `undefined`，只在 `active` 时候记录                                            | 不处理                  |

> 像 `degrade` 和 `plugin` 这样在实例化就定义好值，除了销毁后设置 `null`，不能中途更新值。也就是说对于像 `alive` 模式的应用，预加载配置的信息，不会因为 `startApp` 配置不同，而加载应用发生改变

#### 2. 特殊属性

**`hrefFlag`：通过 `iframe` 加载子应用 `url`**

这里的 `iframe` 既不是沙箱 `iframe`，也不是容器 `iframe`，而是：

- 专门用来加载通过 `location.href` 跳转链接时，临时建立一个 `iframe` 来替换容器
- 比如子应用通过 `location.href` 转向第三方页面，这时就新建 `iframe` 充当临时容器

属性值的更新：

- `constructor` 构建：`undefined`
- `destroy` 销毁：`null`
- `active` 激活应用：`false`
- `locationHrefSet` 拦截子应用：设置 `true` [[查看](#locationhrefset拦截子应用-locationhref)]
- `popstate` 前进时，页面来自 `locationHrefSet` 拦截：`true`
- `popstate` 后退时，从 `locationHrefSet` 拦截的页面离开：`false`

因此得出：

- `hrefFlag` 标记时，表示当前应用的链接并非来自基座
- 只有子应用内通过 `location.href` 修改当前页面链接才会拦截触发

> 由于 `locationHrefSet` 存在 `bug`，因此仅限来自非降级模式下的子应用 [[查看](#locationhrefset拦截子应用-locationhref)]

用途：

- `unmount` 注销应用：`umd` 模式决定是否要卸载应用 [[查看](#-unmount-卸载应用)]
- `clearInactiveAppUrl` 清理路由：也是 `unmount` 时触发 [[查看](#clearinactiveappurl清理路由)]
- `popstate` 后退时：判断是否是从 `locationHrefSet` 拦截的页面离开

**`el`：挂载容器**

通常来自配置文件设定挂载节点，但是下面情况除外：

- `preloadApp` 预加载：挂载到沙箱 `iframe` 的 `body`
- `startApp` 加载应用不提供 `el`：挂载到沙箱 `iframe` 的 `body`
- `startApp` 切换应用不提供 `el`：直接报错

属性值的更新：

- `constructor` 构建：`undefined`
- `destroy` 销毁：`null`
- `active` 激活应用：沙箱 `iframe` 的 `body`，或配置指定的 `el` 节点

用途：

- `startApp`：挂载容器 [[查看](#startapp-启动流程)]
- `preloadApp`：预加载时候将子应用临时挂载 [[查看](#preloadapp-预加载流程)]
- `locationHrefSet`：拦截跳转挂载临时 `iframe` [[查看](#locationhrefset拦截子应用-locationhref)]

**`url`：应用入口链接**

无论是预加载还是启动应用都必须提供的配置，然而说 `url` 特殊是因为，这个属性在构造和 `active` 时允许分别赋值，那么这就可能造成如下问题。

问题 1：构造函数和 `active` 提供的 `url`不一样

- ❎ 目前不可能，源码中只要声明实例，那么随后一定会使用相同的 `url` 加载资源，`active` 激活应用

问题 2：`preloadApp` 和 `startApp` 时 `url` 不一样呢

- ✅ 有可能

不过目前来说这个问题影响有限：

- 可能会造成主应用通过 `syncUrlToIframe` 同步路由时，子应用的 `pathname` 错误 [[查看](#syncurltoiframe同步主应用路由到子应用)]

为什么？

- 对于重建模式，每次都会销毁实例重建，`url` 以 `startApp` 提供的配置为准 [[查看](#3-创建新的沙箱实例)]
- 其他不销毁实例的模式下，`active` 设置 `url` 后仅做了同步路由的操作 [[查看](#syncurltoiframe同步主应用路由到子应用)]
- 其他关于路由、`location` 等操作已在构造函数完成 [[查看](#-constructor-构造函数)]
- 而应用资源则在 `active` 之前已通过 `importHTML` 加载完毕 [[查看](#importhtml-加载资源)]

只能说 `url` 分开赋值有可能造成隐患，如何彻底杜绝呢？

- `active` 取消赋值 `url`，直接从 `this.url` 中获取，因为构造函数已赋值了

`url` 使用的场景：

- `WuJie`：构造函数实例化 [[查看](#-constructor-构造函数)]
- `initBase`：初始化设置沙箱 `base` 元素 [[查看](#base标签操作)]
- `importHTML`：加载应用资源 [[查看](#importhtml-加载资源)]
- `active`：激活应用 [[查看](#-active-激活应用)]
- `syncUrlToIframe`：同步基座的路由到子应用 [[查看](#syncurltoiframe同步主应用路由到子应用)]

> 顺序从上至下，只列举了和 `url` 直接关联的方法，不包含通过 `url` 衍生对象，例如：`proxyLocation`

那 `preloadApp` 和 `startApp` 提供的应用名不一样呢？

- 那就作为不同的应用加载了，`wujie` 按照应用名来划分应用

**`plugins`：插件集合**

`wujie` 的插件系统，类型为 `Array<plugin>`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html)]

属性值的更新：

- `constructor` 构建：`Array<plugin>`
- `destroy` 销毁：`null`

构建时通过 `getPlugins` 确保至少包含 2 个默认插件。

插件 1：`cssBeforeLoaders` - `内联样式`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/plugin.ts#L70)]

- 由 `processCssLoaderForTemplate` 添加到每个应用头部 [[查看](#processcssloaderfortemplate手动添加样式)]
- 解决 `shadowRoot` 下浮窗层级问题，见：`issue` [[查看](https://github.com/Tencent/wujie/issues/455)]

插件 2：`cssLoader` - `cssRelativePathResolve`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/plugin.ts#L57)]

参数：

- `code`：样式代码或空字符
- `src`：内联样式是空字符，外联样式为链接相对路径，或绝对路径
- `base`：从 `proxyLocation` 中提取：`host` + `pathname`

`code` 根据 `ignore` 来决定提供的内容：

- `ignore`：空字符，样式只能作为外联加载，见：`getExternalStyleSheets` [[查看](#getexternalstylesheets加载样式资源)]
- 其他情况：全部提供样式代码，即便是外联样式也会通过 `fetchAssets` 加载 [[查看](#fetchassets加载资源缓存后返回-promise)]

> 因此通过 `ignore` 实现外联加载的样式，引用的资源需要设为绝对路径或 `base64`，否则会因为路径不对找不到资源

调用场景：

- `processCssLoader`：处理应用中的静态样式替换 [[查看](#processcssloader处理-css-loader)]
- `getCssLoader`：来自动态添加和手动添加的样式替换，见：通过配置替换资源 [[查看](#通过配置替换资源)]

处理前会根据 `src` 计算 `baseUrl`，见：`getAbsolutePath` [[查看](#getabsolutepath获取绝对路径)]

- 空字符：采用应用的 `base`，如内联样式
- 相对路径：`base` + `src`
- 字符串 - 非 `url`：`base.origin` + `/` + `src`
- 绝对路径：忽略 `base`，采用绝对路径

之后再提取样式中的路径，去匹配 `baseUrl`，见：`getAbsolutePath` [[查看](#getabsolutepath获取绝对路径)]

- 空字符：`baseUrl`，这样是错误情况，拿不到任何资源
- 相对路径：`baseUrl` + `url`
- 字符串 - 非 `url`：`baseUrl.origin` + `/` + `url`
- 绝对路径：`url` 不做处理，忽略 `baseUrl`

最后说说正则：

```
/(url\((?!['"]?(?:data):)['"]?)([^'")]*)(['"]?\))/g
```

> `//g`：说明是匹配样式全局中所有的内容

第一层分成 3 个括号，先看后 2 个：

- `(['"]?\))` 包含：`')`、`")`、`)`
- `([^'")]*)` 包含：除双引号或单引号之外所有内容

第 1 个括号里面的正则：

- `(url\(.*)`：以 `url(` 开头
- `(?!)`：负前瞻规则
- `['"]?`：最多有 1 个单引号或双引号

负前瞻规则 `exp1(?!exp2)` 解读：

- 查找后面不是 `exp2` 的 `exp1`
- 这里的 `exp2` 是：`['"]?(?:data):`，开头最多 1 个引号 + `data:`

> `?:` 表示非捕获分组，匹配的值不会保存，和它相反的是捕获分组 `()`

连起来看 `replace` 中第二个函数中的参数：

- `_m`：匹配的全部字符，这里用不上
- `pre`：以 `url(` 开头跟着 1 个引号，但不能是 `"data:`、`'data:`、`data:`
- `url`：`post` 之前所有的内容
- `post`：`')`、`")`、`)`

最终将 `url` 替换成绝对路径返回：

- `pre` + `absoluteUrl` + `post`

### `wujie` 中的代理

![wujie-proxy](https://github.com/user-attachments/assets/25088666-fe65-442e-88a2-3e44f3bb3ba6)

#### 📝 `proxyGenerator` 非降级情况下的代理

非降级 `degrade` 情况下代理：`window`、`document`、`location`

目录：`entry.ts` - `proxyGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/proxy.ts#L40)]

参数：

- `iframe`：沙箱 `iframe`
- `urlElement`：将子应用入口链接通过 `appRouteParse` 转换成 `HTMLAnchorElement` 对象 [[查看](#approuteparse-提取链接)]
- `mainHostPath`：基座 `origin`
- `appHostPath`：子应用 `origin`

返回 1 对象，包含 3 个属性：

- `proxyWindow`：代理沙箱 `window` 对象，降级代理 `localGenerator` 不提供
- `proxyDocument`：代理空对象，但根据情况选择不同容器进行劫持或操作
- `proxyLocation`：代理空对象，但根据情况使用子应用链接或沙箱 `location` 劫持或操作

#### 1. 代理沙箱 `window` 作为 `proxyWindow`

分别对 `get`、`set`、`has` 做了代理，在提供的流程图中可以看到 [[查看](#wujie-中的代理)]：

- `proxyWindow` 是包裹在 `script module` 下工作的
- 即子应用中的 `script` 对 `window` 等全局对象操作都指向同一个 `proxyWindow`
- 这样即便是沙箱 `window` 也不会受到应用污染
- 而对于不同的应用，各自应用下的 `script` 都指向各自应用的 `proxyWindow`

**`get` 操作按照获取的 `property` 返回相应对象**

返回 `proxyLocation` [[查看](#3-代理空对象作为-proxylocation)]：

- `location`

返回自身 `proxyWindow`：

- `self`
- `window`：必须是全局 `window` 描述中存在 `get` 属性

从沙箱 `window` 获取 `property` 直接返回，不需要绑定 `this`：

- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR__`：见：`initIframeDom` [[查看](#initiframedom初始化-iframe-的-dom-结构)]
- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR_ALL__`：见：`initIframeDom` [[查看](#initiframedom初始化-iframe-的-dom-结构)]
- 通过 `getOwnPropertyDescriptor` 获取 `property` 描述信息为不可配置且不可写

返回 `getTargetValue` 获取沙箱 `window` 的属性 [[查看](#gettargetvalue-从对象中获取属性)]：

- 符合 `setFnCacheMap` 要求的属性，需要绑定 `this` 为沙箱 `window` [[查看](#1-setfncachemap-存储绑定上下文的方法)]
- 不符合 `setFnCacheMap` 要求直接从沙箱 `window` 中找到属性并返回，找不到返回 `undefined`
- 全局 `window` 描述信息中不存在 `get` 属性，从沙箱 `window` 中获取属性

**`set` 操作**

直接绑定在沙箱 `window` 对象上：

- 绑定前会通过 `checkProxyFunction` 将符合要求的方法存入映射表，见：`setFnCacheMap` [[查看](#1-setfncachemap-存储绑定上下文的方法)]
- 以便下次 `get` 操作时，直接从缓存表中获取

**`has` 操作**

从 `proxyWindow` 中判断是否存在对象：

- `proxyWindow` 是沙箱 `window` 的代理，可直通过 `in` 判断属性是否存在

**一道思考题：`proxyWindow` 中的 `document` 指向谁？**

先说答案：

- 会通过 `getTargetValue` 从沙箱 `window` 中直接获取 `document` 属性

> `proxyWindow` 和 `proxyLocation` 可以包裹在 `script module` 中，但是 `proxyDocument` 不行，因为 `Dom` 本身是从上至下的树状结构

衍生问题：沙箱 `document` 如何指向 `proxyDocument`

- 通过 `patchDocumentEffect` 进行拦截，见：`proxyDocument` 在哪调用 [[查看](#proxydocument-在哪调用)]

#### 2. 代理空对象作为 `proxyDocument`

代理的是一个空对象 `{}`，且只有 `get` 取值：

- 在 `get` 操作中，第一个参数也称为 `_fakeDocument`（假的 `document`），不会从这个对象上做任何操作

取值前的准备工作：

- 从全局 `window` 上获取：`document`
- 从应用实例上获取：`shadowRoot` 容器、`proxyLocation`
- 从沙箱 `window` 上获取原生方法：`rawCreateElement` 创建元素、`rawCreateTextNode` 创建文本

> 在获取对象前需要确保 `shadowRoot` 已实例化，否则通过 `stopMainAppRun` 输出警告并抛出错误中断执行

**代理 `createElement` 和 `createTextNode`：**

- 代理劫持 `document` 上对的方法，并将其返回作为子应用的对应的方法

在 `Proxy` 中通过 `apply` 在调用时代理操作行为：

- 根据 `property` 决定使用 `rawCreateElement` 还是 `rawCreateTextNode`
- 执行方法时通过 `apply` 绑定沙箱 `iframe.contentDocument` 作为 `this`，透传参数 `arg`
- 通过 `patchElementEffect` 为每一个生成的 `Dom` 打补丁后并返回： [[查看](#patchelementeffect为元素打补丁)]

备注：

- 在应用中所有的 `createElement`、`createTextNode` 都会通过沙箱 `iframe`
- 而 `appendChild`、`insertBefore` 都会通过 `shadowRoot`
- 这是因为创建元素时需要通过 `patchElementEffect` 打补丁，而最终是要在 `shadowRoot` 容器中挂载

**代理 `documentURI` 和 `URL`：**

- 返回 `proxyLocation` 的 `href`

**代理：通过标签获取元素**

- 包含：`getElementsByTagName`、`getElementsByClassName`、`getElementsByName`
- 劫持 `shadowRoot.querySelectorAll` 返回 `Proxy` 对象
- 在返回的对象中通过 `apply` 去处理子应用获取代理方法后，处理执行结果并返回

如果上下文 `this` 不是 `iframe.contentDocument`：

- 直接从上下文中获取元素，说明当前操作的 `Dom` 对象没有打补丁指向沙箱 `document`

如果 `getElementsByTagName` 获取所有的 `script`：

- 返回 `iframe.contentDocument.scripts`，因为所有的 `script` 存放在沙箱 `iframe` 中

其他情况全部在 `shadowRoot` 获取，但是获取前需要转换下参数：

- `getElementsByTagName`：不需要处理
- `getElementsByClassName`：转换成元素类名 `.{$arg}`
- `getElementsByName`：转换成元素属性名 `[name="${arg}"]`

**代理：`getElementById`**

- 劫持 `shadowRoot.querySelector` 返回 `Proxy` 对象
- 在返回的对象中通过 `apply` 去处理子应用获取代理方法后，处理执行结果并返回

如果上下文 `this` 不是 `iframe.contentDocument`：

- 直接从上下文中获取元素，说明当前操作的 `Dom` 对象没有打补丁指向沙箱 `document`

否则：

- 转换参数去匹配 `querySelector` 做查询，如：`[id="${arg}"]`
- 优先从 `shadowRoot` 去查询，找不到再去沙箱 `iframe` 中查询，因为获取的有可能是 `script`

**代理：查询方法**

- 包含：`querySelector`、`querySelectorAll`
- 劫持 `shadowRoot` 对应方法返回 `Proxy` 对象
- 在返回的对象中通过 `apply` 去处理子应用获取代理方法后，处理执行结果并返回

如果上下文 `this` 不是 `iframe.contentDocument`：

- 直接从上下文中获取元素，说明当前操作的 `Dom` 对象没有打补丁指向沙箱 `document`

否则：

- 优先从 `shadowRoot` 查询，查询不到再去沙箱 `iframe` 中查询
- 但不会去查沙箱 `iframe` 中的 `base` 元素，因为他会影响路由

> 从上面可以明确知道，存放 `script` 一定是沙箱 `iframe`，其他元素一定是 `shadowRoot`，否则就会匹配错乱

**代理：查询 `html` 元素**

- 返回的一定是 `shadowRoot` 容器中的 `shadowRoot.firstElementChild`

**代理：查询元素集合**

在 `shadowRoot` 容器中通过 `querySelectorAll` 去匹配相应的元素集合：

- `forms`：`form`
- `images`：`img`
- `links`：`a`

**代理：`documentProxyProperties`**

包含的元素见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L42)]，分别如下：

`ownerProperties`、`shadowProperties`：

- 如果 `property` 是 `activeElement`，且 `shadowRoot` 中不存在的情况下返回 `shadowRoot.body`
- 其他一律从 `shadowRoot` 中返回对应的属性

`shadowMethods`：

- 通过 `getTargetValue` 优先从 `shadowRoot` 获取，否者从全局 `document` 中获取 [[查看](#gettargetvalue-从对象中获取属性)]

`documentProperties`：

- 直接从全局 `document` 中获取

`documentMethods`：

- 通过 `getTargetValue` 从全局 `document` 中获取 [[查看](#gettargetvalue-从对象中获取属性)]

#### 3. 代理空对象作为 `proxyLocation`

代理的是一个空对象 `{}`，在 `get` 和 `set` 中：

- 第一个对象也称为 `_fakeDocument`（假的 `document`），不会从这个对象上做任何操作
- 因此读取属性从 `iframe.contentWindow.location` 对象中获取

设计初衷：

- 在沙箱 `iframe` 初始化时已将 `src` 设为和基座同域，由此决定了沙箱 `location`
- 而在沙箱中更新链接或 `history`，也需要确保更新的 `url` 和基座同域
- 但是子应用中通过 `location` 读取属性时，则需要保持和资源入口链接同域

概念名词：

- `proxyLocation`：在沙箱中包裹在 `script module` 中作为代理的 `location`，见：流程图 [[查看](#wujie-中的代理)]
- 沙箱 `location`：沙箱 `iframe` 下的 `location` 对象

这样就意味着：

- 应用中所有的 `script` 的 `location` 操作都指向 `proxyLocation`
- 应用的 `window` 指向 `prooxyWindow`，而 `proxyWindow` 的 `location` 指向 `proxyLocation`
- 而沙箱 `iframe` 读取操作的 `location` 对象，不会受到来自 `proxyLocation` 对象任何污染

拦截的方法：

- `get`：取值
- `set`：赋值
- `ownKeys`：枚举所有属性
- `getOwnPropertyDescriptor` 获取描述信息

**`get` 取值**

- 拦截子应用读取 `location` 对象中所有属性和方法

从子应用入口链接获取信息，包含：

- `host`、`hostname`、`protocol`、`port`、`origin`

获取 `href`：

- 获取沙箱 `iframe` 的 `location.href`，返回之前要将主应用的 `origin` 替换为子应用的 `origin`
- 因为沙箱 `iframe` 和基座同域，而应用中资源的 `url` 是基于子应用的 `origin`

屏蔽 `reload` 的 `bug`：

- 初衷：毕竟辛苦加载的 `script`，不能因为 `replad` 清空了
- 原因：子应 `reload` 用会因为自身的 `src` 是基座的 `origin`，重新加载基座造成错误
- 问题：但同时也阉割子应用 `location.reload` 功能
- 修复：正确的做法应该是转发自全局 `window.location.reload`

处理 `replace` 的 `bug`，先解读流程：

- 代理沙箱的 `location.replace` 在 `apply` 中将更新 `replace` 操作的 `url`
- 更新 `url` 的方式：将子应用的 `origin` 替换为基座 `origin`
- 目的：保持沙箱 `iframe` 和基座同源

`replace` 的条件：

| 条件                                               | 通常做法                                                                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 只替换带有子应用 `origin` 的绝对路径               | 通查使用相对路径，毕竟线上线下 `host` 不一样，但相对路径也存在问题                                                                                                          |
| 只拦截 `location.replace` 不拦截 `history.replace` | 对于 `SPA` 应用来说通常是由 `history` 来负责路由 `replace`，这个操作在沙箱初始化时由 `patchIframeHistory` 做了拦截 [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)] |

问题：

- 拦截后所有链接跳转是在沙箱 `iframe` 下进行的
- 假定 `replace` 跳转到子应用首页，最终会替换 `url` 为基座首页
- 导致沙箱 `iframe` 链接跳转到基座首页，从而引发子应用的沙箱去加载基座，产生问题

复现：

- `vue-project` 子应用中复现了问题 [[查看](https://github.com/cgfeel/micro-wujie-app-vue3)]
- 运行方法：启动子应用和基座，选择 `Vue 应用`，点击进入应用中 `about` 路由
- 点击按钮 "replace go home" 查看错误演示

怎么修复：

- 拦截 `location.replace`，检测跳转的链接是应用内部路由还是外部链接
- 外部链接通过 `locationHrefSet` 创建临时的劫持容器 [[查看](#locationhrefset拦截子应用-locationhref)]
- 应用内部路由通过 `history.replace` 进行处理，如下演示

> 子应用的 `history` 在沙箱 `iframe` 初始化时已经打补丁了，见：`patchIframeHistory` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)]

```
iframeWindow.history.replaceState(null, "", args[0])
```

其他情况：

- 通过 `getTargetValue` 直接从沙箱 `location` 中获取 [[查看](#gettargetvalue-从对象中获取属性)]

**`set` 赋值**

赋值会绑定新的值到沙箱 `location` 对应的 `property` 上，但 `href` 除外

**`href` 赋值操作**

方法：

- 拦截操作并通过 `locationHrefSet` 创建一个新的 `iframe` 代替渲染容器 [[查看](#locationhrefset拦截子应用-locationhref)]

结果：

- 用 `iframe` 替换子应用容器，并更新当前 `url` 中对应的 `search`
- 由于拦截的很直接粗暴，切换会很突兀，需要通过 `degradeAttrs` 进行适配 [[查看](#41-degrade-主动降级渲染)]

这意味着：

- 实际使用过程中，哪怕没有考虑需要 `degrade` 主动降级
- 但只要应用中存在 `location.href` 更新页面链接，就需要添加 `degradeAttrs` 配置

设计初衷：

- 可能出于 `SPA` 的考量，所有链接都是基座的子应用，哪怕跳到第三方页面也不能离开基座
- 比如说后台管理，子应用中有个第三方查快递的链接，通常情况可能就跳转走了，但是在 `wujie` 中会将其也作为子应用挂载到指定节点

问题是：

- 通常跳转链接不都是通过 `HTMLAnchorElement` 元素吗，这种情况是没有拦截的
- 既然这样，那 `location.href` 不应该是转发给全局 `location.href` 赋值更新吗？

**`ownKeys` 枚举所有属性**

- 从沙箱 `location` 中获取所有 `property`，但不包括被屏蔽的 `reload`

**`getOwnPropertyDescriptor` 获取描述信息**

返回信息包含有：

- `enumerable`：可枚举
- `configurable`：可配置
- `writable`：不可写，自动补全
- `value`：很有可能拿到 `undefined`

关于 `value` 的 `bug`：

- 这里通过 `this` 取值，而 `this` 是 `_fakeLocation` 空对象，所以有可能是 `undefined`
- 当然空对象也有原型链，例如：`toString` 是可以拿到的，但这就和 `location` 无关了

#### 📝 `localGenerator` 降级情况下的代理

降级情况下 `document`、`location` 的代理，`window` 采用沙箱 `window`，也不需要包裹 `script module`，直接使用沙箱 `iframe` 做隔离，见：流程图 [[查看](#wujie-中的代理)]

目录：`proxy.ts` - `localGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/proxy.ts#L261)]

参数：

- `iframe`：沙箱 `iframe`
- `urlElement`：将子应用入口链接通过 `appRouteParse` 转换成 `HTMLAnchorElement` 对象 [[查看](#approuteparse-提取链接)]
- `mainHostPath`：基座 `origin`
- `appHostPath`：子应用 `origin`

返回 1 对象，包含 2 个属性：

- `proxyDocument`：代理空对象，但是会从渲染容器和全局 `document` 中获取属性
- `proxyLocation`：代理空对象，但是会从沙箱 `location` 和子应用入口链接获取属性

#### 1. 劫持空对象作为 `proxyDocument`

和 `proxyGenerator` 相同，见：`proxyGenerator` - `proxyDocument` [[查看](#2-代理空对象作为-proxydocument)]

- 创建元素和文本：`createElement`、`createTextNode`
- 代理 `documentURI` 和 `URL`
- `getElementsByTagName`：通过标签获取元素集合，包含获取 `script` 集合
- `getElementById`：通过 `id` 获取元素，先容器再沙箱

和 `proxyGenerator` 不同：

- `proxyGenerator` 通过 `Proxy` 拦截对象做代理
- `locationHrefSet` 通过 `Object.defineProperties` 劫持空对象做代理
- `documentProxyProperties` 处理方式不同

> 关于 `documentProxyProperties`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L42)]

为什么降级后代理采用 `Object.defineProperties`：

- 因为 `Proxy` 不兼容 `IE`

`documentProxyProperties` 的处理：

- 遍历集合中的属性，劫持容器 `document` 中对应的属性
- 如果是可执行的方法，绑定 `this` 为容器 `document` 并返回，否则直接返回属性

不需要考虑的属性：

- 获取元素集合：`getElementsByClassName`、`getElementsByName`
- 查询 `html` 元素：`documentElement`、`scrollingElement`
- 获取集合：`forms`、`images`、`links`
- 查询方法：`querySelector`、`querySelectorAll`

容器中所有的元素通过 `patchElementEffect` 将 `ownerDocument` 指向沙箱 `document` [[查看](#patchelementeffect为元素打补丁)]：

- 所以无论是 `documentProxyProperties` 包含的属性，还是不需要考虑的属性，都可以直接从容器 `document` 中获取，因为在此之前，它们的 `ownerDocument` 已指向沙箱 `iframe.contentDocument`

#### 2. 劫持空对象作为 `proxyLocation`

和 `proxyGenerator` 相同，见：`proxyGenerator` - `proxyLocation` [[查看](#3-代理空对象作为-proxylocation)]

- 从子应用入口链接获取信息：`host`、`hostname`、`protocol`、`port`、`origin`
- 获取 `href`：用主应用的 `origin` 替换为子应用的 `origin`
- 设置 `href`：会通过 `locationHrefSet` 创建一个新的 `iframe` 代替应用容器 [[查看](#locationhrefset拦截子应用-locationhref)]
- 屏蔽 `reload`，当然屏蔽导致的问题也一样，见：`proxyGenerator` - `proxyLocation` [[查看](#3-代理空对象作为-proxylocation)]
- 遍历 `location` 属性绑定在 `proxyLocation`，如果是 `isCallable` 方法 [[查看](#iscallable判断对象是一个函数)]，绑定 `this` 为沙箱的 `location`

和 `proxyGenerator` 不同：

- 不拦截 `replace`，也不存在 `replace` 带来的问题，见：`proxyGenerator` - `proxyLocation` [[查看](#3-代理空对象作为-proxylocation)]
- 因为 `location` 方法并没有 `window` 那么多，不需要通过 `setFnCacheMap` 缓存绑定的方法 [[查看](#1-setfncachemap-存储绑定上下文的方法)]
- 降级后的 `proxyLocation` 不会捆绑在子应用中，见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

#### 📝 总结

#### `proxyWindow` 在哪调用

仅在 `insertScriptToIframe` 注入 `script` 到沙箱 `iframe` 时，包裹模块用到 [[查看](#insertscripttoiframe为沙箱插入-script)]

- 仅限非降级 `degrade` 模式，降级的 `iframe` 容器也不提供 `proxyWindow`

那 `degrade` 降级时真的不需要代理 `window` 吗？

- 并不是，至少 `location` 就不是
- 降级后 `iframe` 的 `location` 存在哪些问题？见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

以下属性在降级情况的确不用 `proxyWindow`：

| 属性     | 非降级模式                                            | `degrade` 降级 |
| -------- | ----------------------------------------------------- | -------------- |
| `self`   | `proxyWindow`                                         | 沙箱 `window`  |
| `window` | 全局 `window` 描述信息存在 `get` 属性为 `proxyWindow` | 沙箱 `window`  |

以下属性无论降不降级都从沙箱 `window` 中获取：

- 全局 `window` 描述信息不存在 `get` 属性
- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR__`、`__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR_ALL__`
- 不可配置不可重写的属性
- 通过 `getTargetValue` 从沙箱 `window` 获取属性 [[查看](#gettargetvalue-从对象中获取属性)]

为什么降级后容器 `iframe` 的 `window` 从沙箱 `iframe` 中获取：

- 因为 `script` 是注入并运行在沙箱 `iframe` 中

#### `proxyDocument` 在哪调用

来自沙箱 `document` 打补丁有 2 处，见：`patchDocumentEffect` [[查看](#patchdocumenteffect修正沙箱-document-的-effect)]

- 遍历 `documentProxyProperties` 集合，劫持沙箱 `document` 属性，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L510)]
- 劫持沙箱 `body`、`head`，从 `proxyDocument` 里返回 `Dom` 元素，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L545)]

在 `patchDocumentEffect` 打补丁时如何指向 `proxyDocument`：

- 遍历 `documentProxyProperties` 匹配 `documet` 的属性集合
- 每一项通过 `Object.defineProperty` 劫持 `iframeWindow.Document.prototype` 上对应的属性
- 将其 `get` 操作指向 `proxyDocument` 中对应的属性

在 `proxyDocument` 收到请求后怎么处理：

- 按照 `get` 的属性返回相应对象，参考：代理空对象作为 `proxyDocument` [[查看](#2-代理空对象作为-proxydocument)]

关于 `documentProxyProperties` 集合：

- 集合中涵盖了 `document` 需要劫持的属性，包括 `createElement`、`createTextNode` 等需要劫持过程中特殊处理的属性
- 在 `Proxy` 的 `get` 中会先匹配处理特殊指定的属性，将其结果返回
- 然后再遍历 `documentProxyProperties` 批量定义的属性进行处理，避免因冲突覆盖已处理的代理属性

> 对于降级的 `proxyDocument` 则通过 `modifyLocalProperties` 排除已定义的特殊属性，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/proxy.ts#L335)]

#### `proxyLocation` 在哪里调用

| 调用场景                                                                        | 模式   | 用途                                       |
| ------------------------------------------------------------------------------- | ------ | ------------------------------------------ |
| `getCurUrl` 必要参数                                                            | 通用   | 获取应用的 `url` 传递给 `loader` 插件      |
| `patchElementEffect` 给应用元素打补丁 [[查看](#patchelementeffect为元素打补丁)] | 通用   | 让元素 `baseURI` 通过 `proxyLocation` 获取 |
| `proxyDocument`                                                                 | 通用   | 代理中属性 `documentURI`、`URL` 的指向     |
| `proxyWindow`                                                                   | 非降级 | 代理中属性 `location` 的指向               |
| `insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)]         | 非降级 | 包裹注入沙箱的 `script` 作为 `location`    |

> 其中 `getCurUrl` 和 `patchElementEffect` 中的 `baseURI` 的操作方式一模一样，见：重复提取样式的 `bug` [[查看](#2-重复提取样式的-bug)]

#### `proxyLocation` 的问题

问题 1：在 `wujie` 子应用中谨慎使用 `location`

- 如果只是获取值那么一切正常，如果是要跳转、更新 `location` 建议通过 `history` 来执行
- 否则可能会因为 `location.replace` 或者更新 `location.href` 造成意外的结果

问题 2：在降级模式下的 `location` 和非降级模式下不一致

降级模式下子应用和基座的 `location` 也不是同一个对象，对比如下：

| 分类        | 非降级模式             | `degrade` 子应用      | `degrade` 基座  |
| ----------- | ---------------------- | --------------------- | --------------- |
| `location`  | `proxyLocation`        | 沙箱 `iframeLocation` | `proxyLocation` |
| `url` 获取  | 子应用入口链接         | `host` 和基座同域     | 子应用入口链接  |
| `host`      | 子应用                 | 基座同域              | 子应用          |
| `reload`    | 屏蔽                   | 不屏蔽                | 屏蔽            |
| `href` 更新 | 创建 `iframe` 代替容器 | 在沙箱 `iframe` 跳转  | 目前用不到      |
| `replace`   | 替换绝对路径和基座同域 | 不做任何处理          | 目前用不到      |

> 原因参考：`proxyLocation` 在哪里调用 [[查看](#proxylocation-在哪里调用)]

要怎么修复：

- 我的想法是在 `proxyWindow` 劫持 `location` 指向 `proxyLocation`
- 但是降级后的 `iframe` 容器使用的是沙箱 `window`，而不是 `proxyWindow`
- 这样就需要从 `patchWindowEffect` 着手打补丁了 [[查看](#patchwindoweffect修正-iframewindow-的-effect)]

怎么打补丁：

- 通过 `Object.getOwnPropertyNames` 遍历沙箱 `window` 拿到属性 `location`
- 从 `iframeWindow.__WUJIE` 中获取 `degrade`
- 如果存在降级，通过 `Object.defineProperty` 劫持并指向 `proxyLocation`

复现问题：

- 在基座中找到：`/src/pages/VuePage.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/VuePage.tsx)]
- 在组建中添加 `degrade` 属性，运行切换到 `vue` 应用，点击 `about` 切换到页面
- 这个时候看到拿到的 `url` 是 `http://localhost:3000/about`
- 单独打开子应用拿到的 `url` 是 `http://localhost:8080/about`
- 去掉 `degrade` 拿到的 `url` 是 `http://localhost:8080/about`

#### 📝 代理中的辅助方法

#### `locationHrefSet`：拦截子应用 `location.href`

目录：`proxy.ts` - `locationHrefSet` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/proxy.ts#L19)]

参数：

- `iframe`：沙箱 `iframe`
- `value`：拦截 `location.href` 更新的链接，无论相对链接还是绝对链接，也可以是第三方链接
- `appHostPath`：子应用 `origin`

目的：

- 创建 `iframe` 加载拦截的链接，挂载到指定节点，用来代替当前渲染容器

**操作流程**

从实例中提取以下对象：

- 渲染容器：`shadowRoot`、`document`，根据 `degrade` 决定要替换的容器
- `id`，用处 1：降级时从 `Dom` 中找到 `iframe` 容器，用处 2：更新链接，从 `search` 找到当前应用
- `degradeAttrs`：来自启动配置，用于劫持容器能够适配页面
- `url`：通常情况下是 `location.href` 更新的链接，但是相对路径需要转换一下

转换相对路径：

- 通过 `anchorElementGenerator` 将链接转换成 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- 提取 `appHostPath` 子应用 `origin` + 提供链接的 `pathname` + `search` + `hash` 作为 `url`

执行替换有 3 步：

- 标记 `hrefFlag` 以便点击后退时还原渲染容器
- 替换渲染容器为新建的 `iframe`
- `pushUrlToWindow` 推送指定 `url` 到主应用路由 [[查看](#pushurltowindow推送-url-到基座路由)]

若是 `degrade` 主动降级，替换 `iframe` 容器：

- 通过 `rawDocumentQuerySelector` （原生方法），拿到沙箱 `body`
- 通过 `renderElementToContainer` 将渲染容器中的 `html` 元素添加到沙箱 `body` 中 [[查看](#renderelementtocontainer将节点元素挂载到容器)]
- 通过 `renderIframeReplaceApp` 创建新的 `iframe` 替换渲染容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]

非主动降级 `degrade` 则替换 `shadowRoot`：

- 通过 `renderIframeReplaceApp` 创建新的 `iframe` 替换渲染容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]

**存在的 `bug`**

以上描述仅在正常情况，不巧 `locationHrefSet` 也有 `bug`：

- 因为降级模式下不使用 `proxyLocation` [[查看](#proxylocation-的问题)]
- 因此也不会拦截 `location.href` 的更新，导致在 `iframe` 容器中并不会因此创建劫持容器

复现和修复：

- 和 `proxyLocation` 解决方法一致，见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

#### `pushUrlToWindow`：推送 `url` 到基座路由

目录：`sync.ts` - `pushUrlToWindow` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L98)]

参数：

- `id`：应用名
- `url`：跳转的链接，来自 `locationHrefSet` [[查看](#locationhrefset拦截子应用-locationhref)]

调用场景：

- 只有 `locationHrefSet` 拦截子应用 `location.href`
- 也说明监听 `popstate` 时检测前进的页面，只能来自 `pushUrlToWindow` 推送的更新 [[查看](#processappforhrefjump-监听前进和后端)]

流程：

- 通过 `anchorElementGenerator` 拿到 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- 通过 `getAnchorElementQueryMap` 拿到 `search` 的键值对 [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]
- 根据当前应用名 `id` 将值更新为 `encode` 的 `url`
- 将更新后的键值对还原成字符更新 `url.searh`
- 通过 `window.history.pushState` 更新记录，以便浏览器回退还原容器

### 辅助方法 - 提取应用资源

围绕提取应用资源归纳相关的方法

#### `importHTML` 加载资源

加载应用资源、提取资源的方法

目录：`entry.ts` - `importHTML` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L200)]

用于加载和处理资源内容，相当于：

- `qiankun` 的 `importEntry` [[查看](https://github.com/cgfeel/micro-qiankun-substrate?tab=readme-ov-file#212-prefetch-%E6%89%A7%E8%A1%8C%E9%A2%84%E5%8A%A0%E8%BD%BD)]
- `micro-app` 的 `HTMLLoader` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#12-htmlloader-%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90)]

> 除了 `qiankun` 使用的是 `import-html-entry` [[查看](https://github.com/kuitos/import-html-entry)]，其他都是单独开发的

参数为包含 3 个属性的 `params` 对象：

- `url`：资源连接
- `html`：静态资源，存在则优先使用
- `opts`：包含加载和处理 `HTML` 的相关配置

`opts` 包含 4 个可选属性：

- `fetch`：自定义的 `fetch`，没有提供则使用全局 `window` 提供的 `fetch`
- `plugins`：应插件，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#plugins)]
- `loadError`：应用加载资源失败后触发，`startApp` 时配置
- `fiber`：空闲加载，默认为 `true`

最终返回 `Promise<htmlParseResult>`，其中 `htmlParseResult` 包含：

- `template`：处理后的资源内容
- `assetPublicPath`：资源路径，见：`defaultGetPublicPath` [[查看](#defaultgetpublicpath获取资源链接的-path)]
- `getExternalScripts`：加载应用中静态 `script` 的包装方法 [[查看](#getexternalscripts加载-script-资源)]
- `getExternalStyleSheets`：加载应用中静态样式的包装方法 [[查看](#getexternalstylesheets加载样式资源)]

> 返回的 `Promise` 会根据 `plugins` 是否不存在 `htmlLoader` 来缓存结果，见：资源缓存集合 [[查看](#2-资源缓存集合)]

调用场景有 3 处：

- `preloadApp` 预加载
- `startApp` 初次加载沙箱实例
- `alive` 模式应用预加载后 `startApp` 会再次提取资源

`alive` 模式预加载后重复执行的原因：

- 提取 `getExternalScripts` 交给 `start` 启动应用前获取 `script` 集合 [[查看](#-start-启动应用)]
- 预加载时已通过 `processCssLoader` 加载样式替换 `template` [[查看](#processcssloader处理-css-loader)]
- 替换后的资源通过 `active` 保存在实例 `template` 中，但 `script` 需要重新提取 [[查看](#-active-激活应用)]
- 重新提取资源会尽可能从缓存中获取 [[查看](#2-资源缓存集合)]

**1. 提取必要的配置：**

- 从 `opts` 提取：`fetch`、`fiber`、`plugins`、`loadError`，见上述总结
- `htmlLoader`：作为替换资源入口 `template` 的方法
- 通过 `getEffectLoaders` 提取 `plugins`
- 声明一个资源路径计算函数 `getPublicPath`，见：`defaultGetPublicPath` [[查看](#defaultgetpublicpath获取资源链接的-path)]

`htmlLoader` 声明规则：

- 提供 `plugin` 但不提供 `htmlLoader`，通过 `compose` 直接返回传入的资源 [[查看](#compose-用柯里化的方式拍平一组函数)]
- 通过 `plugin` 提供 `htmlLoader`，通过 `compose` 依次使用自定义的 `htmlLoader` 替换资源 [[查看](#compose-用柯里化的方式拍平一组函数)]
- 不提供 `plugins` 使用 `defaultGetTemplate` 直接返回传入的资源

`getEffectLoaders` 提取的 `plugins` 包含：

- `jsExcludes`：外联 `script` 排除列表，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-excludes)]
- `cssExcludes`：外联样式排除列表，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-excludes)]
- `jsIgnores`：外联 `script` 忽略列表，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-ignores)]
- `cssIgnores`：外联样式忽略列表，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-ignores)]

> `getEffectLoaders` 提取的资源通过 `reduce` 最终拷贝返回一个新的 `Array<string | RegExp>` 对象

通过 `ignore` 匹配的列表资源，将使用外联的方式加载资源，这样有效解决跨域问题：

- `jsIgnores` 见：`getExternalScripts` [[查看](#getexternalscripts加载-script-资源)]
- `cssIgnores` 见：`getExternalStyleSheets` [[查看](#getexternalstylesheets加载样式资源)]

> 对于子应用中静态资源标记 `ignore` 的策略是用注释替换，将不会作为应用中的资源加载

**2. 获取资源：**

通过 `getHtmlParseResult` 获取资源，接受 3 个参数：

- `url`：资源远程链接
- `html`：现有的资源
- `htmlLoader`：从声明的配置透传过来，见上述总结

提供 `html` 时优先使用，否则通过 `fetch` 获取资源链接

> `getHtmlParseResult` 相当于 `micro-app` 中的 `extractSourceDom` [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#13-extractsourcedom-%E6%88%90%E5%8A%9F%E5%8A%A0%E8%BD%BD%E8%B5%84%E6%BA%90%E5%9B%9E%E8%B0%83)]

**3. 处理返回资源：**

- 应用入口链接通过 `getPublicPath` 获取资源路径链接，见：`defaultGetPublicPath` [[查看](#defaultgetpublicpath获取资源链接的-path)]
- 使用 `processTpl` 将资源中的样式和 `script` 提取出来，并用注释替换 [[查看](#processtpl-提取资源)]
- 返回 `Promise<htmlParseResult>` 见上述总结

`qiankun` 和 `micro-app` 通过 `__webpack_public_path__` 配置资源路径：

- `qiankun`：通过 `window.__INJECTED_PUBLIC_PATH_BY_QIANKUN__` 获取，见：示例 [[查看](https://github.com/cgfeel/micro-qiankun-app-cra/blob/main/src/public-path.ts)]
- `micro-app`：通过 `window.__MICRO_APP_PUBLIC_PATH__` 获取，见：示例 [[查看](https://github.com/cgfeel/micro-app-react-project/blob/main/src/public-path.ts)]

> 相对来说 `wujie` 对子硬用的倾入是最少的

**4. 包装获取样式和 `script` 的方法：**

在返回的对象中包含了 2 个包装方法：

- `getExternalScripts`：提取应用中静态 `script` [[查看](#getexternalscripts加载-script-资源)]
- `getExternalStyleSheets`：提取应用中静态样式 [[查看](#getexternalstylesheets加载样式资源)]

> 提取的资源、样式、`script` 来自 `processTpl` [[查看](#processtpl-提取资源)]

提取资源传递的参数：

- 提取的资源集合：如 `script` 集合或样式集合
- `fetch`：透传自 `opts` 中的参数
- `loadError`：外联资源加载失败通知方法，来自配置的可选参数
- `fiber`：是否空闲加载，仅限 `script` 加载

提供的资源筛选规则：

- 通过插件排除的外联资源将直接被过滤，如：`jsExcludes`、`cssExcludes`
- 通过插件忽略的外联资源将添加 `ignore` 属性，如：`jsIgnores`、`cssIgnores`

> 关于 `ignore` 筛选规则：`script` [[查看](#getexternalscripts加载-script-资源)]，样式 [[查看](#getexternalstylesheets加载样式资源)]

**5. 从缓存中提取资源**

重建模式下，每次切换应用就是一次实例初始化，会重复调用 `importHTML` 提取资源，此时会尽量通过缓存获取资源，见：资源缓存集合 [[查看](#2-资源缓存集合)]

- `embedHTMLCache`：应用入口资源缓存，仅限没有提供 `htmlLoader`
- `styleCache`：缓存所有外联样式，包括静态提取和动态加载
- `scriptCache`：缓存所有外联 `script`，包括静态提取和动态加载

> `alive` 和 `umd` 模式再次切换应用时，不会重复调用 `importHTML`

`alive` 模预加载后启动也会重复调用 `importHTML`：

- `preloadApp`：预加载执行 1 次，会提前加载资源 [[查看](#preloadapp-预加载流程)]
- `startApp`：启动应用执行 1 次，会使用预加载已缓存的资源 [[查看](#startapp-启动流程)]

`umd` 模式预加载后启动也会重复调用 `importHTML`：

- 因为 `umd` 首次加载方法 `__WUJIE_MOUNT` 还没有挂载到沙箱 `window`

重复加载资源可以缓存，但存在重复处理资源的问题，如：`processTpl` [[查看](#processtpl-提取资源)]

- 除了重建模式可以通过预加载配置 `exec` 预执行解决这个问题 [[查看](#5-通过-exec-预执行)]

**6. 从 `fetch` 看兼容性**

- `fetch` 是不兼容 `IE` 的，在文档描述通过 `degrade` 实现容器和 `proxy` 兼容，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#degrade)]
- 为了解决请求兼容的问题，可以自行配置 `fetch` 通过 `ajax` 请求资源，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#fetch)]

> 有 2 个场景需要手动配置 `fetch`：① 兼容 `IE`，② 统一 `authentication`

#### `processTpl` 提取资源

目录：`template.ts` - `processTpl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/template.ts#L143)]

用于从加载内容中提取出 `scripts` 和 `styles`，相当于：

- `micro-app` 中的 `flatChildren`，见：`micro-app` 源码分析，注 ⑭ [[查看](https://github.com/cgfeel/micro-app-substrate)]

接受 3 个参数：

- `tpl`：字符类型，要提取的源内容
- `baseURI`：来自 `importHTML` 中的资源路径 `assetPublicPath` [[查看](#importhtml-加载资源)]
- `postProcessTemplate`：可选参数，用于返回前更新提取的资源，目前没有用到，可忽略

返回一个 `TemplateResult` 对象包含 4 个属性，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/template.ts#L64)]

- `template`：替换样式和 `script` 为注释后的资源
- `scripts`：提取的 `script` 集合，类型和 `getExternalScripts` 返回对象一致 [[查看](#getexternalscripts加载-script-资源)]
- `styles`：提取的样式集合，类型和 `getExternalStyleSheets` 返回对象一致 [[查看](#getexternalstylesheets加载样式资源)]
- `entry`：入口 `script`，不存在则是 `null`，目前没有用到，可忽略

函数内部作了 2 件事：

- 声明对象用于收集提取的资源，分别是：`scripts`、`styles`、`entry`、`moduleSupport`
- 替换 `tpl`，按照 `replace` 分组替换资源绑定在 `template`

**1.替换备注：**

全部替换为空字符

**2.提取或替换 `link` 标签：**

有 2 个情况会将 `link` 标签替换为备注：

1. `ref="stylesheet"` 引入的外联样式
2. 除了字体以外，所有 `preload|prefetch|modulepreload` 模式下外联资源

> 以上情况都不符合，会原封不动将数据返回，对于 `link` 标签不做替换，例如：`favicon`

引入的样式，替换备注有 2 种方式：

- `genIgnoreAssetReplaceSymbol`：带有 `ignore` 属性的外联样式
- `genLinkReplaceSymbol`：替换非 `ignore` 的外联引入样式

> 带有 `ignore` 属性的外联样式替换备注后将彻底废弃不再还原

预加载和空闲加载的资源替换备注的方式：

- `genLinkReplaceSymbol`：第 2 个参数为 `true`，替换备注后将彻底废弃不再还原
- 因为提取的样式，之后会通过 `getExternalStyleSheets` 发起预加载 [[查看](#getexternalstylesheets加载样式资源)]

通过 `rel` 区分引入的资源类型

- `stylesheet`：引入的外联样式
- `preload`：预加载资源
- `modulepreload` 用于预加载 `esModule`，不匹配 `link`
- `prefetch`：空闲加载资源

> 浏览器通常不加载不存在 `rel` 属性的 `link` 元素，关于这个特性用 `codepen` 做了演示 [[查看](https://codepen.io/levi0001/pen/rNEJxZr)]

收集样式只有 1 种情况：

- 非 `ignore` 的外联引入样式：记录 `src` 在 `styles` 集合中

> 通过 `processCssLoader` 仅还原收集在 `styles` 集合的样式 [[查看](#processcssloader处理-css-loader)]

外联样式收集的 `src` 校正：

- 绝对路径不变，相对路径通过 `getEntirePath` 基于入口资源路径 `baseURI` 转为绝对路径

> 补充说明：`processTpl` 提取的外联样式，全部是应用中的静态样式，动态样式需要通过 `patchRenderEffect` 重写方法拦截写入 [[查看](#patchrendereffect-为容器打补丁)]

**3.提取或替换 `style` 内联样式：**

所有内联样式都会被注释替换，替换注释有 2 种：

- `genIgnoreAssetReplaceSymbol`：带有 `ignore` 属性的内联样式，注释中的 `url` 为 `style file`
- `getInlineStyleReplaceSymbol`：非 `ignore` 的内联样式，备注中按照集合中的索引替换成备注

收集样式只有 1 种情况：

- 非 `ignore` 的内联样式：记录代码为 `content` 在 `styles` 集合中

**4.提取或替换 `script`：**

先声明以下对象：

- `scriptIgnore`：提取带有 `ignore` 属性的 `script`
- `isModuleScript`：判断是否是 `esModule`
- `isCrossOriginScript`：提取跨域行为 `crossorigin` 的 `script`
- `crossOriginType`：跨域类型，只提取 `anonymous` 不发送凭据，`use-credentials` 发送凭据，否则为空字符
- `moduleScriptIgnore`：被忽略的 `esModule`
- `matchedScriptTypeMatch`：提取带有 `type` 属性的 `script`，不存在为 `null`
- `matchedScriptType`：`script` 的 `type` 值，不存在为 `undefined`

`esModule` 有 2 种情况会被忽略：

- 览器支持 `esModule`：但 `script` 带有属性 `nomodule`
- 或浏览器不支持 `esModule`：但 `isModuleScript` 为 `true`，当前 `script` 是 `esModule`

外联 `script` 还需要声明 3 个对象：

- `matchedScriptEntry`：匹配带有 `entry` 的 `script`
- `matchedScriptSrcMatch`：匹配带有 `src` 的 `script`
- `matchedScriptSrc`：提取外联 `script` 的 `src` 值

> `matchedScriptSrcMatch` 值应该放入外部声明，目前重复执行了匹配

所有外联 `script` 是不包含 `type="text/ng-template"` 的：

- `ng-template` 也是内联 `script`，只是允许包含 `src` 属性的 `template`，见：`issue` [[查看](https://github.com/angular/angular.js/issues/2820#issuecomment-18806961)]

内联 `script` 还需要声明 2 个对象：

- `code`：内联 `script` 的代码内容
- `isPureCommentBlock`：`script` 每一行为空，或者是以 `//` 开头的单例注释

不处理 `script` 的情况有 3 种：

- `isValidJavaScriptType` 检测不符合要求：说明不是可执行的 `script`，直接返回不处理
- 存在多入口 `script`：`entry` 和 `matchedScriptEntry` 同时存在，抛出 `Error`
- `src` 属性值为空：直接返回不处理（难道不是注释掉更合理吗？）

`entry` 入口资源按照 `matchedScriptEntry` 决定设置为外联 `script` 的 `src`：

- 但 `entry` 作为导出对象的属性，目前没有被调用

用注释替换 `script` 有 4 种：

| 注释                           | 匹配条件                   | 注释方式                                                                  |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------- |
| `genIgnoreAssetReplaceSymbol`  | `scriptIgnore`             | 优先提供 `src`，否则用 `js file`                                          |
| `genModuleScriptReplaceSymbol` | `moduleScriptIgnore`       | 优先提供 `src`，否则用 `js file`，除此之外提供第 2 个参数 `moduleSupport` |
| `genScriptReplaceSymbol`       | 有 `src` 值的外联 `script` | `src` 属性值，以及异步或延迟属性，不存在为空字符                          |
| `inlineScriptReplaceSymbol`    | 内联 `script`              | 统一注释信息                                                              |

> 注释的函数见源码，匹配条件见上述声明对象

关于 `script` 的注释：

- 不同的注释只能作为源码参考，加载的 `script` 最终注入的是沙箱，而替换成注释的资源注入的是渲染容器

收集 `script` 情况有 2 种，外联 `script`、内联 `src`，都要求：

- 不能是 `scriptIgnore`：带有 `ignore` 属性
- 不能是 `moduleScriptIgnore`：被忽略的 `esModule`

> 除此之外内联 `script` 还要求：存在代码 `code` 且不能全部为空或行注释

外联 `script` 插入集合的对象：

```
{
    src: matchedScriptSrc,
    module: isModuleScript,
    crossorigin: !!isCrossOriginScript,
    crossoriginType: crossOriginType,
    attrs: parseTagAttributes(match),
}
```

> 赋值属性的对象见上述总结

外联样式收集的 `src` 校正：

- 绝对路径不变，相对路径通过 `getEntirePath` 基于入口资源路径 `baseURI` 转为绝对路径

`parseTagAttributes` 提取属性：

- `<script(.*)>` 标签中所有带有 `=` 的属性，将其作为键值对象返回
- 因此对于只有属性名的 `async` 和 `defer`，不会提取也不会恢复

造成的问题：

- `async`：不会有任何问题，作为异步代码注入沙箱，见：队列执行顺序 [[查看](#3-队列执行顺序)]
- `defer`：操作 `Dom` 不存在问题，因为在此之前资源已通过 `active` 注入 [[查看](#-active-激活应用)]
- `defer`：多个静态 `script` 相互依赖，会因为 `defer` 丢失，立即执行而找不到依赖

外联 `script` 中存在 `async` 或 `defer` 属性，会在上述插入集合的对象中添加 2 个属性：

```
{
    async: isAsyncScript,
    defer: isDeferScript,
}
```

提取的 `async` 和 `defer` 有什么用：

- `getExternalScripts` 判断加载方式 [[查看](#getexternalscripts加载-script-资源)]
- `start` 应用时是同步代码还是异步代码 [[查看](#1-收集队列)]

内联 `script` 插入集合的对象和外联 `script` 基本一样，不同在于：

- `src`：空字符
- `content`：代码 `code`
- 不存在属性 `async` 和 `defer`

> 类型为 `type="text/ng-template"` 也会作为内联 `script` 进行收集

#### `processCssLoader`：处理 `css-loader`

处理 `css-loader` 来自备注，实际上主要的目的是替换应用入口资源中对应的备注

目录：`entry.ts` - `processCssLoader` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L56)]

参数：

- `sandbox`：应用实例，用于获取 `cssLoader` [[查看](#通过配置替换资源)]
- `template`：已替换注释的应用入口资源，见：`processTpl` [[查看](#processtpl-提取资源)]
- `getExternalStyleSheets`：通过 `importHTML` 获取的包装方法，用于提取静态样式 [[查看](#getexternalstylesheets加载样式资源)]

触发场景有 3 个：

- `preloadApp`：预加载应用
- `startApp`：初次加载应用（不包含预加载后 `alive` 模式的应用）
- `startApp`：重建模式每次切换应用

> 预加载应用时会将应用的资源提取并替换样式后，保存到实例 `template` 中，`alive` 模式的应用启动时无需再次提取样式

**第一步：获取并更新样式集合**

- 通过 `getCurUrl` 获取应用的 `base url`，为 `proxyLocation` 的：`host` + `pathname`
- 通过 `compose` 获取 `cssLoader` [[查看](#compose-用柯里化的方式拍平一组函数)]
- 通过 `getExternalStyleSheets` 遍历样式集合，为每一个 `contentPromise` 添加一个微任务 [[查看](#getexternalstylesheets加载样式资源)]

微任务只做 1 件事：

- 用 `cssLoader` 替换已加载的样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]

**第二步：替换资源中的样式：**

- 通过 `getEmbedHTML` 将样式元素替换对应的注释 [[查看](#getembedhtml转换样式)]
- 更新的资源返回

`processCssLoader` 中应用实例的 `replace` 不可用：

- 因为执行时应用实例还没有绑定 `replace` 方法，见：通过配置替换资源 [[查看](#通过配置替换资源)]

#### `getEmbedHTML`：转换样式

目录：`entry.ts` - `getEmbedHTML` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L77)]

仅限应用中的静态样式替换：

- 在 `processTpl` 中提取资源中的样式，替换成特定的注释 [[查看](#processtpl-提取资源)]
- 之后通过 `getEmbedHTML` 将提取的样式加载后，替换对应的注释，修正回来

> 动态添加的样式通过 `rewriteAppendOrInsertChild` 拦截并注入容器，不存在需要替换的注释

参数：

- `template`：应用资源，源码是 `any` 实际是 `string`，因为 `processCssLoader` 传过来就是字符 [[查看](#processcssloader处理-css-loader)]
- `styleResultList`：通过 `importHTML` 提取的 `styles` 集合，见：`getExternalStyleSheets` [[查看](#getexternalstylesheets加载样式资源)]

返回：

- 用静态样式替换掉注释后的资源对象，类型为 `Promise<string>`

通过 `Promise.all` 批量处理 `style` 集合中每一项的 `contentPromise`：

| 资源类型               | 替换的注释                    | 处理方式                     |
| ---------------------- | ----------------------------- | ---------------------------- |
| 外联样式 - `ignore`    | `genLinkReplaceSymbol`        | 用 `link` 元素加载样式并替换 |
| 外联样式 - 非 `ignore` | `genLinkReplaceSymbol`        | 用内联样式替换               |
| 内联样式               | `getInlineStyleReplaceSymbol` | 用内联样式替换               |

- `ignore` 来自 `cssIgnores` 手动配置，见：`getExternalStyleSheets` [[查看](#getexternalstylesheets加载样式资源)]
- 注释元素分类，见：`processTpl` 提取资源 [[查看](#processtpl-提取资源)]

> 在应用资源中，带有 `ignore` 属性的静态样式将被彻底注释，不做任何操作

#### `fetchAssets`：加载资源，缓存后返回 `Promise`

目录：`entry.ts` - `fetchAssets` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L103)]

参数：

- `src`：资源链接，用于 `fetch` 请求用
- `cache`：缓存集合，包含：`scriptCache`、`styleCache` [[查看](#2-资源缓存集合)]
- `fetch`：配置提供的加载的方法，没有提供采用全局 `window` 默认提供的 `fetch`
- `cssFlag`：加载的资源是否是样式，否则就作为 `script`
- `loadError`：配置时提供，可选参数，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#loaderror)]

返回：

- 通过 `fetch` 返回的 `Promise<string>`

调用场景：

- `getExternalScripts`：加载 `script` 资源 [[查看](#getexternalscripts加载-script-资源)]
- `getExternalStyleSheets`：加载样式资源 [[查看](#getexternalstylesheets加载样式资源)]

只做 2 件事：

- 从 `cache` 缓存集合中获取加载资源
- 缓存集合不存在资源，通过 `fetch` 加载后缓存到 `cache` 然后返回

缓存机制：

- 通过 `fetch` 获取资源后，将 `Promise` 保存到 `cache` 中，键值为 `url`
- 这样使用 `url` 再次请求时，将优先通过缓存处理

> 使用 `codepen` 按照 `fetchAssets` 做的演示 [[查看](https://codepen.io/levi0001/pen/qBzPwZe)]

捕获失败：

- 两种情况，通过 `catch` 捕获请求失败，通过 `status` 判断服务器反馈状态异常

> 默认情况下 `fetch` 不会把服务器反馈的异常状态认为是错误

失败怎么做：

- 根据 `cssFlag` 资源类型打印错误，并通过 `loadError` 发起通知
- 更新缓存中的键名 `url` 值为 `null`，以便下次加载时能够重新加载

> 每次返回请求前都会先将 `Promise` 保存到 `cache`，失败后需要更新为 `null`

更新缓存会影响返回的 `Promise` 吗？

- 不会，从这点说明 `return` 赋值返回的对象一定是等号右边的对象

```
// 这里返回的一定是等号右边的 `Promise`，而不是 `cache`
return (cache[key] = Promise.resolve());
```

#### `getExternalScripts`：加载 `script` 资源

有 2 个同名的方法，为了做区分这里称呼为：加载方法和 `importHTML` 中的包装方法

**1. 加载方法 `getExternalScripts`**

应用中所有 `script` 加载、缓存的方法，包括 `importHTML` 中静态 `script` 提取，也是包装 `getExternalScripts` 作为属性返回

目录：`entry.ts` - `getExternalScripts` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L167)]

参数：

- `scripts`：提取的 `script` 集合，包含的 `script` 可以是外联也可以是内联
- `fetch`：透传给 `fetchAssets` 的请求方法 [[查看](#fetchassets加载资源缓存后返回-promise)]
- `loadError`：资源加载失败通知，并非必选参数，同样透传给 `fetchAssets`
- `fiber`：是否空闲时间加载资源，默认是 `true`

返回：

- 提取 `script` 结果的集合 `ScriptResultList[]`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L19)]

主要做的 1 件事：

- 遍历 `script` 集合，为每一项增加一个 `Promise` 类型的属性 `contentPromise`

`contentPromise` 内联 `script` 加载情况：

- 全部在 `Promise` 中返回代码字符，包括存在 `module` 等其他属性
- 内联 `script` 虽然判断了 `ignore`，但是不存在这种情况，见下方 `ignore` 说明

`contentPromise` 外联 `script` 加载情况：

- `module`：在 `Promise` 中以空字符返回
- `ignore`：限 `async` 或 `defer` 非 `module` 将通过 `fetchAssets` 加载资源，否则在 `Promise` 中返回空字符
- 其他情况都会通过 `fetchAssets` 加载资源 [[查看](#fetchassets加载资源缓存后返回-promise)]

`Promise` 返回空字符的情况，之后会通过 `insertScriptToIframe` 作为外联 `script` 加载 [[查看](#insertscripttoiframe为沙箱插入-script)]：

- 因为 `contentPromise` 只能决定 `script` 中的 `content`
- `content` 不存在的话，会通过 `src` 去加载 `script`，这样通过浏览器机制有效避开跨域问题
- 其中包含了：所有外联的 `module`，非 `async` 和 `defer` 的 `ignore`

`ignore` 通 `fetchAssets` 加载 `async` 或 `defer`，仅限提取静态 `script`：

- 动态添加外联 `script` 忽略了此属性
- 手动添加带有 `src` 的 `js-loader`，不会加载而是作为外联 `script` 注入沙箱

需要强调的是能够被提取的静态 `script`，一定是通过手动标记的 `ignore`：

- 因为包含 `ignore` 属性的静态 `script` 将被注释替换不再恢复

> 这可能是开发人员的遗漏，因为文档中描述 `ignore` 的设计就是为了解决跨域请求资源的问题，而避开使用 `fetchAssets` 加载资源，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-ignores)]

通过 `fetchAssets` 不同的加载方式：

- `async` 或 `defer` 下使用 `fiber` 决定是否通过宏任务 `requestIdleCallback` 空闲加载
- 其他全部直接加载

加载外联 `script` 时传递给 `fetchAssets` 的参数：

- `src`：资源链接
- `scriptCache`：用于缓存 `script` 加载的资源，见：资源缓存集合 [[查看](#2-资源缓存集合)]
- `fetch`：透传自身参数 `fetch`
- `cssFlag`：不是样式资源，全部设为 `false`
- `loadError`：透传自身参数 `loadError`

除此之外做了什么：

- `module` 非 `async` 的 `script`，需要标记 `defer` 为 `true`
- 在 `start` 启动应用时，会将其作为同步代码 [[查看](#1-收集队列)]

调用场景：

- `importHTML`：包装后作为返回对象的属性，用于加载应用中静态 `script`，下面会详细说明
- `rewriteAppendOrInsertChild`：处理应用中动态加载的 `script`

> `SPA` 类型的应用，如 `React` 通常会静态加载入口文件，然后动态注入 `script`

手动配置的 `js-loader` 不会通过 `getExternalScripts` 加载资源：

- 包含 `jsBeforeLoaders`、`jsAfterLoaders`

根据以上总结，以下情况将通过 `src` 在沙箱中加载 `script`：

- 类型为 `module` 的外联 `script`，无论是静态提取还是动态添加
- 手动配置 `ignore` 非 `async` 或 `defer` 的外联 `script`
- 手动配置 `js-loader` 的外联 `script`

关于 `ignore` 的补充：

- 应用中提取的静态 `script` 存在 `ignore` 属性将被注释，资源不会被收集，无论内联还是外联
- 应用中动态添加的 `script`，不收集元素 `ignore` 属性，除了 `jsIgnores` 都能顺利加载
- 通过 `jsIgnores` 手动忽略外联 `script`，但不忽略 `async` 或 `defer` 非 `module` 的外联 `script`
- `ignore` 的 `script` 将在 `Promise` 返回空字符，需要通过 `src` 加载 `script`

由此得出在 `getExternalScripts` 中加载的 `script`：

- 内联 `script` 不存在 `ignore`，因为加载前被筛选出去，或无法匹配 `jsIgnores`
- 外联 `script` 通过 `jsIgnores` 添加的 `ignore`

通过 `src` 加载 `script` 需要注意：

- 外联 `script` 没有包裹 `proxyLocation`，调用 `location` 是建立在基座 `url` 上
- 需要通过 `window.$wujie.location` 来代替 `location`

**2. `importHTML` 中的包装方法**

只能用于应用中的静态 `script` 加载，例如入口文件

目录：`entry.ts` - `importHTML` - `getExternalScripts` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L239)]

调用方法不需要提供参数，但内部会将以下参数传递给加载方法 `getExternalScripts`：

- `scripts`：筛选后的静态 `script` 集合
- `fetch`：自定义方法，没有提供则使用浏览器自带的方法
- `loadError`：加载失败通知方法，配置时提供，可选参数
- `fiber`：透传 `importHTML` 的参数，配置时提供，默认 `true` [[查看](#importhtml-加载资源)]

`scripts` 筛选规则：

- 内联的静态 `script` 都允许
- 外联的 `script` 不在 `jsExcludes` 配置列表中，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-excludes)]
- 所有符合要求且匹配 `jsIgnores` 的外联 `script`，需要标记 `ignore` 为 `true`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-ignores)]

`scripts` 从哪里来：

- 由 `processTpl` 从提取的入口资源筛选出静态 `script` [[查看](#processtpl-提取资源)]

调用场景：

- `preloadApp`：预加载没有预执行时调用 [[查看](#preloadapp-预加载流程)]
- `start`：启动应用，包括 `preloadApp` 预执行、以及 `startApp` 启动应用 [[查看](#-start-启动应用)]

发挥的作用：

- 在 `importHTML` 包裹 `getExternalScripts` 方法确保不会立即执行 [[查看](#importhtml-加载资源)]
- 而在调用场景中通过 `await` 可以确保执行前优先发起任务

发起的任务由 `scripts` 集合中的 `contentPromise` 决定：

- 类型为 `Promise` 的微任务，将确保资源 `resolve`
- 类型为 `fetchAssets` 返回的微任务，将确保发起请求

> 为了很好的理解区别，用 `codepen` 做了一个演示 [[查看](https://codepen.io/levi0001/pen/qBzPwZe?editors=1111)]

那注入 `script` 到沙箱时，`fetchAssets` 还没有加载完怎么办？

- 在 `start` 时应用中的资源将被分配到同步和异步代码中执行 [[查看](#1-收集队列)]
- 无论是同步代码还是异步代码，都是 `Promise` 队列，必须等待上条执行完毕后才能发起新的微任务

#### `getExternalStyleSheets`：加载样式资源

有 2 个同名的方法，为了做区分这里称呼为：加载方法和 `importHTML` 中的包装方法

**1. 加载方法 `getExternalStyleSheets`**

应用中所有样式加载、缓存的方法，包括 `importHTML` 中静态样式提取，也是包装 `getExternalStyleSheets` 作为属性返回

目录：`entry.ts` - `getExternalStyleSheets` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L143)]

参数：

- `styles`：提取的样式集合，包含的样式可以是外联也可以是内联
- `fetch`：透传给 `fetchAssets` 的请求方法 [[查看](#fetchassets加载资源缓存后返回-promise)]
- `loadError`：资源加载失败通知，并非必选参数，同样透传给 `fetchAssets`

返回：

- 提取样式结果的集合 `StyleResultList[]`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L20)]

主要做的 1 件事：

- 遍历样式集合，为每一项增加一个 `Promise` 类型的属性 `contentPromise`

`contentPromise` 加载情况有 4 种：

| 分类                 | 条件     | 处理方式                                                                     |
| -------------------- | -------- | ---------------------------------------------------------------------------- |
| `content` 内联样式   | 无       | 在 `Promise` 中以内联代码返回                                                |
| `src` 元素 `outHTML` | 无       | 提取元素中的样式，在 `Promise` 中以内联代码返回                              |
| `src` 外联样式       | `ignore` | 在 `Promise` 中以空字符返回                                                  |
| `src` 外联样式       | 无       | 通过 `fetchAssets` 加载资源 [[查看](#fetchassets加载资源缓存后返回-promise)] |

> `src` 作为元素 `outHTML`，虽然看上去不合理，但这是用于和内联样式区分的唯一办法，目前没有用到

加载外联样式时传递给 `fetchAssets` 的参数：

- `src`：资源链接
- `styleCache`：用于缓存样式加载的资源，见：资源缓存集合 [[查看](#2-资源缓存集合)]
- `fetch`：透传自身参数 `fetch`
- `cssFlag`：样式资源设为 `true`
- `loadError`：透传自身参数 `loadError`

除此之外做了什么：

- 内联样式会将 `src` 更新为空字符，因为存在 `src` 为元素 `outHTML` 的情况

调用场景：

- `importHTML`：包装后作为返回对象的属性，用于加载应用中静态样式，下面会详细说明
- `rewriteAppendOrInsertChild`：处理应用中动态加载的外联样式
- `processCssLoaderForTemplate`：通过配置手动注入样式到应用头部和尾部 [[查看](#processcssloaderfortemplate手动添加样式)]

> 应用中动态加载的内联样式不需要调用 `getExternalStyleSheets`；作为 `SPA` 类型的应用，如 `React` 通常会通过入口文件动态加载样式，以内联的方式将代码注入样式，加载流程单独总结了，见：`patchCssRules` 存在重复加载的 `Bug` [[查看](https://github.com/cgfeel/zf-micro-app/blob/main/doc/wujie-umd-patch_css_rules.md)]

关于 `ignore` 的补充：

- 应用中提取的静态样式存在 `ignore` 属性将被注释，资源不会被收集，无论内联还是外联
- 应用中动态添加的样式，不收集元素 `ignore` 属性，除了 `cssIgnores` 都能顺利加载
- 通过 `cssIgnores` 将手动忽略外联样式
- 手动忽略 `ignore` 的外联样式将在 `Promise` 返回空字符，通过 `link` 加载样式

由此得出在 `getExternalStyleSheets` 中加载的样式：

- 内联样式不存在 `ignore`，因为加载前被筛选出去，或无法匹配 `cssIgnores`
- 外联样式通过 `cssIgnores` 添加的 `ignore`

`ignore` 在不同场景下的表现：

- `processTpl`：提取静态样式，用注释替换掉样式 [[查看](#processtpl-提取资源)]
- `cssIgnores`：手动忽略样式，采用 `link` 加载样式，见：`getEmbedHTML` [[查看](#getembedhtml转换样式)]
- `processCssLoaderForTemplate`：手动配置样式，直接跳出不做任何操作 [[查看](#processcssloaderfortemplate手动添加样式)]

**2. `importHTML` 中的包装方法**

只能用于应用中的静态样式加载，例如手动为入口 `template` 添加了静态样式

目录：`entry.ts` - `importHTML` - `getExternalStyleSheets` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L248)]

调用方法不需要提供参数，但内部会将以下参数传递给加载方法 `getExternalStyleSheets`：

- `styles`：筛选后的静态样式集合
- `fetch`：自定义方法，没有提供则使用全局 `window` 提供的 `fetch`
- `loadError`：加载失败通知方法，配置时提供，可选参数

样式筛选规则：

- 内联的静态样式都允许
- 外联的样式不在 `cssExcludes` 配置列表中，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-excludes)]
- 所有符合要求且匹配 `cssIgnores` 的外联样式，需要标记 `ignore` 为 `true`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-ignores)]

样式从哪里来：

- 由 `processTpl` 从提取的入口资源筛选出静态样式 [[查看](#processtpl-提取资源)]

调用场景：

- 全部来自 `processCssLoader` 加载样式资源 [[查看](#processcssloader处理-css-loader)]

发挥的作用：

- 在 `importHTML` 包裹 `getExternalStyleSheets` 方法确保不会立即执行 [[查看](#importhtml-加载资源)]
- 而在调用场景中通过 `await` 可以确保执行前优先发起任务

发起的任务由样式集合中的 `contentPromise` 决定：

- 类型为 `Promise` 的微任务，将确保资源 `resolve`
- 类型为 `fetchAssets` 返回的微任务，将确保发起请求

> 为了很好的理解区别，用 `codepen` 做了一个演示 [[查看](https://codepen.io/levi0001/pen/qBzPwZe?editors=1111)]

和 `script` 不同的加载方式：

- 样式加载每一步都由 `await` 确保执行完毕，不存在还没有拿到 `fetchAssets` 请求结果的情况

#### 通过配置替换资源

包含 2 个插件和一个启动配置，分别是

- `css-loader`：插件，在运行时对子应用的 `css` 文本进行修改，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]
- `js-loader`：插件，在运行时对子应用的 `script` 脚本进行替换，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-loader)]
- `replace`：启动配置，在运行时处理子应用的 `html`、`js`、`css` 进行替换，见：文档 [[查看](https://wujie-micro.github.io/doc/api/preloadApp.html#replace)]

这些方法将通过以下方式调用并替换资源

`processCssLoader` 替换应用中的静态样式和 `template` [[查看](#processcssloader处理-css-loader)]：

- 为样式资源属性 `contentPromise` 追加一个微任务，通过 `css-loader` 替换样式
- 通过 `getEmbedHTML` 将加载的样式替换 `template` 中对应的注释
- 最后通过 `replace` 替换已更新资源后的 `template`

> 调用 `processCssLoader` 之前就一定会通过 `importHTML` 提取资源 [[查看](#importhtml-加载资源)]

存在 2 个问题：

- `replace` 不能替换应用中的静态样式，只能用 `css-loader` 代替
- `replace` 在 `processCssLoader` 不可用

因为 `replace` 必须在应用 `active` 是绑定在实例：

- 而 `processCssLoader` 是在 `active` 之前调用，执行时 `sandbox.replace` 方法还不存在

`getCssLoader` 柯里化处理运行时的样式：

- 接受 2 个参数，全部来自手动配置：`plugins` 插件集合、`replace` 用于替换资源
- 返回函数，参数有：`code` 样式内容、`src` 资源链接、`base` 子应用 `origin` + `pathname`

处理方式：

- 先通过 `replace` 替换 `code` 样式，然后将参数透传给 `compose` 返回的函数
- `compose` 也是柯里化函数，通过 `reduce` 依次调用 `css-loader` 替换样式 [[查看](#compose-用柯里化的方式拍平一组函数)]

> 在这里 `replace` 会优先于 `css-loader` 执行替换

`getCssLoader` 调用场景：

- `processCssLoaderForTemplate`：处理手动添加样式 [[查看](#processcssloaderfortemplate手动添加样式)]
- `rewriteAppendOrInsertChild`：处理应用中动态添加的内联和外联样式

`processCssLoaderForTemplate` 来自激活应用时渲染容器，见：创建容器渲染资源 [[查看](#4-创建容器渲染资源)]

- `renderTemplateToShadowRoot` [[查看](#rendertemplatetoshadowroot-渲染资源到-shadowroot)]
- `renderTemplateToIframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe-容器)]

`rewriteAppendOrInsertChild` 会通过 `patchRenderEffect` 重写方法 [[查看](#patchrendereffect-为容器打补丁)]：

- `patchRenderEffect` 同样来自激活应用时渲染容器，见：创建容器渲染资源 [[查看](#4-创建容器渲染资源)]
- 但是拦截动态样式是在 `start` 启动应用时注入 `script` 到沙箱之后 [[查看](#2-执行队列)]

> `replace` 的参数只有 `code`，拿不到资源类型，只能根据具体代码进行替换，如果需要更多的信息，建议通过 `css-loader` 或 `js-loader`

`getJsLoader` 柯里化处理运行时的 `script`：

- 执行方式和 `getCssLoader` 是一样的，唯一的不同是提取 `plugins` 的属性名
- 柯里化后传递 `replace` 替换的资源，通过 `compose` 将拿到的资源依次调用 `jsLoader` [[查看](#compose-用柯里化的方式拍平一组函数)]

> 在这里 `replace` 会优先于 `js-loader` 执行替换

`getJsLoader` 只能通过 `insertScriptToIframe` 调用，分别来自以下场景 [[查看](#insertscripttoiframe为沙箱插入-script)]：

- `start` 启动应用：手动添加 `script`、应用内静态 `script`（含入口文件）[[查看](#-start-启动应用)]
- `rewriteAppendOrInsertChild`：应用中动态添加的 `script`，包括 `chunk`

> 上面提到的应用内动态添加的样式，也是通过 `rewriteAppendOrInsertChild` 执行的；也就是说应用内动态添加的 `script` 和样式，会先注入 `script` 到沙箱后，然后再拦截动态添加的样式和 `script`

### 辅助方法 - 容器渲染

围绕应用的渲染容器归纳相关的方法，包含：`shadowRoot` 容器、`iframe` 容器以及劫持容器

#### 创建 `iframe` 容器

分 2 部分：创建 `iframe` 容器和挂载容器

**创建 `iframe` 容器：**

| 分类     | `iframe` 容器                                                                                                                                                     | 劫持容器                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 创建方法 | `createIframeContainer`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L238)] | `renderIframeReplaceApp` [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]                                                             |
| 创建方式 | `document.createElement("iframe");`                                                                                                                               | `window.document.createElement("iframe")`                                                                                                    |
| 默认样式 | `height:100%;width:100%`                                                                                                                                          | `height:100%;width:100%`                                                                                                                     |
| 设置属性 | 自定义属性、样式、`flag_id`                                                                                                                                       | 自定义属性、样式、`src`                                                                                                                      |
| 执行结果 | 返回 `iframe` 容器                                                                                                                                                | 将劫持容器渲染到 `el` 挂载节点                                                                                                               |
| 调用场景 | `initRenderIframeAndContainer`，继续往下看                                                                                                                        | `locationHrefSet` [[查看](#locationhrefset拦截子应用-locationhref)]、`processAppForHrefJump` [[查看](#processappforhrefjump-监听前进和后端)] |

为什么要放到一起总结？

- 因为作为容器它们只是调用场景不一样，但创建的方式是一样的
- 从这点也能看出来 `wujie` 的源码相对会 `micro-app` 零散很多 [[查看](#2-重复提取样式的-bug)]

**`initRenderIframeAndContainer` 挂载容器到指定节点**

目录：`shadow.ts` - `initRenderIframeAndContainer` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L92)]

参数：

- `id`：应用名
- `parent`：挂载节点
- `degradeAttrs`：`iframe` 属性

流程：

- 通过 `createIframeContainer` 创建 `iframe` 容器
- 通过 `renderElementToContainer` 挂载容器到指定节点 [[查看](#renderelementtocontainer将节点元素挂载到容器)]
- 拿到 `iframe` 容器的 `document`，并写入空白 `html`
- 将 `iframe` 容器和挂载节点都返回

> `renderIframeReplaceApp` 也是通过 `renderElementToContainer` 将劫持容器挂载到指定节点，挂载前 `renderElementToContainer` 会清空挂载节点，这样就完成了劫持容器替换渲染容器的过程

调用场景：

- `active` 激活应用：`degrade` 降级时创建容器 [[查看](#41-degrade-主动降级渲染)]
- `processAppForHrefJump` 监听后退操作：用降级的 `iframe` 容器替换劫持容器 [[查看](#processappforhrefjump-监听前进和后端)]

#### `renderElementToContainer`：将节点元素挂载到容器

目录：`shadow.ts` - `renderElementToContainer` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L70)]

参数：

- `element`：挂载的节点，类型：`Element | ChildNode`
- `selectorOrElement`：容器，类型：`string | HTMLElement`

流程：

- 通过 `getContainer` 定位到容器 `container`
- 如果 `container` 存在，且不包含提供的 `element`，将其添加到 `container`
- 返回定位的容器 `container`

需要注意的是：

- 不存在 `LOADING_DATA_FLAG` 节点的情况下，挂载到 `container` 前需要通过 `clearChild` 清空容器

什么时候会提供 `LOADING_DATA_FLAG`：

- `startApp` 启动应用时通过 `addLoading` 设置，见：启动应用时添加、删除 `loading` [[查看](#启动应用时添加删除-loading)]

为什么 `addLoading` 后就不需要清空容器：

- 因为容器在 `addLoading` 时已清空

调用场景：

- `renderIframeReplaceApp`：劫持 `url` 创建 `iframe` 替换容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]
- `locationHrefSet`：降级处理时将 `iframe` 容器的 `html` 添加到沙箱 `body` [[查看](#locationhrefset拦截子应用-locationhref)]
- `active` 激活应用时，将 `shadowRoot` 添加到挂载节点 [[查看](#42-挂载子应用切换初始化预加载)]
- `initRenderIframeAndContainer`：创建 `iframe` 容器添加到挂载点 [[查看](#创建-iframe-容器)]
- `processAppForHrefJump` 监听后退操作：用 `shadowRoot` 容器替换劫持容器 [[查看](#processappforhrefjump-监听前进和后端)]

#### `renderTemplateToIframe` 渲染资源到 `iframe` 容器

目录：`shadow.ts` - `renderTemplateToIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L252)]

参数：

- `renderDocument`：降级 `iframe` 容器的 `document`
- `iframeWindow`：沙箱的 `window`
- `template`：通过 `active` 透传过来的应用入口资源 [[查看](#-active-激活应用)]

调用场景全部来自 `degrade` 降级下 `active` 激活应用 [[查看](#41-degrade-主动降级渲染)]：

- 首次 `aclive`：将应用资源注入 `iframe` 容器
- 非 `alive` 模式再激活：同首次激活一样，每次激活都会新建 `iframe` 容器

> `umd` 再次激活时，使用的 `template` 来自首次 `active` 绑定在实例的资源

`alive` 再次激活不会用到 `renderTemplateToIframe`：

- 将通过实例的 `document` 将首次注入容器的 `html` 元素，`replace` 新容器中的 `html` 元素

流程和 `renderTemplateToShadowRoot` 一样 [[查看](#rendertemplatetoshadowroot-渲染资源到-shadowroot)]

#### `renderTemplateToShadowRoot` 渲染资源到 `shadowRoot`

目录：`shadow.ts` - `renderTemplateToShadowRoot` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L212)]

参数：

- `shadowRoot`：注入的容器
- `iframeWindow`：沙箱的 `window`
- `template`：通过 `active` 透传过来的应用入口资源 [[查看](#-active-激活应用)]

调用场景来自非 `degrade` 降级下 `active` 激活应用 [[查看](#42-挂载子应用切换初始化预加载)]：

- 首次 `aclive`：将应用资源注入 `shadowRoot`
- `umd` 模式再激活：将资源重新注入已清空的 `shadowRoot`

> 重建模式每次都是首次 `active`

`alive` 再次激活不会用到 `renderTemplateToShadowRoot`：

- 容器会绑定在实例属性 `shadowRoot` 中，再次激活直接挂载到指定节点 `el`

流程和 `renderTemplateToIframe` 一样：

| 分类                                                                             | `renderTemplateToIframe` | `renderTemplateToShadowRoot` |
| -------------------------------------------------------------------------------- | ------------------------ | ---------------------------- |
| `renderTemplateToHtml` [[查看](#rendertemplatetohtml渲染-template-为-html-元素)] | 创建 `html` 元素         | 创建 `html` 元素             |
| `processCssLoaderForTemplate` [[查看](#processcssloaderfortemplate手动添加样式)] | 手动添加样式             | 手动添加样式                 |
| 注入 `html`                                                                      | 替换容器 `html` 元素     | `appendChild` 到容器         |
| 修复 `parentNode`                                                                | 需要                     | 需要                         |
| `patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]                    | 给容器打补丁             | 给容器打补丁                 |

如何修复 `parentNode`：

- 通过 `Object.defineProperty` 劫持容器 `html` 元素的 `parentNode`，指向沙箱 `document`

不同在于：

| 分类           | `renderTemplateToIframe` | `renderTemplateToShadowRoot`   |
| -------------- | ------------------------ | ------------------------------ |
| 容器根节点     | `iframe.document`        | `shadowRoot`                   |
| 指向实例属性   | `this.document`          | `this.shadowRoot`              |
| 容器 `head`    | `this.document.head`     | `this.shadowRoot.head`         |
| 容器 `body`    | `this.document.body`     | `this.shadowRoot.body`         |
| 遮罩层 `shade` | 不支持                   | 作为在容器 `html` 第一个子元素 |

> 因此 `patchRenderEffect` 打补丁的容器对象也不一样 [[查看](#patchrendereffect-为容器打补丁)]

关于 `head`、`body`：

- 容器的 `head`、`body` 主要用于容器事件、元素操作的代理和劫持
- 除此之外无论是 `iframe` 还是 `shadowRoot`，都有一个实例的 `head`、`body`，用于渲染子应用的 `template`，见：`renderTemplateToHtml` [[查看](#rendertemplatetohtml渲染-template-为-html-元素)]

遮罩层 `shade`：

- 在容器中不可见，为了撑开容器用来展示应用中的弹窗和浮层，将作为 `html` 节点下第 1 个元素
- 由于在 `iframe` 容器中无法撑开容器区域，所以仅限 `shadowRoot`

#### `renderTemplateToHtml`：渲染 `template` 为 `html` 元素

目录：`shadow.ts` - `renderTemplateToHtml` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L176)]

参数：

- `iframeWindow`：沙箱的 `window`
- `template`：通过 `active` 透传过来的应用入口资源 [[查看](#-active-激活应用)]

返回：

- 整个完成渲染并更新资源的 `html` 元素

调用场景：

- `renderTemplateToShadowRoot` [[查看](#rendertemplatetoshadowroot-渲染资源到-shadowroot)]
- `renderTemplateToIframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe-容器)]

做了 3 件事：

- 通过沙箱 `document` 创建一个 `html` 元素，并将 `template` 作为 `innerHTML`
- 遍历 `html` 下所有可见元素，通过 `patchElementEffect` 为每个元素打补丁 [[查看](#patchelementeffect为元素打补丁)]
- 获取所有 `a`、`img`、`source` 元素，修正资源相对路径

优化 `umd` 模式加载的应用，将`head` 和 `body`绑定在应用实例中：

- 组件多次渲染，`head` 和 `body` 必须一直使用同一个来应对被缓存的场景（来自备注）
- 初次声明节点会绑定到应用实例，再次调用 `renderTemplateToHtml`，将通过 `replaceHeadAndBody` 恢复最初记录的节点到 `html` 元素

在末尾可能是担心不存在 `head` 或 `body` 的情况进行了补全：

- 但目前来看似乎做了多余的工作
- 为 `html` 元素设置 `innerHTML` 时候，会根据情况自动补全 `head` 和 `body`
- 并且会丢弃外部包裹的 `html` 根元素及其他相关声明

> 用 `code` 做了一个静态的资源补全的演示 [[查看](https://codepen.io/levi0001/pen/JjQpQbb)]

修正相对路径的细节：

- 通过 `patchElementEffect` 为遍历中每一个可见元素打补丁 [[查看](#patchelementeffect为元素打补丁)]
- 通过 `relativeElementTagAttrMap` 拿到资源属性，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L185)]

只有当元素存在资源属性时才会通过 `getAbsolutePath` 转换资源路径 [[查看](#getabsolutepath获取绝对路径)]

有 2 种情况：

- 绝对路径：原封不动返回绝对路径
- 相对路径：返回：`baseUrl/相对路径`

> `baseUrl` 通过 `patchElementEffect` 处理指向 `proxyLocation`：`host` + `pathname` [[查看](#patchelementeffect为元素打补丁)]

容器中所有元素都通过沙箱 `document` 创建，因为：

- 通过沙箱 `window` 获取应用实例，以便做出对应操作，例如：记录 `head` 和 `body`
- `patchElementEffect` 通过沙箱的 `window` 为每个元素打补丁

#### `processCssLoaderForTemplate`：手动添加样式

目录：`shadow.ts` - `processCssLoaderForTemplate` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L109)]

参数：

- `sandbox`：应用实例，作用：① 获取沙箱 `document` 创建元素；② 为加载样式透传实例属性
- `html`：由 `renderTemplateToHtml` 渲染的 `html` 元素 [[查看](#rendertemplatetohtml渲染-template-为-html-元素)]

> 样式通过 `getExternalStyleSheets` 加载，需要的参数也绑定在实例属性中 [[查看](#getexternalstylesheets加载样式资源)]

返回：

- 将更新后的 `html` 元素作为 `Promise` 返回，无论是 `resolve` 成功，还是 `reject` 拒绝

先提取 3 个 `plugin`：

- `cssLoader`：用于每条样式加载成功后自定义处理，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]
- `cssBeforeLoaders`：插入应用容器 `head` 头部的样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-before-loaders)]
- `cssAfterLoaders`：插入应用容器 `body` 尾部的样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-after-loaders)]

> 其中 `cssLoader` 通过 `getCssLoader` 柯里化返回函数，见：通过配置替换资源 [[查看](#通过配置替换资源)]

除此之外：

- 从应用实例中获取 `proxyLocation`，通过 `getCurUrl` 拿到应用 `host` + `pathname`
- 在 `cssLoader` 中需要提供：加载的样式内容、样式的链接，应用的链接

提取样式的步骤和 `processCssLoader` 提取应用静态样式一样 [[查看](#processcssloader处理-css-loader)]：

- 通过 `getExternalStyleSheets` 为每个手动样式添加一个 `Promise` 对象 `contentPromise`
- 通过 `Promis.all` 加载所有 `contentPromise`，提取列表中每一项 `src`、`content`
- 遍历加载后的列表，创建一个内联样式，通过 `cssLoader` 替换样式后，作为内联样式内容
- 根据加载的样式类型决定将样式插入 `head` 头部，还是 `body` 尾部
- 通过 `Promise.all` 将最终处理的 `html` 元素返回

手动添加样式的疑惑：

- 忘记为手动添加的样式通过 `patchElementEffect` 打补丁了 [[查看](#patchelementeffect为元素打补丁)]
- 但是手动添加的样式按理说子应用中不会匹配做相应操作

应用中的元素如何打补丁：

- `renderTemplateToHtml`：为应用中提取的静态资源打补丁 [[查看](#rendertemplatetohtml渲染-template-为-html-元素)]
- `rewriteAppendOrInsertChild`：为应用中动态添加的元素打补丁 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

#### 启动应用时添加、删除 `loading`

目录：`shadow.ts` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts)]

**`addLoading` 添加 `loading`**

参数：

- `el`：挂载容器的节点，配置时提供
- `loading`：加载状态的 `HTMLElement`，配置时提供，应该是可选类型

> `wujie` 的 `tsconfig.json` 并没按照严格来申明，很多类型不太正确

调用场景：

- `startApp` 启动应用 [[查看](#3-创建新的沙箱实例)]

用途：

- 清空挂载节点、给节点中添加 `loading` 元素

流程：

- 通过 `getContainer` 获取挂载节点，通过 `clearChild` 清空节点
- 通过 `getComputedStyle` 获取当前挂载节点的样式，根据样式更新节点：定位、`overflow`、属性
- 创建一个 `loading` 元素添加到挂载节点里

根据挂载节点的 `position` 执行不同的操作：

| 行为            | `static`                            | `relative`、`sticky`                |
| --------------- | ----------------------------------- | ----------------------------------- |
| 记录 `position` | 标签 `CONTAINER_POSITION_DATA_FLAG` | 不记录                              |
| 记录 `overflow` | 标签 `CONTAINER_OVERFLOW_DATA_FLAG` | 标签 `CONTAINER_OVERFLOW_DATA_FLAG` |
| 更新 `position` | `relative`                          | 不更新                              |
| 更新 `overflow` | `hidden`                            | `hidden`                            |

> 其他 `position` 状态不做处理

创建 `loadingContainer` 元素：

- 作为 `loading` 父节点，添加样式 `position` 为 `absolute`，居中展示
- 添加标签 `LOADING_DATA_FLAG`，避免激活应用时通过 `renderElementToContainer` 清空挂载点 [[查看](#renderelementtocontainer将节点元素挂载到容器)]
- 将参数 `loading` 添加到 `loadingContainer`，没有就使用默认的 `svg`，之后将整个元素添加到挂载节点

此时的 `loading` 是不可见的：

- 因为父级的 `position` 不是 `static`，且 `overflow` 会隐藏子集，自身又没有高度
- 子集只有一个 `absolute` 的 `loadingContainer` 无法撑开挂载节点的高度

什么时候可见：

- `active` 激活应用时，通过 `renderTemplateToShadowRoot` 或 `renderTemplateToIframe`，将容器添加到挂载节点撑开节点高度时

在哪清除：

- 只能通过 `removeLoading`，继续往下看

**`removeLoading` 删除 `loading`**

参数：

- `el`：挂载容器的节点，配置时提供

做了 3 件事：

- 根据添加的标签还原 `position` 和 `overflow`
- 删除添加的标签：`CONTAINER_POSITION_DATA_FLAG`、`CONTAINER_OVERFLOW_DATA_FLAG`
- 删除 `loadingContainer` 元素

调用场景：

- `start` 启动应用时候，只要不是 `umd` 模式切换应用都会执行，见：队列前的准备 [[查看](#5-队列前的准备)]
- `mount` 挂载应用时，仅限 `umd` 模式切换应用 [[查看](#1-umd-方式启动)]

> `umd` 不存在首次加载应用，因为第一次启动应用 `mount` 方法还没有挂载到沙箱 `window`

#### 记录、恢复 `iframe` 容器事件

仅用于 `degrade` 主动降级

目录：`iframe.ts` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts)]

**1. `recordEventListeners`：记录容器中所有事件**

参数：

- `iframeWindow`：沙箱 `window`

流程：

- 重写子应用 `addEventListener` 和 `removeEventListener`
- 根据操作从实例 `elementEventCacheMap` 映射表中添加或删除记录，见：降级容器事件 [[查看](#elementeventcachemap降级容器事件)]
- 然后再监听或删除子应用相关事件

记录事件方式：

- 键名：`Node` 监听事件的节点
- 键值：包含：`type`、`handle`、`options` 的数组集合

> 若删除监听的事件后，发现数组集合空了，同时在映射表中删除当前监听的事件节点

调用场景：

- `initIframeDom`：初始化 `iframe` 的 `dom` 结构 [[查看](#initiframedom初始化-iframe-的-dom-结构)]

**2. `recoverEventListeners`：恢复容器中所有元素事件**

参数：

- `rootElement`：`iframe` 容器中 `html` 元素
- `iframeWindow`：沙箱 `window`

流程：

- 通过 `createTreeWalker` 拿到 `rootElement` 下所有 `Element` 节点
- 遍历元素通过 `elementEventCacheMap` 获取事件监听对象，记录到一个新的 `WeakMap` 对象上
- 将拿到事件集合重新在节点上监听
- 将筛选赋值后的 `WeakMap` 更新实例映射表 `elementEventCacheMap` [[查看](#elementeventcachemap降级容器事件)]

调用场景：

- `alive` 模式切换应用时通过 `active` 激活时恢复事件 [[查看](#41-degrade-主动降级渲染)]

> `umd`：每次都清空容器，重建模式：每次都销毁实例，因此不存在恢复容器中元素监听的事件

**3. `recoverDocumentListeners`：恢复容器 `document` 事件**

参数：

- `oldRootElement`：初始激活时绑定容器的 `html` 元素
- `newRootElement`：再次激活是重新创建的容器 `html` 元素
- `iframeWindow`：沙箱 `window`

流程：

- 和 `recoverEventListeners` 一样，不同的是仅恢复容器 `document` 的监听事件

调用场景：

- `umd` 模式切换应用时通过 `active` 激活时恢复事件 [[查看](#41-degrade-主动降级渲染)]

> 重建模式每次 `startApp` 都是销毁后重新声明实例，不存在事件恢复，见：创建新的沙箱实例 [[查看](#3-创建新的沙箱实例)]

目的：

- 防止 `react16` 监听事件丢失（来自备注），`React 16` 及之前的版本事件记录在 `document`

> `React 16` 之后事件绑定在应用根节点，如：`#root`；`umd` 启动应用后会通过 `__WUJIE_MOUNT` 重新委托事件捕获

不需要恢复 `document` 事件：

- `shadowRoot`：因为本身就是跟节点，`degrade` 降级时每次都是新建 `iframe` 容器
- 重建模式：每次激活都是新的应用实例

> `degrade` 降级下，`alive` 模式通过 `recoverEventListeners` 恢复事件

### 辅助方法 - 打补丁

围绕 `patch*` 打补丁归纳方法

#### `patchRenderEffect` 为容器打补丁

目录：`effect.ts` - `patchRenderEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L427)]

参数：

- `render`：`shadowRoot` 或 `document`
- `id`：应用名称，用于透传给重写方法用于获取实例
- `degrade`：主动降级，非降级模式记录事件

必做：劫持对象重写方法

| 劫持方法       | `render` | `render.head` | `render.body` | 重写方法                                                                                           |
| -------------- | -------- | ------------- | ------------- | -------------------------------------------------------------------------------------------------- |
| `appendChild`  | ❎       | ✅            | ✅            | `rewriteAppendOrInsertChild` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)] |
| `insertBefore` | ❎       | ✅            | ✅            | `rewriteAppendOrInsertChild` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)] |
| `removeChild`  | ❎       | ✅            | ❎            | `rewriteRemoveChild` [[查看](#rewriteremovechild重写-removechild)]                                 |
| `contains`     | ✅       | ✅            | ❎            | `rewriteContains` [[查看](#rewritecontains重写-contains)]                                          |

选做：非降级情况下，通过 `patchEventListener` 记录容器 `body`、`head` 事件

- 事件会记录在监听对象的属性 `_cacheListeners` 上，目的和意义见：容器事件 [[查看](#shadowrootbodyhead_cachelisteners容器事件)]

**记录、删除容器事件**

提供两个方法：

- `patchEventListener`：记录容器 `head`、`body` 事件，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L385)]
- `removeEventListener`：删除容器 `head`、`body` 事件，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L416)]

都接受 1 个参数：

- `element`：容器的 `head` 或 `body`

要求：

- `umd` 模式，且非 `degrapde` 降级，原因见：容器事件 [[查看](#shadowrootbodyhead_cachelisteners容器事件)]

重写 `[body|head].addEventListener`：

- 将事件和回调方法记录在映射表 `listenerMap`，之后添加 `element` 监听事件
- 记录名称为事件类型，记录的值是回调集合的数组

> 监听事件中的参数 `options` 仅用于发起监听，不在记录中缓存，因为记录事件的目的是为了注销容器前删除对应事件

重写 `[body|head].removeEventListener`：

- 通过事件和回调方法从映射表 `listenerMap` 中删除对应的事件，之后删除 `element` 监听事件
- 如果删除事件后，记录事件类型对应的集合为空数组，将其从映射表中删除

将 `listenerMap` 绑定在 `element` 对象属性 `_cacheListeners`：

- `unmount` 时会通过 `removeEventListener` 删除绑定在容器 `head`、`body` 上的事件
- 切换应用时，在注入资源时通过初次记录在实例中的 `head`、`body` 重新渲染，并再次记录事件

> 清理和重新记录仅限 `umd` 模式，原因见：容器事件 [[查看](#shadowrootbodyhead_cachelisteners容器事件)]

`removeEventListener` 删除事件：

- 遍历映射表 `listenerMap`，拿到 `type` 和回调方法集合，依次从 `element` 中取消事件

#### `patchElementEffect`：为元素打补丁

目录：`iframe.ts` - `patchElementEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L668)]

参数：

- `element`：要打补丁的 `html` 元素、`Node` 节点、`ShadowRoot`
- `iframeWindow`：沙箱 `window`，用于获取实例和沙箱中指定对象

**内部补丁 1：`baseURI`**

- 通过 `proxyLocation` 定位到当前应用的 `protocol` + `host` + `pathname`

用途：

- 通过获取元素的 `baseURI` 去纠正子应用中带有相对路径的资源，比如：`a`、`img` 等
- 使其路径相对于子应用，而不是基座

**内部补丁 2：`ownerDocument`**

- 指向当前沙箱 `iframe.contentDocument`

用途：

- 让渲染容器所有的元素根节点都指向沙箱 `document`，容器中创建的元素都需要通过沙箱 `document`
- 通过 `ownerDocument` 可以从容器元素直接获取沙箱 `document` 用来创建元素

**内部补丁 3：`_hasPatch`**

表明已给元素打过补丁，不用再打补丁

**外部补丁：`patchElementHook`**

通过 `execHooks` 提取 `plugins`，提供则使用 `patchElementHook` 为每个元素打补丁，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#patchelementhook)]

> 手动配置的外部补丁可覆盖内部补丁

#### `patchIframeVariable` 为子应用 `window` 添加属性

目录：`iframe.ts` - `patchIframeVariable` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L155)]

参数：

- `iframeWindow`：沙箱 `window`，用于子应用绑定全局属性
- `wujie`：应用实例
- `appHostPath`：子应用的 `origin`

添加的属性：

- `__WUJIE`：指向应用实例 `wujie`
- `__WUJIE_PUBLIC_PATH__`：子应用的 `origin` + `/`
- `$wujie`：子应用的 `provide`，见：`WuJie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- `__WUJIE_RAW_WINDOW__`：指向沙箱 `window`

#### `patchIframeHistory` 劫持沙箱 `iframe` 的 `history`

目录：`iframe.ts` - `patchIframeHistory` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L170)]

参数：

- `iframeWindow`：沙箱 `window`，用于 ① 获取 `history`；② 纠正链接
- `appHostPath`：子应用的 `origin`
- `mainHostPath`：基座的 `origin`

调用场景：

- `initIframeDom`：初始化 `iframe` 的 `dom` 结构 [[查看](#initiframedom初始化-iframe-的-dom-结构)]

设计初衷：

- 劫持 `history` 之前，会通过 `initBase` 修正应用中相对路径，基于子应用：`origin` + `pathname` [[查看](#base标签操作)]
- 通过 `history` 跳转时，需要拦截链接替换为基座 `origin` 后，更新沙箱 `iframe` 的 `url`
- 通过 `updateBase` 根据沙箱的 `url` 更新 `base` 元素，重新基于子应用 [[查看](#base标签操作)]

劫持 `history` 的方法：

- `pushState`：插入记录
- `replaceState`：替换记录

流程有 3 步：

1. 计算得到 `mainUrl`，通过 `rawHistoryPushState` 原生方法更新 `history` 记录
2. 通过 `updateBase` 更新呢 `base` 元素，用于修正应用中相对路径的基础链接 [[查看](#base标签操作)]
3. 通过 `syncUrlToWindow` 同步子应用路由到基座，以 `hash` 形式存在 [[查看](#syncurltowindow同步子应用路由到主应用)]

> 若更新 `history` 记录中没有提供 `url`，只执行 `rawHistoryPushState` 更新

`mainUrl` 计算方式：

- `url`：更新 `history` 记录的链接，链接基于子应用 `origin`
- `baseUrl`：基座 `origin` + 沙箱的 `pathname` + `search` + `hash`
- `entry`：将 `url` 中子应用 `origin` 替换为空，得到计划更新的：`pathname` + `search` + `hash`
- `mainUrl`：通过 `getAbsolutePath` 基于 `entry` 和 `baseUrl` 获取链接 [[查看](#getabsolutepath获取绝对路径)]

> 只要 `entry` 不为空，`baseUrl` 默认忽略 `search` + `hash`，见：`defaultGetPublicPath` [[查看](#defaultgetpublicpath获取资源链接的-path)]

`rawHistoryPushState.call` 指定的上下文是沙箱的 `history`：

- 这样就为 `syncIframeUrlToWindow` 中监听沙箱的 `popstate` 和 `hashchange` 提供了支持 [[查看](#synciframeurltowindow-监听沙箱前进后退)]
- 当沙箱路由的 `hash` 改变，或是前进后退时，就会发起同步路由的操作

#### `patchIframeEvents` 劫持沙箱 `iframe` 的 `EventListener`

目录：`iframe.ts` - `patchIframeEvents` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L115)]

参数：

- `iframeWindow`：沙箱 `window`，用于重写事件监听

调用场景：

- `initIframeDom`：初始化 `iframe` 的 `dom` 结构 [[查看](#initiframedom初始化-iframe-的-dom-结构)]

重写的沙箱 `window` 方法：

- `addEventListener`：添加监听事件
- `removeEventListener`：删除监听事件

**1. 通过 `execHooks` 提取并执行插件函数**

- `addEventListener`：`windowAddEventListenerHook` 见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#windowaddeventlistenerhook)]
- `removeEventListener`：`windowRemoveEventListenerHook` 见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#windowremoveeventlistenerhook)]

目的：

- 子应用的 `Dom` 渲染在容器中，`script` 在 沙箱 `iframe` 中运行
- 当子应用需要监听 `window` 事件时，可以通过插件从基座添加全局监听对象

**2. `__WUJIE_EVENTLISTENER__` 记录转发事件**

目的：

- 转发子应用事件指向沙箱 `window`，见：转发 `window` 事件 [[查看](#__wujie_eventlistener__转发-window-事件)]
- 转发同时需要将事件记录在集合中，以便 `destroy` 时能够卸载事件 [[查看](#-destroy-销毁实例)]

记录和删除方法：

- 通过 `set` 记录一个对象，包含：`type`、`listener`、`options`，确保每一条记录唯一性
- 删除事件时遍历集合，对照：`type`、`listener`、`options` 将其删除

**3. 执行回调方法**

无论事件怎么转发、记录最终都会通过原生方法执行操作：

- `rawWindowAddEventListener`：原生添加事件
- `rawWindowRemoveEventListener`：原生删除事件

执行的方法都会提供 `type`、`listener`、`options`，不同的是上下文 `window` 指向：

| 参考条件                                                                                                                                                                                  | `window` 指向                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `options.targetWindow` 存在                                                                                                                                                               | `options.targetWindow`                                   |
| 事件包含在 `appWindowAddEventListenerEvents` 中，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L169)] | 优先采用 `options.targetWindow`，不存在采用沙箱 `window` |
| `__WUJIE_RAW_WINDOW__` 存在，见：`patchIframeVariable` [[查看](#patchiframevariable-为子应用-window-添加属性)]                                                                            | 沙箱 `window`                                            |
| 其他情况                                                                                                                                                                                  | 全局 `window`                                            |

> 优先权：`targetWindow` > 沙箱 `window` > 全局 `window`

`targetWindow` 从哪来的：

- 手动配置，在 `mdn` 文档中 `EventTarget` 的 `options` 并不包含 `targetWindow` [[查看](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)]

例如需要在子应用中监听全局 `window` 的 `popstate`：

```
window.addEventListener('popstate', () => {}, { target: window.parent });
```

> 当然也包含注入 `message` 等方法，用于父子应用相互通信

**4. 会造成事件重复监听吗**

存在重复监听但不影响使用，例如 `resize`：

- 通过 `execHooks` 转发给全局 `window` 处理事件
- 沙箱 `iframe` 同样也会 `addEventListener`，但由于沙箱 `iframe` 不可见，所以除了 `removeEventListener` 之外沙箱不会执行任何 `resize` 事件

不存在重复监听，例如：`DOMContentLoaded`：

- 沙箱 `iframe` 中用于监听沙箱 `window` 对象
- 若使用 `execHooks` 转发事件，相当于在全局 `window` 上手动监听，选择权在使用者

存在歧义怎么办，比如 `message` 父子通信，既可以是全局 `window`，也可以是沙箱 `window`：

- 这个时候 `targetWindow` 就能够很好的解决问题了

#### `patchWindowEffect`：修正 `iframeWindow` 的 `effect`

目录：`iframe.ts` - `patchWindowEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L215)]

参数：

- `iframeWindow`：沙箱的 `window`，用于绑定、重写属性和事件

做了 3 件事：

1. 将全局 `window` 上的属性绑定到沙箱 `window`
2. 将全局 `window` 上的事件回调用沙箱 `window` 做劫持
3. 通过插件 `windowPropertyOverride` 给沙箱 `window` 打补丁

**绑定 `window` 上的属性**

内部定义函数 `processWindowProperty`：

- 从沙箱提取指定的属性 `key`，然后从全局 `window` 上获取值，绑定到沙箱 `window` 上

判定前需要通过 `isConstructable` 来判断，提供的属性是否可以实例化 [[查看](#isconstructable判断函数是否可以实例化)]：

| 条件                     | 绑定方式               | 上下文         |
| ------------------------ | ---------------------- | -------------- |
| 可实例化的构造函数       | 直接绑定               | 实例化后的对象 |
| 不能实例化的函数         | 通过 `bind` 指定上下文 | 全局 `window`  |
| 非函数，包括 `undefined` | 直接绑定               | 沙箱 `window`  |

方法：

- 通过 `Object.getOwnPropertyNames` 遍历沙箱 `window` 匹配属性名执行绑定

匹配 ①：`getSelection`：

- 通过 `Object.defineProperty` 指向沙箱 `document.getSelection`
- 用处：修正应用中文本范围或光标的当前位置
- 原理：容器负责渲染，沙箱负责执行 `script`，元素通过 `patchElementEffect` 指向沙箱 `document` [[查看](#patchelementeffect为元素打补丁)]

匹配 ②：`windowProxyProperties` 集合包含的属性，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L192)]

- 集合中包含的属性通过 `processWindowProperty` 绑定到沙箱 `window`

匹配 ③：`windowRegWhiteList` 正则匹配属性规则，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L195)]

- 通过 `processWindowProperty` 绑定到沙箱 `window`，执行前需确保全局 `window` 属性存在

**绑定全局 `window` 上所有的 `on` 开头的事件**

- 监听除了 `onload`、`onbeforeunload`、`onunload` 之外所有 `on` 开头的事件
- 通过 `Object.getOwnPropertyNames` 遍历 `window` 筛选匹配的事件

流程：

- 通过 `Object.getOwnPropertyDescriptor` 从沙箱 `window` 上获取事件描述信息
- 通过 `Object.defineProperty` 劫持沙箱 `window` 上的监听事件
- 通过 `set` 将沙箱 `window` 监听的事件绑定到全局 `window`
- 通过 `get` 直接返回绑定在全局 `window` 上的监听事件

> 在 `set` 中对于类型为函数的 `handle` 通过 `bind` 将上下文 `this` 指向沙箱 `window`

获取描述事件信息用处：

- `enumerable`：判断是否可枚举
- `set`：重写方法前判断事件是否可写或描述中存在 `set`，不满足设为 `undefined`

重写方法的意义，举个例子：

```
// 子应用内
(function(window, self, global, location) {
  window.onfocus = () => {
    this;
  }
}).bind(window.__WUJIE.proxy)(
  window.__WUJIE.proxy,
  window.__WUJIE.proxy,
  window.__WUJIE.proxy,
  window.__WUJIE.proxyLocation,
);

// 通过 `Object.getOwnPropertyDescriptor` 相当于将事件绑定在基座 `window`
window.onfocus = () => {
  this; // 这里 this 指向沙箱  window
}
```

- 这样当基座触发 `window.onfocus` 时，就会调用来自子应用的监听事件
- 子应用中只需为 `window` 绑定事件方法，不用关心 `window` 指向，和单独执行一样处理

**通过插件 `windowPropertyOverride` 打补丁**

官方文档遗漏了这个插件，原理和其他插件一样，通过 `execHooks` 提取并执行：

- 执行时会将沙箱 `window` 传过去，用于手动打补丁

#### `patchDocumentEffect`：修正沙箱 `document` 的 `effect`

目录：`iframe.ts` - `patchDocumentEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L384)]

参数：

- `iframeWindow`：沙箱的 `window`，用于 ① 获取沙箱及插件，② 提取接口和对象用于重写属性

**1. 处理 `addEventListener` 和 `removeEventListener`**

沙箱运行 `script`，渲染是在容器、操作在基座，需劫持沙箱 `document`，按情况分别指向容器和基座。

重写方法：

- `iframeWindow.Document.prototype.addEventListener`：沙箱 `document` 监听事件
- `iframeWindow.Document.prototype.removeEventListener`：沙箱 `document` 删除事件

> 应用中 `script` 运行在沙箱，`document` 也指向沙箱 `document`

**1.1. 记录事件**

声明 2 个 `WeakMap` 类型的映射表，见：记录沙箱 `document` 上的事件 [[查看](#记录沙箱-document-上的事件)]

`handlerCallbackMap`：记录监听的方法

- 使用 `handle` 从集合中获取回调对象 `callback`，不存在则修正并记录 `handle`
- 删除：通过 `handle` 查找对应的 `callback`，将其删除

> 修正上下文：若 `handle` 是函数通过 `bind` 指向沙箱 `document`，否则直接记录 `handle`

`handlerTypeMap`：记录监听的事件

- 用 `handle` 获取事件类型集合 `typeList`，不存在将事件类型保存在数组中记录到集合
- 否则判断集合中是否包含事件类型，不包含责插入后更新记录，包含则不做任何操作
- 删除记录则是从集合中删除事件类型，若删除后集合为空，将其从映射表中删除

记录中只有 `callback` 是有必要的：

- 用于转发事件时作为回调对象，可以是函数也可以是一个包含 `handleEvent` 的对象

> `handlerTypeMap` 目前除了记录外，没有其他用途，见：记录沙箱 `document` 上的事件 [[查看](#记录沙箱-document-上的事件)]

**1.2. 通过 `execHooks` 提取并执行插件函数**

用于转发沙箱 `document` 上的事件到基座，因为部分操作来自基座，而不是沙箱 `iframe`

- `documentAddEventListenerHook`：添加事件，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#documentaddeventlistenerhook)]
- `documentRemoveEventListenerHook`：删除事件，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#documentremoveeventlistenerhook)]

**1.3. 执行添加或删除事件监听**

无论添加还是删除事件，都要提供参数：`type`、`callback`、`options`，不同的是监听对象：

| 条件                                                                                                                                                                                  | 监听对象                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `appDocumentAddEventListenerEvents`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L151)]         | 沙箱 `document`                         |
| `degrade` 降级，见：提取配置初始化属性 [[查看](#2-提取配置初始化属性)]                                                                                                                | 降级容器 `document`                     |
| `mainDocumentAddEventListenerEvents`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L154)]        | 基座 `document`                         |
| `mainAndAppAddEventListenerEvents` 事件互斥，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L166)] | 分别调用：基座 `document`、`shadowRoot` |
| 其他                                                                                                                                                                                  | `shadowRoot`                            |

如果基座也是子应用会怎样：

- 监听对象是：沙箱 `iframe`、降级 `document`、`shadowRoot`，保持不变
- 监听对象是基座 `window`，监听或删除事件时会再次被重写，继续向上调用直至最顶层

无论监听对象如何改变，对于回调方法中的上下文始终遵循 `callback`：

- 沙箱 `iframe`：通过 `bind` 修正上下文
- 和监听对象相同：包含 `handleEvent` 方法的回调对象

> 为此写了一个简单的演示，见：`codepen` [[查看](https://codepen.io/levi0001/pen/rNEKrdg)]

**2. 处理 `onEvent`**

重新定义沙箱 `document` 中 `on` 开头的事件，将其绑定在容器指定对象中

| 子应用绑定对象  | 容器          | 监听对象         |
| --------------- | ------------- | ---------------- |
| 沙箱 `document` | 降级 `iframe` | 容器 `document`  |
| 沙箱 `document` | `shadowRoot`  | 容器 `html` 元素 |

举例：

```
// 在子应用中绑定事件到 `document`
document.onscroll = function() {};

// `degrade` 中相当于挂载事件到 `iframe` 容器的 `document` 上
sandbox.document.onscroll = function() {};

// 非 `degrade` 相当于挂载到 `shadowRoot` 的 `html` 元素上
sandbox.shadowRoot.firstElementChild.onscroll = function() {};
```

由于要绑定事件到监听对象上，所以必须从指定对象提取 2 个集合：

- `elementOnEvents`：沙箱 `html` 元素上所有 `on` 开头的事件
- `documentOnEvent`：沙箱 `document` 元素上所有 `on` 开头的事件，但要排除 `onreadystatechange`

> 取沙箱 `iframe` 指定对象的 `property` 绑定到容器相同对象上，类型相同的元素包含的 `property` 也相同

为了兼容不同的容器节点，取 2 个属性集合的交集：

- 排除的事件继续往下看，见：4. 处理 `document` 专属事件

流程和 `patchWindowEffect` 中处理 `onEvent` 一样 [[查看](#patchwindoweffect修正-iframewindow-的-effect)]：

- 通过 `Object.getOwnPropertyDescriptor` 从沙箱 `Document` 获取事件描述信息
- 通过 `Object.defineProperty ` 劫持沙箱 `Document` 上的监听事件
- 通过 `set` 将沙箱 `Document` 监听的事件绑定到容器指定节点
- 通过 `get` 直接返回绑定在容器节点上的监听事件

> 在 `set` 中对于类型为函数的 `handle` 通过 `bind` 将上下文 `this` 指向沙箱 `document`

获取描述信息的用处：

- `enumerable`：判断是否可枚举
- `set`：重写方法前判断事件是否可写或描述中存在 `set`，不满足设为 `undefined`

**3. 获取沙箱 `document` 属性时指向 `proxyDocument`**

可以通过流程图了解沙箱 `document` 和 `proxyDocument` 的关系 [[查看](#wujie-中的代理)]

属性来自：

- `documentProxyProperties`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L42)]

流程和 `onEvent` 基本一样：

- 通过 `Object.getOwnPropertyDescriptor` 从沙箱 `Document` 获取属性描述信息
- 通过 `Object.defineProperty ` 劫持沙箱 `Document` 上的属性
- 通过 `get` 直接从 `proxyDocument` 返回对应属性值
- 通用描述信息，决定 `enumerable` 是否可枚举

> 不同在于：不能通过 `set` 重写属性值

`proxyDocument` 会根据容器不同略有差异：

- `shadowRoot` [[查看](#2-代理空对象作为-proxydocument)]
- `iframe` 容器 [[查看](#1-劫持空对象作为-proxydocument)]

**4. 处理 `document` 专属事件**

根据渲染的方式，将沙箱 `document` 转发给容器或基座 `document`：

| 渲染方式      | 转发对象            |
| ------------- | ------------------- |
| `shadowRoot`  | 基座 `document`     |
| 降级 `iframe` | 降级容器 `document` |

属性来自：

- `documentEvents`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L131)]

流程和 `onEvent` 一样：

- 通过 `Object.getOwnPropertyDescriptor` 从沙箱 `Document` 获取事件描述信息
- 通过 `Object.defineProperty ` 劫持沙箱 `Document` 上的监听事件
- 通过 `set` 将沙箱 `Document` 转发监听事件到指定 `document` 对象
- 通过 `get` 直接从转发的 `document` 对象上获取获取监听事件

> 在 `set` 中对于类型为函数的 `handle` 通过 `bind` 将上下文 `this` 指向沙箱 `document`

**5. 处理 `head` 和 `body`**

流程和：3. 获取沙箱 `document` 属性时指向 `proxyDocument`，基本一样：

- 遍历 `ownerProperties` 集合劫持 `head` 和 `body`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L147)]
- 从沙箱 `document` 中劫持对象设置为不可重写，`get` 时指向 `proxyDocument`

**6. 运行插件钩子函数**

文档没提，流程和 `windowPropertyOverride` 一样，见：`patchWindowEffect` [[查看](#patchwindoweffect修正-iframewindow-的-effect)]

- 通过 `execHooks` 提取并执行插件 `documentPropertyOverride`，将沙箱 `window` 作为参数传过去打补丁

#### `patchNodeEffect`：修正容器节点的 `effect`

为容器中每个元素重写 3 个方法

目录：`iframe.ts` - `patchNodeEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L563)]

`getRootNode`：使用原生方法获取 `document`，之后根据容器返回根节点

| 容器          | `options`                       | 根节点          |
| ------------- | ------------------------------- | --------------- |
| `shadowRoot`  | `composed` 为 `true`            | 全局 `document` |
| `shadowRoot`  | 不设置 `composed`，或为 `false` | 沙箱 `document` |
| 沙箱 `iframe` | 忽略                            | 沙箱 `document` |
| 降级 `iframe` | 忽略                            | 降级 `document` |

`appendChild`：在元素内追加子元素、`insertBefore`：在元素之前插入元素

- 通过原生方法动态添加元素，然后使用 `patchElementEffect` 为元素打补丁 [[查看](#patchelementeffect为元素打补丁)]
- 返回添加的元素

#### `patchRelativeUrlEffect`：修复动态添加元素资源

修复资源元素的相对路径问题（来自备注）

目录：`iframe.ts` - `patchRelativeUrlEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L588)]

参数：

- `iframeWindow`：沙箱的 `window`，用于 ① 透传给 `fixElementCtrSrcOrHref`，② 提取资源接口

流程：

- 通过 `fixElementCtrSrcOrHref` 拦截元素资源属性设置，修正相对路径为绝对路径 [[查看](#fixelementctrsrcorhref对元素资源打补丁)]

修复的元素：

- `HTMLImageElement`：图片 `src`
- `HTMLAnchorElement`：链接 `href`
- `HTMLSourceElement`：媒体 `src`
- `HTMLLinkElement`：资源 `href`
- `HTMLScriptElement`：脚本 `src`
- `HTMLMediaElement`：音视频 `src`

#### `fixElementCtrSrcOrHref`：对元素资源打补丁

通过重写方法、劫持元素原型，对资源属性中相对路径转化为绝对地址

目录：`utils.ts` - `fixElementCtrSrcOrHref` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L167)]

参数：

- `iframeWindow`：沙箱 `window`，用于获取沙箱 `Element` 原生属性 `setAttribute`
- `elementCtr`：资源元素接口
- `attr`：资源属性，如：`src`

目的：

- 来自子应用动态设置资源链接，通过 `getAbsolutePath` 重新配置最终的链接 [[查看](#getabsolutepath获取绝对路径)]

处理链接有 3 种情况：

- 相对路径：按照 `baseURI` 取转换为绝对路径
- 绝对路径或是 `hash`：不处理直接返回

> `baseURI` 为子应用 `origin` + `pathname`，见：`patchElementEffect` [[查看](#patchrendereffect-为容器打补丁)]

调用场景：

- `patchRelativeUrlEffect`：修复动态添加元素资源 [[查看](#patchrelativeurleffect修复动态添加元素资源)]

重写 `setAttribute`：

- 要求设置的属性和 `attr` 一致，获取绝对路径后通过原生方法更新属性

赋值更新时通过 `defineProperty` 劫持资源属性：

- 通过 `getOwnPropertyDescriptor` 获取资源属性描述信息
- `set` 时通过 `getAbsolutePath` 转换资源路径、`get` 时通过原生方法获取

### 辅助方法 - 沙箱 `iframe`

围绕沙箱 `iframe` 归纳相关的方法

#### `insertScriptToIframe`：为沙箱插入 `script`

向沙箱 `iframe` 中插入 `script`，包含静态提取和动态添加

目录：`iframe.ts` - `insertScriptToIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L710)]

参数：

- `scriptResult`：需要插入的 `script` 对象
- `iframeWindow`：沙箱 `window`
- `rawElement`：动态添加的 `script` 元素，用于 `setTagToScript` 打标记，可选参数

`scriptResult` 有 2 个类型：

| 类型                                                                                                                                                         | 来自                 | 缺少属性          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----------------- |
| `ScriptObject`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/template.ts#L45)]    | 静态提取、动态添加的 | `callback`        |
| `ScriptObjectLoader`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L22)] | 手动配置 `jsLoader`  | `defer`、`ignore` |

> 其中 `defer`、`ignore` 在这里用不到，函数中会强制断言为 `ScriptObjectLoader`。。。

调用场景有 2 个：

- `rewriteAppendOrInsertChild`：拦截应用中动态添加 `script` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]
- `start` 启动应用：提取应用中静态 `script`，手动配置 `jsLoader` [[查看](#-start-启动应用)]

> `rewriteAppendOrInsertChild` 来自：激活应用时，通过渲染资源到容器调用 `patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]

整个函数围绕 2 个对象展开：

- `scriptElement`：根据提供的对象，创建 `script` 元素插入沙箱 `iframe`
- `nextScriptElement`：执行完毕后插入到沙箱，用于提取并执行下个队列，见：`start` 启动应用 [[查看](#-start-启动应用)]

**1. 获取配置**

从 `scriptResult` 提取配置，详细见：`processTpl` 提取资源 - 4.提取或替换 `script` [[查看](#processtpl-提取资源)]

- `src`：`script` 链接
- `module`：是否为 `esModule` 模块
- `content`：`script` 内容
- `crossorigin`：是否跨域
- `crossoriginType`：跨域类型，包含 `"" | "anonymous" | "use-credentials"`
- `async`：是否为异步加载，在这里只有一个用途，异步情况下不提取并执行下一个队列
- `attrs`：`script` 元素中的属性键值对象
- `callback`：手动设置，会在注入 `script` 后调用，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-before-loaders)]
- `onload`：外联 `script` 完成加载或加载失败时调用

以上配置全部为可选类型，按照 `content` 划分如下：

| `content`    | `src`        | 类型            | `textContent`  |
| ------------ | ------------ | --------------- | -------------- |
| 存在且不为空 | 不设置       | 内联 `script`   | 按条件包装代码 |
| 不存在或为空 | 存在且不为空 | 外联 `script`   | 空字符         |
| 不存在或为空 | 不存在或为空 | `script` 不加载 | 空字符         |

> `degrade` 降级或 `esModule` 不包裹在模块内，其余情况代码均在 `proxy` 模块内执行，见：流程图 [[查看](#wujie-中的代理)]

通过沙箱 `iframe` 获取应用实例，用于提取对象：`replace`、`plugins`、`proxyLocation`：

- 用于获取 `jsLoader` 替换 `content`，见：通过配置替换资源 [[查看](#通过配置替换资源)]
- `proxyLocation` 会通过 `getCurUrl` 透传链接为子应用：`origin` + `pathname`

> 除此之外 `proxyLocation` 还用于作为 `proxy` 模块中的 `location`

`script` 注入类型：

| 来源                                                                 | 元素类型      |
| -------------------------------------------------------------------- | ------------- |
| `jsLoader` 手动提供的外联 `script`                                   | 外联 `script` |
| `jsIgnores` 屏蔽 `fetch` 加载的外联 `script`                         | 外联 `script` |
| `jsIgnores` 屏蔽带有属性 `async` 或 `defer` 的外联 `script`          | 内联 `script` |
| 类型为 `module` 的外联 `script`                                      | 外联 `script` |
| 带有 `ignore` 属性的静态 `script`                                    | 注释元素      |
| 不允许的 `esModule`，见：`processTpl` [[查看](#processtpl-提取资源)] | 注释元素      |
| `jsExcludes` 屏蔽 `script`                                           | 排除不注入    |
| 其他类型的 `script`                                                  | 内联 `script` |

**2. 配置 `script`**

2.1. 为 `scriptElement` 添加属性：

| 属性                           | 条件                                                     |
| ------------------------------ | -------------------------------------------------------- |
| 注入 `script` 的键值对 `attrs` | 键名不和 `ScriptObject`、`ScriptObjectLoader` 的属性同名 |
| `src`                          | 链接不为空的外联 `script`                                |
| `crossorigin`                  | 跨域的外联 `script`，属性值为 `crossoriginType`          |
| `type`                         | 注入的 `script` 类型为 `module`                          |
| `async`                        | 丢弃                                                     |
| `defer`                        | 丢弃                                                     |

2.2. `content` 存在且不为空，作为内联 `script`：

要求：非降级 `degrade` 不是 `esModule`，见：流程图 [[查看](#wujie-中的代理)]

将整个 `script` 内容包裹在一个函数模块里：

- 使用 `proxy` 作为模块的：`this`、`window`、`self`、`global` [[查看](#1-代理沙箱-window-作为-proxywindow)]
- 使用 `proxyLocation` 作为模块的 `location` [[查看](#3-代理空对象作为-proxylocation)]

修复 `webpack` 当 `publicPath` 为 `auto` 无法加载资源的问题：

- 通过 `Object.getOwnPropertyDescriptor` 获取 `scriptElement` 属性 `src` 的描述信息
- 当描述信息不存在时，或描述信息的类型不可以更改时需要修复问题
- 修复方式：通过 `defineProperty` 定义 `scriptElement` 属性 `src`

> 仅限内联 `script` 需要根据情况修复，外联 `script` 本身拥有 `src` 属性

2.3. `content` 不存在或为空，作为外联 `script`：

设置属性：`src`，`crossorigin` 为 `crossoriginType`，如果属性存在的话

> 外联 `script` 和 `esModule` 一样，不会包裹在 `proxy module` 中，见：流程图 [[查看](#wujie-中的代理)]

2.4. `script` 补充操作：

- 根据 `module` 决定是否添加 `type` 属性为 `module`
- 设置 `textContent`，外联 `script` 也会设置，但 `script` 会优先采用 `src`
- 设置 `nextScriptElement` 的代码，用于 `script` 插入完成后，提取并执行下一个队列

**3. 声明注入 `script` 的方法**

声明函数 `execNextScript`，用于注入 `scriptElement` 到容器：

- 指定沙箱 `head` 作为容器，只要 `async` 不存在，就会执行 `appendChild`

> 这里判断 `async` 是存在问题的，见：`start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

声明函数 `afterExecScript`，用于完成注入后执行：

- 触发 `onload`：用于通知 `script` 已完成加载
- 触发 `execNextScript`：提取执行下一个队列，见：执行队列 [[查看](#2-执行队列)]

`onload` 添加方式：

- 通过 `jsLoader` 手动添加，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-before-loaders)]
- 应用中动态添加 `script`，用于触发 `onload` 事件，见：`rewriteAppendOrInsertChild` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

> 问题：外联 `script` 注入沙箱加载失败后，触发的也是 `onload`，回调函数和参数没做区分

错误的情况：注入 `script` 代码是 `html` 格式，说明加载失败了

- 错误条件：① 内联 `script`；② `degrade` 降级或是 `esModule`
- 处理方法：输出 `error`，调用 `execNextScript` 以便执行下个队列

> 问题：非 `degrade` 且不是 `esModule` 的内联 `script` 难道就不会加载失败了吗？

打标记：

- 通过 `setTagToScript` 为注入沙箱的 `script` 打标记 [[查看](#为动态添加的-script-打标记)]
- 仅限通过 `rewriteAppendOrInsertChild` 动态添加的 `script` 才需要打标记 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

原因：

- 注入沙箱的 `script` 都是重建的，通过打标记的方式和动态创建的 `script` 关联起来
- 否则注入 `script` 之后，在应用内继续操作创建的元素，沙箱中 `script` 没有任何效果

**4. 注入 `script` 到沙箱**

为外联 `script` 添加回调函数：

- 要求：`script` 带有 `src`， `content` 为空
- 满足条件无论是 `onload` 还是 `onerror` 都会调用 `afterExecScript`

注入操作：

- 在容器中添加 `scriptElement`，使用沙箱 `window` 调用 `callback` 通知完成注入
- 通过 `execHooks` 提取并执行 `appendOrInsertElementHook`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#appendorinsertelementhook)]
- 对于内联 `script` 元素无法触发 `onload`，直接调用 `afterExecScript`

> `callback` 只能通过 `jsLoader` 配置

#### `iframeGenerator`：创建沙箱 `iframe`

目录：`iframe.ts` - `iframeGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L815)]

`js` 沙箱，来自备注：

- 创建和主应用同源的 `iframe`，路径携带了子路由的路由信息
- `iframe` 必须禁止加载 `html`，防止进入主应用的路由逻辑

参数：

- `sandbox`：应用实例，用于打补丁、绑定 `iframeReady` 用于确保沙箱初始化
- `attrs`：手动配置 `iframe` 元素属性，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#attrs)]
- `mainHostPath`：基座 `origin`
- `appHostPath`：子应用的 `origin`
- `appRoutePath`：子应用的 `pathname` + `search` + `hash`

**第一步：创建 `iframe`**

创建一个 `iframe` 元素作为沙箱，并设置属性：

| `src`          | `style`         | 属性集合 | `name` | 标记              |
| -------------- | --------------- | -------- | ------ | ----------------- |
| `mainHostPath` | `display: none` | `attrs`  | 应用名 | `WUJIE_DATA_FLAG` |

将 `iframe` 添加到 `body` 末尾，通过 `patchIframeVariable` 为沙箱 `window` 添加属性 [[查看](#patchiframevariable-为子应用-window-添加属性)]

- 来自备注：变量需要提前注入，在入口函数通过变量防止死循环。

**第二步：发起微任务**

- 发起微任务 `stopIframeLoading` 并绑定到实例属性 `iframeReady` 上 [[查看](#stopiframeloading实现一个纯净的沙箱-iframe)]
- 返回创建的沙箱 `iframe`

`iframeReady` 用于确保 `iframe` 完成初始化，因此会在下个 `fetch` 拿到结果前执行完毕：

| `importHTML` [[查看](#importhtml-加载资源)] | `processCssLoader` [[查看](#processcssloader处理-css-loader)] | `active` [[查看](#1-更新配置应用信息)] |
| ------------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| 通过 `src` 加载应用资源                     | 已完成                                                        | 已完成                                 |
| 提供 `html` 资源                            | `getEmbedHTML` 加载样式 [[查看](#getembedhtml转换样式)]       | 已完成                                 |
| 提供 `html` 资源                            | 没有静态样式，或被 `ignore`                                   | `await this.iframeReady` 确保完成      |

> 执行顺序从左到右，因为 `fetch` 既不是微任务也不是宏任务，在拿到结果前会执行已挂载的宏任务

原因：

- `stopIframeLoading` 通过 `Promise` 同步函数内部通过 `setTimeout` 发起 `resolve`
- 而 `setTimeout` 由沙箱加载状态进行递归，因此会在下一个 `fetch` 之前完成初始化

沙箱 `iframe` 的加载变化：

- `src` 从 `about:blank` 到基座 `origin`，会在 `document` 变更的第一时间 `resolve`

**`iframeReady` 都做了什么：**

发起宏任务：检测并停止加载 `iframe`

- 在 `stopIframeLoading` 中通过 `setTimeout` 观察 `document` [[查看](#stopiframeloading实现一个纯净的沙箱-iframe)]

由宏任务发起 `resolve` 添加微任务：给 `iframe` 打补丁

- 若因 `iframe` 加载导致注入的全局属性丢失，通过 `patchIframeVariable` 重新注入 [[查看](#patchiframevariable-为子应用-window-添加属性)]
- 通过 `initIframeDom` 初始化 `iframe` 的 `dom` 结构 [[查看](#initiframedom初始化-iframe-的-dom-结构)]
- 从当前 `url` 查找出是否存在应用名的 `query`，如果没有先更新沙箱的 `history`

> 通过基座 `origin` + 子应用 `pathname` 更新 `history`，为了相互通信沙箱需要和基座同域

#### `initIframeDom`：初始化 `iframe` 的 `dom` 结构

目录：`iframe.ts` - `initIframeDom` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L616)]

参数：

- `iframeWindow`：沙箱 `window`，用于：① 打补丁；② 存原生方法
- `wujie`：应用实例，用于：获取资源链接和 `degrade`
- `mainHostPath`：基座 `origin`
- `appHostPath`：子应用 `origin`

**第一步：创建新的 `html`**

- 通过 `iframeWindow` 拿到沙箱 `document`
- 通过 `window.document.implementation.createHTMLDocument` 创建一个新的空白 `html` 元素
- 如果沙箱 `iframe` 中 `html` 元素存在就是用新的 `html` 替换，否则添加到沙箱 `document`

为什么要创建一个新的 `html`：

- 因为 `initIframeDom` 之前通过 `stopIframeLoading` 检测沙箱 `document` 改变 [[查看](#stopiframeloading实现一个纯净的沙箱-iframe)]
- 沙箱 `document` 因配置了 `src`，实例化后加载基座 `origin` 完成变更
- 因此执行 `initIframeDom` 时要使用一个空白的 ` html` 去替换原先加载的页面

**第二步：注入 `iframeWindow` 全局属性**

- `__WUJIE_RAW_DOCUMENT_HEAD__`：指向沙箱 `head` 元素

在通过打补丁方式覆盖原生方法前，先记录 `Document` 几个原生的方法，分别如下：

- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR__`：`querySelector`
- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR_ALL__`：`querySelectorAll`
- `__WUJIE_RAW_DOCUMENT_CREATE_ELEMENT__`：`createElement`
- `__WUJIE_RAW_DOCUMENT_CREATE_TEXT_NODE__`：`createTextNode`

**第三步：打补丁**

- `initBase`：初始化 `base` 标签 [[查看](#base标签操作)]
- `patchIframeHistory`：劫持沙箱 `iframe` 的 `history` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)]
- `patchIframeEvents`：劫持沙箱 `iframe` 的 `EventListener` [[查看](#patchiframeevents-劫持沙箱-iframe-的-eventlistener)]
- `recordEventListeners`：如果 `degrade` 降级处理，记录 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]
- `syncIframeUrlToWindow`：监听沙箱前进后退 [[查看](#synciframeurltowindow-监听沙箱前进后退)]
- `patchWindowEffect`：修正 `iframeWindow` 的 `effect` [[查看](#patchwindoweffect修正-iframewindow-的-effect)]
- `patchDocumentEffect`：修正沙箱 `document` 的 `effect` [[查看](#patchdocumenteffect修正沙箱-document-的-effect)]
- `patchNodeEffect`：修正 `node` 的 `effect` [[查看](#patchnodeeffect修正容器节点的-effect)]
- `patchRelativeUrlEffect`：修复动态添加元素资源 [[查看](#patchrelativeurleffect修复动态添加元素资源)]

#### `base`：标签操作

目的：在沙箱 `iframe` 中添加一个 `base` 元素

- 由于容器渲染时通过 `patchElementEffect` 将每个元素 `ownerDocument` 指向沙箱 `document` [[查看](#patchrendereffect-为容器打补丁)]
- 所以需要在沙箱 `iframe` 通过 `base` 元素，修正容器中所有资源的相对链接

操作分 2 部分，即：初始化和动态更新

**`initBase` 初始化 `base` 标签**

目录：`iframe.ts` - `initBase` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L600)]

参数：

- `iframeWindow`：沙箱 `window`，用于获取沙箱 `document` 和初始化的 `href`
- `url`：子应用的入口链接

流程：

- 通过 `iframeWindow` 拿到沙箱的 `document` 并创建 `base` 元素
- 通过 `anchorElementGenerator` 创建 2 个链接元素：基座 `origin`，子应用入口链接 [[查看](#anchorelementgenerator转换-url)]
- 使用子应用 `origin` + 基座 `pathname` 作为 `base` 元素的 `href`，之后插入沙箱 `head` 中

> 初始化时沙箱 `iframe` 的链接为 `mainHostPath`：基座 `origin`，而 `pathname` 为空

**`updateBase` 动态更新 `base` 标签**

目录：`iframe.ts` - `updateBase` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L204)]

参数：

- `iframeWindow`：沙箱 `window`，用于获取沙箱 `document` 和当前的 `href`
- `appHostPath`：子应用 `origin`
- `mainHostPath`：基座 `origin`

流程：

- 通过 `new URL` 将沙箱当前的 `url` 中基座的 `origin` 替换成子应用 `origin`
- 调用 `iframe` 原生的方法查找 `base` 元素并更新 `href` 属性

> 源码中 `baseUrl.href` 即是 `appHostPath + baseUrl.pathname`，没必要算 2 次

#### `stopIframeLoading`：实现一个纯净的沙箱 `iframe`

防止运行主应用的 `js` 代码，给子应用带来很多副作用（来自备注）

目录：`iframe.ts` - `stopIframeLoading` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L644)]

参数：

- `iframeWindow`：沙箱 `window`，用于：① 获取沙箱 `document`，② 停止加载

原因：

- 子应用的 `script` 运行在一个和基座同域的 `iframe` 沙箱中
- 设置 `src` 为 `mainHostPath`，即基座 `origin` 会主动加载基座
- 所以必须在 `iframe` 实例化完成前，还没有加载完 `html` 时中断加载，防止污染子应用

来自文档的提醒 [[查看](https://wujie-micro.github.io/doc/guide/information.html#%E7%BB%86%E8%8A%82)]：

- 若沙箱没有完成实例化就 `stop`，此时链接为 `about:blank` 会导致子应用路由无法运行
- 如果沙箱实例化时采用 `document.write` 擦除，路由的同步功能将失败

流程：

- 记录沙箱 `document` 初始化时作为 `oldDoc`，此时链接是 `about:blank`
- 发起并返回微任务，`Promise` 同步函数中创建并执行函数 `loop` 作为 `document` 检测
- 在 `loop` 中发起宏任务，由于 `appendChild` 沙箱是同步操作，所以在宏任务执行前会加载沙箱 `iframe`
- 在宏任务中获取沙箱当前 `document` 和 `oldDoc` 进行比较
- 如果沙箱 `iframe` 没有完成实例化导致 `document` 不变，将重新发起一轮 `loop` 宏任务
- 直到 `iframe` 完成实例化，`document` 发生改变，停止加载并通过 `resolve` 在返回的微任务中添加队列

> 由于沙箱 `iframe` 在初始化之前已经设置不可见，所以加载过程也全程不可见

#### `syncIframeUrlToWindow` 监听沙箱前进后退

沙箱 `iframe` 中监听 `popstate` 前进后退、`hashchange` 监听 `hash` 变化，同步路由到主应用

目录：`iframe.ts` - `syncIframeUrlToWindow` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L697)]

参数：

- `iframeWindow`：沙箱 `window`，用于添加监听事件

流程：当沙箱路由发生改变通过 `syncUrlToWindow` 同步到基座 [[查看](#syncurltowindow同步子应用路由到主应用)]

调用场景：

- `patchIframeHistory`：拦截子应用路由更新，同步更新沙箱 `history` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)]
- `iframeGenerator`：沙箱初始化最后一步同步路由 [[查看](#iframegenerator创建沙箱-iframe)]
- `syncUrlToIframe`：同步路由到子应用 [[查看](#syncurltoiframe同步主应用路由到子应用)]

> 而浏览器的前进后退，以及 `url` 的变更，会导致基座重新渲染，根据情况重新启动子应用

#### `renderIframeReplaceApp`：加载 `iframe` 替换子应用

目录：`iframe.ts` - `renderIframeReplaceApp` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L799)]

参数：

- `src`：计划创建 `iframe` 的链接
- `element`：要替换的渲染容器的父级挂载点
- `degradeAttrs`：创建 `iframe` 的属性，由配置提供，见：`degrade` [[查看](#41-degrade-主动降级渲染)]

调用场景：

- 通过 `locationHrefSet` 拦截子应用 `location.href` 跳转 [[查看](#locationhrefset拦截子应用-locationhref)]
- 通过 `processAppForHrefJump` 拦截前进的链接来自第三方网页 [[查看](#processappforhrefjump-监听前进和后端)]

劫持容器和降级的 `iframe` 容器创建方式是一样的 [[查看](#创建-iframe-容器)]：

- 创建 `iframe` 元素，定义一个宽高 `100%` 的样式
- 通过 `setAttrsToElement` 为 `iframe` 添加样式、`src`、`degradeAttrs`
- 通过 `renderElementToContainer` 清空容器挂载元素，并添加 `iframe` 元素 [[查看](#renderelementtocontainer将节点元素挂载到容器)]

### 辅助方法 - 路由同步和链接处理

围绕应用中的路由、链接归纳相关方法

#### `syncUrlToWindow`：同步子应用路由到主应用

目录：`sync.ts` - `syncUrlToWindow` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L9)]

参数：

- `iframeWindow`：沙箱 `window`，用于获取：应用实例、沙箱 `location`

调用场景：

- `active` 激活应用时同步路由，见：同步路由 [[查看](#3-同步路由)]
- `syncIframeUrlToWindow`：监听沙箱 `window`：`popstate`、`hashchange` [[查看](#synciframeurltowindow-监听沙箱前进后退)]
- `patchIframeHistory`：劫持沙箱 `history`：`pushState`、`replaceState` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)]

不做处理的情况：

- 没有配置 `sync` 同步路由并且在基座链接 `search` 中找不到当前应用名

**第一步：提取配置**

- 从应用实例中获取：`sync` 同步路由、`id` 应用名、`prefix` 短链接，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]
- 提取当前的 `url` 转变为 `HTMLAnchorElement` 对象，见：`anchorElementGenerator` [[查看](#anchorelementgenerator转换-url)]
- 通过 `HTMLAnchorElement` 拿到 `queryMap`，见：`getAnchorElementQueryMap` [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]
- 从沙箱 `location` 中提取 `pathname` + `search` + `hash`，作为当前子应用目标路由 `curUrl`
- 声明一个变量 `validShortPath` 用于记录匹配的短链接名

**第二步：处理短路径**

遍历 `prefix` 拿到短链名 `shortPath` 和对应的长链接 `longPath`：

- 要求 `curUrl` 必须以 `longPath` 开头，更新 `validShortPath` 为 `shortPath`
- 更新会取最大 `longPath` 结果，例如：`/a/b/c` 会优先于 `/a/b`

**第三步：同步路由**

`sync` 已配置：

- 通过 `encodeURIComponent` 更新 `queryMap[id]` 的值为 `curUrl`
- 如果 `validShortPath` 匹配到值，优先替换 `curUrl` 中 `longPath` 部分为 `{短链名}`

> `sync` 未配置：从 `queryMap` 中删除应用对应的值

**第四步：更新路由**

- 将同步后的 `queryMap` 还原成 `url.search`，并更新 `winUrlElement` 对象
- 当 `winUrlElement` 链接发生改变，通过 `window.history.replaceState` 更新当前 `url`

#### `syncUrlToIframe`：同步主应用路由到子应用

目录：`sync.ts` - `syncUrlToIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L51)]

参数：

- `iframeWindow`：沙箱 `window`，用于获取：应用实例、沙箱 `location`、沙箱 `history`

调用场景：

- `active` 激活应用时同步路由，见：同步路由 [[查看](#3-同步路由)]

> 需要基座和应用都同步路由时，一定会先执行 `syncUrlToIframe` 同步路由到子应用

**第一步：获取配置**

- 从沙箱 `location` 中提取：`pathname`、`search`、`hash`，决定是否更新路由
- 从应用实例中获取：`id`、`url`、`sync`，`execFlag`、`prefix`，用于计算应用路由
- 从应用实例中获取：`inject` 得到基座 `origin` 为沙箱 `iframe` 更新 `history`

同步路由到子应用最终目的：

- 以资源入口链接作为初始路由：基座 `origin` + 资源入口 `pathname` + `search` + `hash`
- 但同步路由到基座有可能会通过 `prefix` 转换连接，这就要通过 `getSyncUrl` 获取资源链接 [[查看](#getsyncurl获取需要同步的-url)]

> `getSyncUrl` 会根据当前浏览的链接，提取应用对应的路由

因此对于配置 `sync` 同步路由，且 `execFlag` 应用还未启动才需要转换：

- `sync` 决定了 `syncUrlToWindow` 要不要通过 `prefix` 转换为短连接 [[查看](#syncurltowindow同步子应用路由到主应用)]
- `execFlag` 决定了当前是否为首次加载，再次加载沙箱 `iframe` 的路由已完成了转换

首次加载包括：刷新页面、切换未加载过的应用，这样得到 2 个路由：

- `preAppRoutePath`：首次加载沙箱 `location` 为基座 `origin`，计算的到的路由为 `/`
- `appRoutePath`：根据资源入口链接，得到 `pathname` + `search` + `hash`

> `appRoutePath` 将作为计划同步的路由，一旦同步，下次切换应用无需再更新路由

只有 `umd` 模式需要区分首次加载：

- `alive` 只有首次加载才需要同步路由到子应用，重建模式每次都是首次加载

通过 `getSyncUrl` 获取资源链接，有可能来自 `locationHrefSet` 路由劫持 [[查看](#locationhrefset拦截子应用-locationhref)]：

- 劫持路由会记录完整的 `url`，例如：`project={https://example.com}`
- 对于 `http` 开头的链接全部以资源入口作为链接

**第二步：比较路由进行同步**

- `appRoutePath` 需要通过 `appRouteParse` 计算得到 [[查看](#approuteparse-提取链接)]
- 比较 `preAppRoutePath` 和 `appRoutePath`，若不相等则通过沙箱 `replaceState` 更新路由

子应用路由和资源入口链接提取的路由一致的情况下，不需要更新路由：

- 首次加载沙箱的路由是 `/`，应用入口链接虽然和基座不同，但路由也有可能是 `/`
- 切换应用，沙箱链接已为：基座 `origin` + `appRoutePath`，路由都是 `appRoutePath`

#### `clearInactiveAppUrl`：清理路由

目录：`sync.ts` - `clearInactiveAppUrl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L72)]

清理子应用过期的同步参数：

- 通过 `anchorElementGenerator` 将当前的链接转换为 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- 通过 `getAnchorElementQueryMap` 将链接对象的 `search` 转化为键值对 [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]

遍历 `search` 对象所有的 `key`，作为应用名提取并筛选应用，要求：

| 应用实例 | `execFlag` | `activeFlag`                                         | `sync`   | `hrefFlag`                                     |
| -------- | ---------- | ---------------------------------------------------- | -------- | ---------------------------------------------- |
| 存在     | 已启动     | 通过 `unmount` 失活 [[查看](#1-卸载应用---所有模式)] | 同步路由 | 并非 `hrefFlag` 劫持链接 [[查看](#2-特殊属性)] |

> 将条件匹配的应用从路由中删除

筛选后转换为 `search` 更新 `HTMLAnchorElement` 对象，之后比较全局 `location.href`：

- 如果不一致 `replace` 替换 `history` 链接

调用场景：

- 仅限 `unmount` 卸载应用 [[查看](#-unmount-卸载应用)]

#### `appRouteParse` 提取链接

目录：`utils.ts` - `appRouteParse` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L122)]

参数：

- `url`：字符类型的链接

返回：根据传入的链接提取对象包含 3 个属性

- `urlElement`：通过 `anchorElementGenerator` 转换链接为 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- `appHostPath`：提取链接 `origin`
- `appRoutePath`：包含链接的 `pathname` + `search` + `hash`

调用场景有 2 个：

- 应用实例初始化，用于拆解资源入口链接用于创建沙箱和代理，见：创建沙箱 `iframe` [[查看](#3-创建沙箱-iframe)]
- `syncUrlToIframe` 同步主应用路由到子应用 [[查看](#syncurltoiframe同步主应用路由到子应用)]

#### `anchorElementGenerator`：转换 `url`

将 `url` 转换为 `HTMLAnchorElement` 对象

目录：`utils.ts` - `anchorElementGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L138)]

参数：

- `url`：链接 `string` 类型

返回：

- `HTMLAnchorElement` 对象

`syncUrlToIframe` 同步路由时可能会通过 `appRouteParse` 透传相对路径作为 `url` [[查看](#syncurltoiframe同步主应用路由到子应用)]：

- 这时创建的资源会根据沙箱中 `base` 元素决定 `href` [[查看](#base标签操作)]

#### `getAnchorElementQueryMap` 转化 `url.search` 为键值对象

目录：`utils.ts` - `getAnchorElementQueryMap` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L145)]

参数：

- `anchorElement`：`HTMLAnchorElement` 类型的对象

返回：

- `search` 键值对象：类型 `{ [key: string]: string }`

流程：

- 将链接中 `search` 按照 `&` 拆分成数组，遍历并根据 `=` 拆分成 `key` 和 `value`
- 如果 `key` 和 `value` 都存在且不为空，则作为键值对添加到对象
- 最后返回键值对象，如果没有任何匹配的键值，返回一个空对象

#### `getSyncUrl`：获取需要同步的 `url`

从基座浏览链接中提取 `search`，匹配并处理后返回当前应用路由

目录：`utils.ts` - `getSyncUrl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L221)]

参数：

- `id`：应用名，用于从 `search` 键值对中取出路由
- `prefix`：配置的短链接集合，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/sync.html#%E7%9F%AD%E8%B7%AF%E5%BE%84)]

返回字符类型的子应用路由，有 3 种情况：

- `pathname`：匹配到子应用路由
- 绝对路径的 `url`：劫持 `href` 实现的拦截路由，见：`pushUrlToWindow` [[查看](#pushurltowindow推送-url-到基座路由)]
- 空字符：没有匹配到子应用路由

提取路由：

- 通过 `anchorElementGenerator` 转换基座链接为 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- 通过 `getAnchorElementQueryMap` 转换基座链接 `search` 拿到键值对 `queryMap` [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]
- 使用应用名提取 `queryMap` 拿到子应用路由，通过 `decodeURIComponent` 解析路由

> 如果应用名不存在 `queryMap` 的键名中，拿到的是空字符

处理路由的前提是路由通过 `prefix` 替换了路由为短连接 `project={short-name}`：

- 判断依据：提供了 `prefix`，通过正则匹配路由大括号中间的短连接
- 将短连接从 `prefix` 找到对应的完整路径，替换后返回 `pathname`

> 如果因为不匹配得到空字符，是无法通过正则匹配，仍旧是空字符

存在一个语意上的 `bug`：

- 正则匹配得到短连接，如果在 `prefix` 集合中找不到对应路由怎么办？

正常加载的情况下不会出现问题，先看同步路由的流程：

| 流程                           | 执行方法                                                           | 操作                                                                                      |
| ------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 初次加载，同步路由到子应用     | `syncUrlToIframe` [[查看](#syncurltoiframe同步主应用路由到子应用)] | 假定基座路由为 `/react`                                                                   |
| 获取需要同步的路由             | `getSyncUrl` [[查看](#getsyncurl获取需要同步的-url)]               | 找不到 `search`，返回空字符                                                               |
| 回到同步路由到子应用           | `syncUrlToIframe` [[查看](#syncurltoiframe同步主应用路由到子应用)] | 因拿到空字符，采用资源入口链接作为沙箱路由                                                |
| 同步路由到基座                 | `syncUrlToWindow` [[查看](#syncurltowindow同步子应用路由到主应用)] | 假定子应用路由是 `/home/path`，短连接对应 `home`，基座路由更新为：`/react?project={home}` |
| 刷新页面，再次同步路由到子应用 | `syncUrlToIframe` [[查看](#syncurltoiframe同步主应用路由到子应用)] | 基座路由为：`/react?project={home}`                                                       |
| 获取需要同步的路由             | `getSyncUrl` [[查看](#getsyncurl获取需要同步的-url)]               | 匹配返回 `/home/path` 作为子应用路由                                                      |
| 再次同步路由到基座             | `syncUrlToWindow` [[查看](#syncurltowindow同步子应用路由到主应用)] | 基座路由 `search` 没有变化，不做更新                                                      |

由此可以看出路由中的短连接都来自 `syncUrlToWindow` 更新到基座，更新前已通过 `prefix` 匹配并提取

> 上面的例子中 `{home}` 应该通过 `endecodeURIComponent` 编译，这里为了演示直接展示了

除非手动提供错误的链接，还是上面的例子：

- 手动访问路由 `/react?project={test}`，会因 `prefix` 找不到返回字符类型的路由：`undefined`

#### `getAbsolutePath`：获取绝对路径

目录：`utils.ts` - `getAbsolutePath` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L206)]

参数：

- `url`：任意字符，包括 `url`、`pathname`、`search`、`hash`、空字符
- `base`：参考的 `url`，必须为 `http` 开头的绝对路径，必填项
- `hash`：提取 `hash`，可选 `boolean` 型

`base` 提供非 `http` 开头的路径有两种情况：

- 无效：参数 `url` 是 `http` 开头的绝对路径将忽略 `base`
- 报错：参数 `url` 是相对路径

直接返回 `url` 有 2 个情况：

- 空字符
- `hash` 为 `true`，且 `url` 以 `#` 开

其余返回，见：`defaultGetPublicPath` [[查看](#defaultgetpublicpath获取资源链接的-path)]

- `url` 作为 `entry`，且一定是字符型
- `base` 作为 `location.href`

#### `defaultGetPublicPath`：获取资源链接的 `path`

目录：`utils.ts` - `defaultGetPublicPath` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L253)]

参数：

- `entry`：类型为 `URL` 对象或 `string`，但目前只能是 `string`

补充说明：

- 因为调用场景只有 `importHTML`，透传参数 `url` 类型为 `string` [[查看](#importhtml-加载资源)]
- 在源码中有判断参数类型是否为 `object`，通过 `fetch` 分析得出来这个对象只能为 `URL`

返回：根据参数 `entry` 资源链接有 4 种不可变的情况

| `entry` 类型        | `location.href` | 返回                                     | 使用频率 |
| ------------------- | --------------- | ---------------------------------------- | -------- |
| `URL`               | 不考虑          | `/`                                      | 不使用   |
| `http` 开头绝对路径 | 不考虑          | `entry` 上级 + `/`                       | 基本是   |
| 以 `/` 开头的字符   | `http` 开头链接 | `location.origin` + `entry` 上级 + `/`   | 极少     |
| 空字符              | `http` 开头链接 | `location.origin` + `pathame` 上级 + `/` | 有错误   |

> 如果 `entry` 或 `pathname` 不存在上级，返回空字符

`entry` 存在的问题：

- `URL`类型：应返回对象链接开头到最后一个 `/`，同时保留对 `object` 的判断返回 `/`
- 提供空字符：函数本身并没有错，但会造成重复加载基座造，见：`startApp` 的 `bug` [[查看](#4-startapp-的-bug)]

通常情况下应用入口链接是完整的绝对路径，但子应用不同环境下 `origin` 不一样怎么办？

- 配置环境变量，用来区分生成环境和开发环境

返回：`entry` 是非链接、非 `/` 开头的字符，会根据 `location.pathname` 提供资源链接

| `location.pathname` | 返回                                     |
| ------------------- | ---------------------------------------- |
| 非 `/` 结尾         | `location.origin` + `entry` 上级 + `/`   |
| 以 `/` 结尾         | `location.origin` + `pathname` + `entry` |

> 只要 `entry` 不是链接，也不是非空字符，会丢弃 `location` 中的 `search` 和 `hash` 后计算资源链接

获取资源链接总结：

- 通常提供的 `entry` 是 `http` 开头的绝对路径
- 非绝对路径通常加载基座自身路由作为资源，这种情况使用路由库来处理更合适

#### 子应用中的链接指向

| 位置          | 分类                        | 链接指向                     | 补充说明                                                   |
| ------------- | --------------------------- | ---------------------------- | ---------------------------------------------------------- |
| 基座          | `window`                    | 基座所在作用域               | 按照全局 `window` 决定链接                                 |
| 基座          | 沙箱 `iframe` 的 `src` 属性 | 基座 `origin`                | 沙箱和基座同域以便相互通信                                 |
| 沙箱 `iframe` | `location`                  | 随子应用路由变化（下方总结） | 沙箱和基座同域以便相互通信                                 |
| 沙箱 `iframe` | `base` 元素                 | 子应用 `origin` + 沙箱路由   | 修正子应用中所有相对路径的资源链接 [[查看](#base标签操作)] |

沙箱 `location` 随路由变化：

| 执行函数                                                                      | 阶段                          | `location`                 |
| ----------------------------------------------------------------------------- | ----------------------------- | -------------------------- |
| `iframeGenerator` [[查看](#iframegenerator创建沙箱-iframe)]                   | 初始化                        | 基座 `origin`              |
| `syncUrlToIframe` [[查看](#syncurltoiframe同步主应用路由到子应用)]            | 同步路由到子应用              | 基座 `origin` + 子应用路由 |
| `patchIframeHistory` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)] | 劫持子应用 `history` 状态更新 | 基座 `origin` + 子应用路由 |

问题：沙箱中获取 `location`

- 假定应用入口链接为 `http://localhost:8080/pathname`，基座为 `http://localhost:3000`
- 因为沙箱和基座同域，得到结果为：`http://localhost:3000/pathname`

于是在 `proxyLocation` 中做了一次拦截，用来修正取值 [[查看](#3-代理空对象作为-proxylocation)]：

- 但 `degrade` 下沙箱的 `location` 指向沙箱 `window`，见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

`degrade` 下沙箱 `location` 和 `proxyLocation` 取值的区别：

| 相关属性和对象                                   | `proxyLocation`                                                 | 沙箱 `location`                       |
| ------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------- |
| `host`、`hostname`、`protocol`、`port`、`origin` | 按照子应用的入口资源来                                          | 按照基座来                            |
| `href`                                           | 通过 `relace` 替换成子应用 `origin`                             | 按照基座来                            |
| `replace`                                        | 通过 `relace` 替换成基座 `origin`，因为沙箱 `iframe` 和基座同域 | 按照基座来                            |
| 其他属性                                         | 从沙箱 `location` 中取                                          | 从沙箱 `location` 中取                |
| `fetch` 请求                                     | 相对路径按照 `base` 元素来补全                                  | 相对路径按照 `base` 元素来补全        |
| 配置并重写 `fetch`                               | 相对路径将通过 `proxyLocation` 来补全                           | 相对路径将通过 `proxyLocation` 来补全 |

> `fetch` 无论是通过 `base` 元素还是 `proxyLocation`，相对路径都以子应用 `origin` 来补全

### 辅助方法 - 应用动态注入 `DOM`

#### `handleStylesheetElementPatch`：为应用中动态样式打补丁

目录：`effect.ts` - `handleStylesheetElementPatch` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L64)]

参数：

- `stylesheetElement`：`style` 元素，带有属性 `_patcher` 用于存放宏任务
- `sandbox`：应用实例，用于获取 `degrade`、`shadowRoot`

不处理的情况：

- `degrade` 降级：没有 `shadowRoot`，`iframe` 容器也不存在兼容样式的问题
- 通过 `cssIgnores` 动态添加的外联样式

用途：

- 和 `WuJie` 类中的 `patchCssRules` 一样，为应用样式打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]

> 包括为什么要打补丁，以及存在的问题都参考 `patchCssRules`

不同之处：

- `patchCssRules`：获取 `shadowRoot` 下所有的内联样式打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]
- `handleStylesheetElementPatch`：只处理通过 `rewriteAppendOrInsertChild` 动态添加的样式 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

流程：

- 定义打补丁函数 `patcher`，计划作为宏任务中执行的方法
- 若元素存在 `_patcher` 属性，通过 `clearTimeout` 取消绑定的宏任务避免重复执行
- 通过 `setTimeout` 将宏任务绑定在元素的 `_patcher` 属性上

`patcher` 和 `patchCssRules` 打补丁的流程一样 [[查看](#-patchcssrules-子应用样式打补丁)]：

- 通过 `getPatchStyleElements` 从提供的 `stylesheet` 中提取指定的样式
- 若存在 `hostStyleSheetElement`：`:host` 样式元素，将其插入 `shadowRoot.head`
- 若存在 `fontStyleSheetElement`：字体样式元素，将其插入 `shadowRoot.host` 末尾
- 将属性 `_patcher` 设为 `undefined`，允许后续继续操作

调用场景有 6 处：

- `rewriteAppendOrInsertChild`：动态添加内联和外联样式 2 处 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]
- `patchStylesheetElement`：拦截样式操作有 4 处 [[查看](#patchstylesheetelement劫持处理样式元素的属性)]

单页应用动态添加样式的步骤：

1. 通过 `active` 注入资源到容器后，通过 `patchRenderEffect` 重写添加 `Dom` 的方法 [[查看](#patchrendereffect-为容器打补丁)]
2. 通过 `start` 将入口 `script` 添加到沙箱 `iframe`，开始渲染 [[查看](#-start-启动应用)]
3. 通过 `rewriteAppendOrInsertChild` 拦截动态添加的样式元素打补丁 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

动态添加样式，不同的打补丁方式：

| 分类     | 加载方式                                    | 如何打补丁                                                                       |
| -------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| 外联样式 | 加载后作为内联样式添加到容器                | `handleStylesheetElementPatch`                                                   |
| 外联样式 | 配置 `cssIgnores`，作为浏览器加载的外联样式 | 不打补丁                                                                         |
| 内联样式 | 由单页应用创建空的动态样式                  | `patchStylesheetElement` [[查看](#patchstylesheetelement劫持处理样式元素的属性)] |
| 内联样式 | 开发人员动态添加的内联样式                  | `handleStylesheetElementPatch`                                                   |

> 应用中提取的静态样式通过 `patchCssRules` 打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]

从上面可以知道动态添加样式来源 `start`，因此：

- `alive` 模式：只有首次启动会动态加载样式
- `umd` 模式：理论上和 `alive` 一样，但是存在问题，见：重复提取样式的 `bug` [[查看](#2-重复提取样式的-bug)]
- 重建模式：每次启动都会重新动态获取样式

#### `patchStylesheetElement`：劫持处理样式元素的属性

目录：`effect.ts` - `patchStylesheetElement` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L85)]

参数：

- `stylesheetElement`：`style` 元素，带有属性 `_hasPatchStyle` 用于标记是否已劫持
- `cssLoader`：插件 `cssLoader` 用于替换样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]
- `sandbox`：应用实例，用于透传给 `handleStylesheetElementPatch` [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]
- `curUrl`：透传自 `rewriteAppendOrInsertChild`，子应用 `origin` + `pathname` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

由于 `cssLoader` 是通过 `getCssLoader` 柯里化拿到的函数 [[查看](#通过配置替换资源)]：

- 所以会因没有提供插件而不做处理，但 `cssLoader` 一定是可执行的函数

不处理的情况：

- `_hasPatchStyle` 已标记，说明 `style` 元素已劫持过了
- `patchStylesheetElement` 只处理来自应用内动态添加的内联样式，除此之外的样式都不处理

劫持的属性：

- 写入操作：`innerHTML`、`innerText`、`textContent`
- 重写方法：`appendChild`
- 额外属性：`_hasPatchStyle` 用于避免重复劫持

**第一步：提取原生属性**

- 提取属性：`innerHTML`、`innerText`、`textContent`
- 通过 `patchSheetInsertRule` 重写 `stylesheetElement.sheet.insertRule`

为什么重写 `insertRule`：

- 添加 `CSSRule` 同时，将样式通过 `innerHTML` 或 `innerText` 写入 `style` 元素

因为 `umd` 模式切换应用后不会重复动态添加样式，解决办法是把样式写入元素：

- 动态添加的样式元素会记录在 `styleSheetElements` 集合 [[查看](#2-stylesheetelements-收集样式表)]
- 当切换 `umd` 模式的应用时，会通过 `rebuildStyleSheets` 恢复样式 [[查看](#-rebuildstylesheets-重新恢复样式)]

`insertRule` 兼容性：

- 现代浏览器都支持、`IE` 支持到 9，而这正是 `wujie` 理论上最低兼容版本
- 对于不兼容的浏览器将忽略操作

**第二步：劫持属性读取和写入**

包含：`innerHTML`、`innerText`、`textContent`，劫持属性的方式一致：

- `get` 操作：用原生方法获取对应的属性
- `set` 操作：
  - 用原生方法获取对应的属性执行更新
  - 更新前会通过 `cssLoader` 使用更新的样式和 `baseUrl` 进行替换
  - 通过 `nextTick` 发起一个微任务：通过 `handleStylesheetElementPatch` 打补丁 [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]

为什么 `cssLoader` 不提供样式的 `url`：

- 因为 `patchStylesheetElement` 处理的是应用内动态添加的内联样式

**第三步：重写方法 `appendChild`**

和劫持属性的方法相同：

- 通过 `nextTick` 发起一个微任务：通过 `handleStylesheetElementPatch` 打补丁 [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]
- 使用原生的方法 `appendChild` 新增元素

不同在于如果插入的样式是文本，还需要特殊处理：

- 更新前会通过 `cssLoader` 使用更新的样式和 `baseUrl` 进行替换
- 将更新后的样式插入 `style` 元素后，再次通过 `patchSheetInsertRule` 重写 `insertRule`

> 无论插入的元素是什么类型，最终都要将新增的元素返回

需要说明的是：

- 劫持样式元素的属性打补丁，每次 `handleStylesheetElementPatch` 都会提取完整的样式进行匹配
- 对于动态操作，可能会造成重复执行，但不会影响使用，见：额外说明 [[查看](https://github.com/cgfeel/zf-micro-app/blob/main/doc/wujie-umd-patch_css_rules.md#4-%E9%A2%9D%E5%A4%96%E8%AF%B4%E6%98%8E)]

#### `rewriteAppendOrInsertChild`：重写 `appendChild` 和 `insertBefore`

目录：`effect.ts` - `rewriteAppendOrInsertChild` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L158)]

接受一个 `opt` 对象，包含 2 个属性：

- `rawDOMAppendOrInsertBefore`：原生添加 `Dom` 的方法，透传自 `patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]
- `wujieId`：应用名，用于获取应用实例

添加 `Dom` 的方法：

| 重写方法                   | 提供方法              | 引用对象                                 |
| -------------------------- | --------------------- | ---------------------------------------- |
| `render.head.appendChild`  | `rawAppendChild`      | `Node.prototype.appendChild`             |
| `render.body.appendChild`  | `rawAppendChild`      | `Node.prototype.appendChild`             |
| `render.head.insertBefore` | `rawHeadInsertBefore` | `HTMLHeadElement.prototype.insertBefore` |
| `render.body.insertBefore` | `rawBodyInsertBefore` | `HTMLBodyElement.prototype.insertBefore` |

> 重写方法中的 `render` 以及提供方法，见：`patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]

`rawDOMAppendOrInsertBefore` 的类型：

- `<T extends Node>(newChild: T, refChild?: Node | null) => T;`，其中 `refChild` 为可选参数
- 这样 `refChild` 在 `appendChild` 中是无效参数，在 `insertBefore` 中是参考元素

返回函数：

- 类型和 `rawDOMAppendOrInsertBefore` 一致，但会在 `patchRenderEffect` 通过 `as` 断言纠正 [[查看](#patchrendereffect-为容器打补丁)]
- 即 `rawDOMAppendOrInsertBefore` 提供什么类型，就会断言返回的函数是什么类型

返回函数所需参数：

- `this`：用于 `TS` 指定上下文类型，见：官方文档 [[查看](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-0.html#specifying-the-type-of-this-for-functions)]
- `newChild`：添加的节点
- `refChild`：替换的节点，可选参数

执行函数返回对象：

- 按照原生方法：`appendChild`、`insertBefore` 一样，返回添加的元素
- 但是当添加的元素是 `script` 或是外联样式时，会在沙箱 `iframe` 创建注释并返回

原因在于添加元素属于上下文同步操作：

- 添加外联样式通过 `getExternalStyleSheets` 发起微任务 [[查看](#getexternalstylesheets加载样式资源)]
- 添加外联 `script` 通过 `getExternalScripts` 发起微任务 [[查看](#getexternalscripts加载-script-资源)]
- 添加内联 `script` 在 `fiber` 下通过 `requestIdleCallback` 发起宏任务
- 只有内联 `script` 且取消 `fiber` 才是同步操作，但返回的仍旧是创建的注释元素

由此得出：

| 动态添加            | `ignore` | 添加方式            | 注入后如何操作                                                                            |
| ------------------- | -------- | ------------------- | ----------------------------------------------------------------------------------------- |
| 外联和内联 `script` | 不匹配   | 加载为内联 `script` | `findScriptElementFromIframe` [[查看](#findscriptelementfromiframe查找注入沙箱的-script)] |
| 外联 `script`       | 匹配     | 创建外联 `script`   | `findScriptElementFromIframe` [[查看](#findscriptelementfromiframe查找注入沙箱的-script)] |
| 外联样式            | 匹配     | 元素不变            | 直接操作                                                                                  |
| 内联样式            | 不匹配   | 元素不变            | 直接操作                                                                                  |
| 外联样式            | 不匹配   | 加载为内联样式      | 无法关联                                                                                  |
| 其他元素            | 不匹配   | 元素不变            | 直接操作                                                                                  |

> 除了上述罗列的操作方式外，均可以通过给元素添加特定属性，来查找并操作元素

添加过程中，元素不变的情况都会执行以下操作：

- `rawDOMAppendOrInsertBefore`：调用原生方法添加元素
- `execHooks`：提取插件 `appendOrInsertElementHook`，调用时传递添加的元素和沙箱 `window`
- 按照条件返回添加的元素

> 为了便于总结将以上 3 步操作流程称为：添加元素并返回

动态添加的 `newChild` 将引用为新的对象 `element`：

- 外联元素：无论加载成功或失败，在触发加载事件后都会更新为 `null`
- 非外联的元素：通过 `rawDOMAppendOrInsertBefore` 添加到容器后，返回元素

加载外联资源失败怎么处理：

- 通过 `manualInvokeElementEvent` 发起 `error` 事件 [[查看](#manualinvokeelementevent手动触发事件回调)]

重写的方法根据添加的元素分为 5 种情况：

**1. 仅添加元素并打补丁**

- 对于 `link`、`style`、`script`、`iframe` 之外的元素全部：添加元素并返回
- 返回前将通过 `patchElementEffect` 为新增元素打补丁 [[查看](#patchelementeffect为元素打补丁)]

**2. `link`：资源元素**

`link` 元素不是样式：

- 添加元素并返回，不做其他处理
- 判定样式的 3 个条件：`rel`、`type`、链接以 `.css` 结尾

> `link` 是外联样式，将创建一个注释元素并返回

外联样式 `href` 为空或不在 `cssExcludes` 列表，返回注释前需要：

- 通过 `getExternalStyleSheets` 处理样式 [[查看](#getexternalstylesheets加载样式资源)]：
- 执行后将得到带有 `contentPromise` 微任务的样式集合，遍历集合追加微任务来添加样式

> 否则添加注释并返回不做任何处理

提供给 `getExternalStyleSheets` 参数：

- 样式集合，每个对象包含：`src` 链接、`ignore` 是否通过浏览器加载，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-ignores)]
- `fetch`：来自应用实例 `active` 打补丁后的 `fetch` [[查看](#2-动态修改-fetch)]
- `loadError`：加载失败通知，手动配置，绑定在应用实例，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/lifecycle.html#loaderror)]

`ignore` 外联样式如何添加：

- 通过 `rawDOMAppendOrInsertBefore` 将外联样式添加到容器，用浏览器加载避免跨域问题

非 `ignore` 外联样式如何加载：

- 用 `parseTagAttributes` 提取外联样式属性的键值对 `rawAttrs`
- 用沙箱 `document` 创建一个内联样式元素
- 从实例获取插件 `getCssLoader` 处理加载后的样式，将其作为内联样式的内容 [[查看](#通过配置替换资源)]
- 将内联样式插入集合 `styleSheetElements`，以便 `umd` 模式恢复样式 [[查看](#2-stylesheetelements-收集样式表)]
- 通过 `setAttrsToElement` 将属性键值对 `rawAttrs` 添加到创建的样式
- 通过 `rawDOMAppendOrInsertBefore` 将创建的样式添加到容器
- 通过 `handleStylesheetElementPatch` 为加载后的内联样式打补丁 [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]
- 通过 `manualInvokeElementEvent` 发起 `load` 事件 [[查看](#manualinvokeelementevent手动触发事件回调)]

**3. `style`：内联样式**

- 将内联样式插入集合 `styleSheetElements`，以便 `umd` 模式恢复样式 [[查看](#2-stylesheetelements-收集样式表)]
- 从实例获取插件 `getCssLoader`，只有内联样式内容不为空时才执行替换 [[查看](#通过配置替换资源)]
- 通过 `patchStylesheetElement` 劫持处理样式元素的属性 [[查看](#patchstylesheetelement劫持处理样式元素的属性)]
- 通过 `handleStylesheetElementPatch` 为动态添加的内联样式打补丁 [[查看](#handlestylesheetelementpatch为应用中动态样式打补丁)]
- 添加元素并返回

在 `React` 中先添加空的内联样式元素，然后根据情况设置元素样式内容：

- `getCssLoader` 不会处理 `React` 内应用动态添加的样式（添加元素时内容为空） [[查看](#通过配置替换资源)]
- 而是通过 `patchStylesheetElement` 拦截元素属性添加样式 [[查看](#patchstylesheetelement劫持处理样式元素的属性)]

**4. `script`：动态添加**

整体分 3 步骤：

- 通过 `setTagToScript` 为内联打标记 [[查看](#为动态添加的-script-打标记)]
- 加载 `script` 通过 `insertScriptToIframe` 注入沙箱 `iframe` [[查看](#insertscripttoiframe为沙箱插入-script)]
- 创建一个注释并返回

无论 `script` 是外联还是内联，都会插入到应用实例队列 `execQueue` 中执行：

- 提取队列长度，用于判断插入队列后是否要立即执行
- 队列中添加一个函数，将 `script` 注入沙箱，开启 `fiber` 下会包裹在 `requestIdleCallback` 执行

> 为了便于归纳，上述步骤称呼为：插入 `execQueue` 队列中执行

`insertScriptToIframe` 注入 `script` 除了提供注入的信息和沙箱 `window` 外：

- 还会将动态添加的 `script` 作为第三个参数，用于提取元素中的标签值

> 用于关联动态添加的 `script` 和注入沙箱的 `script`，见：`findScriptElementFromIframe` [[查看](#findscriptelementfromiframe查找注入沙箱的-script)]

4.1 加载外联 `script`

要求存在属性 `src`，且链接不在 `jsExcludes` 列表中，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-excludes)]

先声明一个注入 `script` 方法 `execScript`：

- 要求应用实例中沙箱 `iframe` 存在（只有注销实例沙箱才会被销毁）
- 创建 `onload` 方法，用于通过 `manualInvokeElementEvent` 发起 `load` 事件 [[查看](#manualinvokeelementevent手动触发事件回调)]
- 通过 `insertScriptToIframe` 注入 `script` [[查看](#insertscripttoiframe为沙箱插入-script)]

> 问题：注入外联 `script` 即便加载失败，也会触发 `onload`，见：3. 声明注入 `script` 的方法 [[查看](#insertscripttoiframe为沙箱插入-script)]

声明一个 `script` 属性集合 `scriptOptions`：

- 集合中的属性和 `processTpl` 提取外联 `script` 一样，但不包含：`async`、`defer` [[查看](#processtpl-提取资源)]
- 除此之外通过 `jsIgnores` 按条件添加属性 `ignore` 用于浏览器加载

`scriptOptions` 的使用流程：

- 提供给 `getExternalScripts` 处理后得到带有 `contentPromise` 的 `scriptResult` [[查看](#getexternalscripts加载-script-资源)]
- 将 `scriptResult` 提供给 `execScript`，会结合 `onload` 透传给 `insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)]

通过 `getExternalScripts` 加载 `script`，参数和动态加载外联样式一样，不同在于：

- 集合对象采用 `scriptOptions`
- 从实例中获取 `fiber` 决定是否通过 `requestIdleCallback` 空闲加载

`getExternalScripts` 提取的集合，会通过 `dynamicScriptExecStack` 发起微任务：

```
dynamicScriptExecStack = dynamicScriptExecStack.then(() =>
  scriptResult.contentPromise.then(() => {})
);
```

> 保证集合中的 `script` 以微任务队列的形式，加载完一个发起下一个加载

提取加载的 `script` 不会立即注入沙箱，而是：插入 `execQueue` 队列中执行

- 插入队列前需确保应用实例中存在 `execQueue`（只有实例注销后才会销毁）
- 队列方法中不会直接调用 `insertScriptToIframe`，而是通过 `execScript` 发起注入
- 如果注入队列前 `execQueue` 已为空，需要手动提取并执行队列

从注入 `script` 的过程也能够看出集合中没有 `asyc` 的原因：

- 如果 `ignore` 匹配的情况下作为外联 `script` 注入沙箱
- 由于 `async` 导致加载后不会提取执行下一个队列，见：`start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

应用中动态添加的外联 `script` 有 2 种情况会使用浏览器加载：

- `jsIgnores` 手动匹配，以及 `module` 类型的 `script`
- 外联 `script` 将不会包裹在 `proxy module` 中执行，见：流程图 [[查看](#wujie-中的代理)]

> 通过 `jsExcludes` 排除的外联 `script` 会作为内联 `script` 加载，但是由于没有脚本内容，导致插入的沙箱的 `script` 是一个空元素。

4.2 加载内联 `script`

流程和外联基本一致，也是：插入 `execQueue` 队列中执行

不同在于：

- 插入队列的方法会直接通过 `insertScriptToIframe` 注入 `script`，而不需要加载
- 注入方法 `insertScriptToIframe` 提供的参数不同 [[查看](#insertscripttoiframe为沙箱插入-script)]

`insertScriptToIframe` 参数：

- `script` 信息：`src` 为 `null`，`content` 内联代码，`attrs` 提取元素属性键值对
- 沙箱 `window`
- 将动态添加的 `element` 作为第 3 个参数，用于关联动态添加和注入的 `script`

> `React` 这样的单页应用，通常是入口 `script` 为静态的，注入沙箱后动态添加内联 `chunk script`

**5. `iframe`：动态添加**

根据动态添加元素的属性 `WUJIE_DATA_FLAG` 决定如何添加元素：

- 存在 `WUJIE_DATA_FLAG`：说明添加的是应用沙箱 `iframe`，追加到当前沙箱 `html` 元素末尾
- 不存在 `WUJIE_DATA_FLAG`：添加到容器 `body` 下，因为拦截的对象就是 `body` 和 `head`

> 也可以将 `iframe` 添加到容器 `head`，但是没有意义

#### `rewriteRemoveChild`：重写 `removeChild`

目录：`effect.ts` - `rewriteRemoveChild` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L367)]

接受一个 `opts` 对象，包含 2 个属性：

- `rawElementRemoveChild`：原生删除 `Dom` 的方法，透传自 `patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]
- `wujieId`：应用名，透传给 `findScriptElementFromIframe` 获取沙箱 `iframe` 和 `script` [[查看](#findscriptelementfromiframe查找注入沙箱的-script)]

> `patchRenderEffect` 提供 `rawElementRemoveChild` 时需要通过 `bind` 将上下文指向容器 `head`

返回一个方法用于重写 `removeChild`，方法需要的参数：

- `child`：删除的节点元素

重写方法返回：

| 参数类型    | 处理方式                                                                                                               | 元素不存在  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| `script`    | `findScriptElementFromIframe` 找到 `script` 删除并返回元素 [[查看](#findscriptelementfromiframe查找注入沙箱的-script)] | 返回 `null` |
| 非 `script` | `rawElementRemoveChild` 找到 `script` 删除并返回元素                                                                   | 报错        |

> `rawElementRemoveChild` 删除元素前需要确保存在于 `head` 下

设计初衷：和原生方法 `rawElementRemoveChild` 目的一样删除 `head` 下的元素

- 而应用中存在 2 个容器：存放 `script` 的沙箱容器，除了 `script` 的应用渲染容器
- 因此需要根据删除的元素，分开查找并删除

沙箱中的 `script` 全部通过 `insertScriptToIframe` 重建注入沙箱 [[查看](#insertscripttoiframe为沙箱插入-script)]：

- 没有特定属性下，应用中只能拿到动态添加的 `script` 而拿不到注入沙箱的 `script`
- 于是需要 `findScriptElementFromIframe` 根据提供的元素，找出注入沙箱的 `script` 并删除 [[查看](#findscriptelementfromiframe查找注入沙箱的-script)]

> 删除动态添加的 `script` 无论是内联还是外联，都会同时为动态添加的 `script` 和注入沙箱的 `script` 打上相同的标记，见：为动态添加的 `script` 打标记 [[查看](#为动态添加的-script-打标记)]

删除静态 `script` 的问题：

- 当注入的 `script` 提取自应用中静态 `script`，是不会打上任何标记的
- 删除元素时发现元素是 `script` 但没有标签，返回 `null` 不做任何操作

> 这个问题也存在手动添加 `script`，但是这种情况不存在通过子应用删除的场景，可以忽略

如何解决：

- 为静态 `script` 手动加上 `data-wujie-script-id` 属性，属性值建议唯一的非纯数字
- 当删除元素时，发现类型为 `script` 且存在标签，在沙箱 `head` 中找到并删除

> 属性值唯一能够准确找到元素，非数字是为了和 `setTagToScript` 默认打标签区分开来 [[查看](#为动态添加的-script-打标记)]

缺点是手动，且有侵入性：

- 在 `processTpl` 提供了参数 `postProcessTemplate` 用来更新提取的资源 [[查看](#processtpl-提取资源)]
- 但目前没有用到，且又不是 `plugin`，所以暂且还不能通过配置为静态提取的资源打标签

> `postProcessTemplate` 可能是工作人员你为后续更新留下的一个口子

#### `rewriteContains`：重写 `contains`

目录：`effect.ts` - `rewriteContains` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L355)]

接受一个 `opts` 对象，包含 2 个属性：

- `rawElementContains`：原生查找 `Dom` 的方法，透传自 `patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]
- `wujieId`：应用名，透传给 `findScriptElementFromIframe` 获取 `script` [[查看](#findscriptelementfromiframe查找注入沙箱的-script)]

> `patchRenderEffect` 提供 `rawElementContains` 时，通过 `bind` 将上下文根据重写方法来自容器 `head` 还是容器，纠正 `this` 的指向

返回一个方法用于重写 `contains`，方法需要的参数：

- `other`：查找的节点元素或 `null`

重写方法返回：

- 和原生 `rawElementContains` 一样，上下文找到元素为 `true` 否则 `false`

流程和设计初衷、查找方式、存在问题和 `rewriteRemoveChild` 一样 [[查看](#rewriteremovechild重写-removechild)]

区别在于：

| 分类   | `rewriteRemoveChild`        | `rewriteContains` |
| ------ | --------------------------- | ----------------- |
| 用途   | 删除元素                    | 检查是否包含元素  |
| 返回值 | 删除的元素，找不到为 `null` | `boolean`         |

#### `manualInvokeElementEvent`：手动触发事件回调

目录：`effect.ts` - `manualInvokeElementEvent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L51)]

参数：

- `element`：触发事件的元素，只接受 `HTMLLinkElement` 和 `HTMLScriptElement`
- `event`：事件名，目前提供的事件只有 `load` 和 `error`

> 传过来的 `element` 必须是子应用中动态添加的元素，不然就失去转发事件的意义了

调用场景：

- `rewriteAppendOrInsertChild`：动态添加元素 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

设计初衷：

- 在应用中监听 `script` 和样式加载情况时，会通过 `onload` 和 `onerror`
- 对于动态添加的元素会通过 `rewriteAppendOrInsertChild` 进行拦截 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]
- 最终注入的元素可能和动态添加的不一样，因此需要从注入的元素转发事件给动态添加的元素

> 作为子应用内部，正常监听 `onload` 和 `onerror` 即可，无需做任何改变

对于添加的元素不同，事件通知方式略有差异：

- 外联 `script`：无论是否 `ignore`，注入到沙箱后会通过 `loade` 调用 `manualInvokeElementEvent`
- 内联 `script`：忽略通知
- 外联样式 - `ignore`：直接将动态添加的样式添加到容器，加载事件不变
- 外联样式 - 非 `ignore`：加载后作为内联样式注入容器，然后调用 `manualInvokeElementEvent`
- 其他元素：忽略通知

流程：

- 通过 `CustomEvent` 定义事件，并使用 `patchCustomEvent` 劫持事件对象添加属性
- 如果动态添加的元素通过 `on` 绑定的事件，执行回调函数，否则通过 `dispatchEvent` 派发事件

`patchCustomEvent` 通过 ` Object.defineProperties` 劫持事件：

- 添加 2 个 属性：`srcElement`、`target`，全部返回动态添加的元素 `element`

#### `findScriptElementFromIframe`：查找注入沙箱的 `script`

目录：`effect.ts` - `findScriptElementFromIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L342)]

参数：

- `rawElement`：应用中动态添加的 `script`
- `wujieId`：应用名，用于获取应用实例中的沙箱 `iframe`

返回一个对象包含 2 个属性：

- `targetScript`：注入沙箱的 `script`，没有找到返回 `null`
- `iframe`：沙箱 `iframe`，作为 `script` 的容器，用于查找、删除 `script` 时使用

调用场景：

- `rewriteContains`：查找应用中是否存在元素 [[查看](#rewritecontains重写-contains)]
- `rewriteRemoveChild`：从应用中删除元素 [[查看](#rewriteremovechild重写-removechild)]

设计初衷：

- 对于动态添加的元素会通过 `rewriteAppendOrInsertChild` 进行拦截 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]
- 注入的 `script` 和动态添加的不一样，因此需要有个方法，能够查找注入沙箱的 `script`

原理：

- 通过 `setTagToScript` 为动态添加的 `script` 和最终注入的 `script` 打相同标记 [[查看](#为动态添加的-script-打标记)]

流程：

- 使用动态添加的 `script` 通过 `getTagFromScript` 获取元素上的标签 [[查看](#为动态添加的-script-打标记)]
- 使用应用名通过 `getWujieById` 获取实例中的沙箱 `iframe` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]
- 将拿到的标签在沙箱中查找并返回注入的 `script`，找不到输出警告返回 `null`

### 辅助方法 - 实用工具

#### `isConstructable`：判断函数是否可以实例化

目录：`utils.ts` - `isConstructable` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L60)]

参数：

- `fn`：任意对象，因为参数已经允许 `any` 了

返回：

- `true`：可以实例化，否则 `false`

> 判断对于不可实例化的函数，通过 `call` 绑定上下文

以下情况都将认为是可实例化的函数：

- 原型 `constructor` 指向自身的普通函数，原型除了 `constructor` 外还有其他属性
- 以大写开头的函数：`/^function\b\s[A-Z].*/`
- 以 `class` 开头的类

> 以上可以排除箭头函数，因为剪头函数没有 `prototype`，转换字符串为 `() => {}`

返回结果前需要从映射表 `fnRegexCheckCacheMap` 中获取结果：

- 查到结果不再正则匹配 `fn`，直接返回结果
- 否则将计算的结果哦保存到映射表后烦返回

#### `isCallable`：判断对象是一个函数

目录：`utils.ts` - `isCallable` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L37)]

参数：

- `fn`：任意对象

返回：

- `true`：是函数，否则 `false`

流程：

- 判断 `fn` 是一个函数，会优先从映射表 `callableFnCacheMap` 获取
- 不存在缓存则判断，是函数记录到映射表，然后返回判断结果

判断中对于老的浏览器做了兼容：

```
const naughtySafari = typeof document.all === "function" && typeof document.all === "undefined";
```

#### `isBoundedFunction`：判断通过 `Function.prototype.bind` 返回的函数

目录：`utils.ts` - `isBoundedFunction` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L50)]

参数：

- `fn`：`CallableFunction`

> 目的：判断函数是否来自 `Function.prototype.bind`，避免重复 `bind`

返回：

- 通过 `bind` 绑定的函数返回 `true`，否则 `false`

通过 `bind` 返回的函数：函数名称以 `bound ` 开头（注意有个空格），没有 `prototype`

```
function originalFunction() {}
const boundFunction = originalFunction.bind(this);

console.log(originalFunction.name);    // originalFunction
console.log(boundFunction.name);    // bound originalFunction

console.log(originalFunction.prototype);    // {}
console.log(boundFunction.prototype);    // undefined
```

流程：

- 优先从映射表 `boundedMap` 获取，不存在则判断，将结果记录到映射表并返回

判断方法：

```
const bounded = fn.name.indexOf("bound ") === 0 && !fn.hasOwnProperty("prototype");
```

只要 `bind` 过的函数都返回 `true`，包括：箭头函数、普通函数

- 但不能通过 `bind` 指定箭头函数上下文，因为箭头函数上下文取决于所在作用域的 `this`

#### `getTargetValue` 从对象中获取属性

目录：`utils.ts` - `getTargetValue` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L91)]

参数：

- `target`：源码中是 `any`，实则应该是 `{ [key: PropertyKey]: any }` 对象
- `p`：源码中是 `any`，实则应该是 `PropertyKey`

返回：

- 对象中找到的属性，没有则是 `undefined`

优先从映射表 `setFnCacheMap` 获取对象属性 [[查看](#1-setfncachemap-存储绑定上下文的方法)]：

| `setFnCacheMap` | 符合条件的函数                 | 其他                                   |
| --------------- | ------------------------------ | -------------------------------------- |
| 存在优先返回    | 不再考虑                       | 不再考虑                               |
| 不存在          | 绑定上下文后保存在映射表并返回 | 不考虑                                 |
| 不存在          | 不符合                         | 直接返回，若属性不存在返回 `undefined` |

符合的条件：

- `isCallable`：只有函数才能通过 `bind` 绑定上下文 [[查看](#iscallable判断对象是一个函数)]
- `!isBoundedFunction`：确保函数没有绑定过上下文 [[查看](#isboundedfunction判断通过-functionprototypebind-返回的函数)]
- `!isConstructable`：确保函数不可实例化，因为实例化的函数有自己的上下文 [[查看](#isconstructable判断函数是否可以实例化)]

> 补充：当函数通过 `bind` 绑定过上下文，再次 `bind` 采用首次绑定的上下文

由此得知符合条件有 2 类：

| 分类     | 绑定后上下文                    |
| -------- | ------------------------------- |
| 箭头函数 | 不受影响，保持所在作用域 `this` |
| 普通函数 | 提供的对象                      |

> 只要函数还未 `bind` 过，且不在 `isConstructable` 可实例化范围都符合要求 [[查看](#isconstructable判断函数是否可以实例化)]

为符合条件的属性绑定上下文：

- 通过 `Function.prototype.bind.call` 绑定 `target` 为函数上下文
- 将绑定后的函数保存在映射表 `setFnCacheMap`，以便下次获取
- 将原函数浅拷贝属性到绑定的方法中
- 通过 `Object.defineProperty` 为绑定的方法添加 `prototype` 指向原函数的 `prototype`

添加 `property` 意义：

- 添加原型链，见：`qiankun` 开发人员的总结 [[查看](https://github.com/kuitos/kuitos.github.io/issues/47)]

> 需要注意的是箭头函数是没有 `prototype`，所以也不需要添加原型链

浅拷贝属性是让绑定的方法和原来的方法属性一致，见下方演示：

```
function exampleFunc() {
  console.log("Hello");
}

exampleFunc.customProperty = "I am a custom property";
exampleFunc.customMethod = function() {
  console.log("I am a custom method");
};

const boundExampleFunc = Function.prototype.bind.call(exampleFunc, null);

for (const key in exampleFunc) {
  boundExampleFunc[key] = exampleFunc[key];
}

console.log(boundExampleFunc.customProperty); // "I am a custom property"
boundExampleFunc.customMethod(); // "I am a custom method"
```

关于 `bind.call` 速记方法，全部以 `call` 作为记忆点：

- `call`：立即执行提供的的方法，第一个参数指向 `this`，后面参数透传给执行方法
- `apply`：和 `call` 一样，不同的是透传的参数是以数组形式
- `bind`：可以看做将 `call` 柯里化之后返回新的函数

`Function.prototype.bind.call` 和 `bind` 一样，不同处：

- 绑定的函数为第 1 个参数，其余参数顺延依次是上下文和透传的参数
- `bind.call` 作为 `prototype` 适用于绑定不明确的函数，`bind` 适用于绑定已明确的函数

同理 `Function.prototype.bind.apply` 和 `Function.prototype.bind.call` 是一样的：

- 绑定的函数为第 1 个参数，不同在于其余的参数全部集合在一个数组中透传过去

为什么要用 `getTargetValue`：

- 此函数用于 `Proxy` 代理对象 `get` 操作时，若不提供 `get` 或 `get` 中直接返回属性会报错
- 正确的做法是从代理的原始对象中找到对应的属性并返回

错误演示：

```
// 代理不提供 `get` 方法，调用方法时报错
const proxyWindow = new Proxy(window);
proxyWindow.addEventListener;

// 直接返回属性同样也会报错
const proxyWindow = new Proxy(window, {
  get: (target, key) => target[key],
});
proxyWindow.addEventListener;
```

#### `compose` 用柯里化的方式拍平一组函数

提供一个数组函数，通过 `reduce` 拍平执行

目录：`utils.ts` - `compose` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L270)]

参数：

- `fnList`：一组执行函数

> 源码中 `fnList` 的类型是 `Array<Function>`，实际应该是 `Array<(...args: Array<string>) => string>`

返回：

- 返回一个方法，类型和 `fnList` 中的函数是一致的，确保无论如何都能执行

调用场景：

| 调用函数                                                      | 提取 `plugin`                                                                                    | 用处                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| `processCssLoader` [[查看](#processcssloader处理-css-loader)] | `cssLoader`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]   | 替换应用中提取的静态样式     |
| `importHTML` [[查看](#importhtml-加载资源)]                   | `htmlLoader`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#html-loader)] | 替换应用入口资源             |
| `getCssLoader` [[查看](#通过配置替换资源)]                    | `cssLoader`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]   | 替换手动注入和动态添加的样式 |
| `getJsLoader` [[查看](#通过配置替换资源)]                     | `jsLoader`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-loader)]     | 替换注入沙箱的 `script`      |

替换的样式和 `script` 必须是内联的：

- 外联资源传递给 `plugin` 是空字符，也可以返回 `code`，但没有意义，因为优先使用 `src` 加载资源
- 应用中的外联资源仅限手动配置 `ignore` 资源集合，默认情况外联资源会加载后作为内联资源注入

执行返回的方法将返回 `string`，提供的参数也全部是 `string`：

- `htmlLoader`：仅提供提取的资源 `html` 作为参数
- 其余的 `plugins` 将提供 3 个参数：
  - `code`：资源内容，根据 `plugin` 提供样式或 `script`
  - `src`：资源链接，如果不存在为空字符，例如：内联资源
  - `base`：子应用 `origin` + `pathname`

操作原理：

- 通过 `reduce` 将 `fnList` 数组中的函数拍平执行，初始值为提供的原始 `code`
- 这样即便 `fnList` 数组没有任何函数，也能够将原始的 `code` 返回
- 如果 `fnList` 中提供了函数，将 `code` 及其他参数传过去，返回新的值依次执行并返回最终替换结果

由于调用时，传递过来的数组仅仅是通过 `map` 过滤了 `plugins`：

- 所以 `compose` 通过 `reduce` 遍历数组时，有可能能拿到的是 `udefined`
- 对于这种情况直接返回 `code` 为下一个 `loader` 替换资源

#### 为动态添加的 `script` 打标记

应用中动态添加的 `script` 会被 `rewriteAppendOrInsertChild` 劫持，因此最终注入沙箱的 `script` 不是同一个对象。在 `wujie` 中通过打标记的方式相互关联。

**1. `setTagToScript` 添加标记**

目录：`utils.ts` - `setTagToScript` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L300)]

参数：

- `element`：`HTMLScriptElement` 元素
- `tag`：设置标记名，选填

> 使用相同的 `tag` 打标记，能够关联两个不同的 `script` 元素

流程：

- 判断 `element` 是否为 `script` 元素，是则打上标记 `WUJIE_SCRIPT_ID`
- 标记值为 `tag`，没有提供的话采用自增 `id`

通过打标记 `WUJIE_SCRIPT_ID`，方便通过：

- `getTagFromScript`：提取 `script` 中的标签，见下方详细说明
- `findScriptElementFromIframe`：查找注入沙箱的 `script` [[查看](#insertscripttoiframe为沙箱插入-script)]

调用场景，执行过程从上至下：

| 执行方法                                                                                           | 操作方式                   | 如何打标记                   |
| -------------------------------------------------------------------------------------------------- | -------------------------- | ---------------------------- |
| `rewriteAppendOrInsertChild` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)] | 拦截动态添加的 `script`    | 自增编号                     |
| `insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)]                            | 创建并注入 `script` 到沙箱 | 根据动态添加的 `script` 编号 |

> 动态添加和注入沙箱的 `script` 标签编号是一致的，原因见：`findScriptElementFromIframe` [[查看](#findscriptelementfromiframe查找注入沙箱的-script)]

不需要打标记的情况：

- 通过 `processTpl` 静态提取的 `script` [[查看](#processtpl-提取资源)]
- `start` 启动应用中，手动添加的 `script`，见：收集队列 [[查看](#1-收集队列)]

**2. `getTagFromScript` 提取 `script` 中标记值**

目录：`utils.ts` - `getTagFromScript` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L307)]

参数：

- `element`：`HTMLScriptElement` 元素

流程：

- 判断 `element` 是否为 `script` 元素，是则提取标记 `WUJIE_SCRIPT_ID`
- 不是 `script` 或属性不存在都返回 `null`

调用场景：

- `findScriptElementFromIframe`：查找动态添加的 `script` [[查看](#findscriptelementfromiframe查找注入沙箱的-script)]
- `insertScriptToIframe`：注入 `script` 到沙箱 `iframe` [[查看](#insertscripttoiframe为沙箱插入-script)]

### 映射表和队列

#### 📝 全局映射表

#### 1. `idToSandboxCacheMap`：存储无界实例和配置

目录：`common.ts` - `idToSandboxCacheMap` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L11)]

全部无界实例和配置存储 `map`（来自备注）：

- 类型：`new Map<String, SandboxCache>()`，应用名为 `key`，实例为 `SandboxCache`

`SandboxCache` 包含 2 个属性：

- `wujie`：`Wujie` 类的实例 [[查看](#wujie-应用类)]
- `options`：来自 `setupApp` 存储的配置信息，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

添加映射表有 2 个方法，分别为：

- `addSandboxCacheWithWujie`：收集 `Wujie` 实例对象，见：将实例添加到映射表 [[查看](#5-将实例添加到映射表)]
- `addSandboxCacheWithOptions`：通过 `setupApp` 收集应用配置，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

通过创建 `Wujie` 实例添加映射表有 2 个处：

- `preloadApp`：预加载，见：声明一个实例 [[查看](#2-声明一个实例)]
- `startApp`：启动应用，见：创建新的沙箱实例 [[查看](#3-创建新的沙箱实例)]

从这里可以知道：

- `preloadApp`：预加载可以极大的提升子应用首次打开速度
- `startApp`：根据配置信息和模式来决定在启动应用前是否创建实例
- `setupApp`：可以预先为 `startApp` 和 `preloadApp` 提供配置信息

> `startApp` 每次都会从映射表获取实例，但默认的重建模式下，所有实例都会通过 `destroy` 注销后重建

获取映射表的方法有 2 个：

- `getWujieById`：通过应用名获取引用实例，如果没有拿到返回 `null`
- `getOptionsById`：通过应用名获取缓存的实例配置，如果没有拿到返回 `null`

删除映射表的方法只有 1 个：

- `deleteWujieById`：会从映射表 `idToSandboxCacheMap` 中删除实例和缓存实例的配置

> 仅能通过 `destory` 销毁应用实例时才能删除映射表 [[查看](#-destroy-销毁实例)]

实例映射表在应用中具有唯一性：

- 通过 `window.__WUJIE.inject` 指向上一级映射表，见：构造函数 `inject` [[查看](#1-inject-注入子应用-3-个对象)]

#### 2. `appEventObjMap`：存储 `eventBus` 托管的事件

目录：`event.ts` - `appEventObjMap` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/event.ts#L7)]

全部事件存储 `map`（来自备注）：

- 类型：`new Map<String, EventObj>()`，实例名为 `key`，监听事件为 `EventObj`
- `key` 分两种情况：基座以时间戳字符命名、子应用以应用名命名
- `EventObj`：是一个事件集合，键名是 `event_name`，键值是监听函数集合的数组

事件映射表关联流程图（点开新窗口放大缩小查看细节）：

![eventBus](https://github.com/user-attachments/assets/be5e9b09-770f-406d-96d2-5eff0ad549ee)

获取映射表有 3 种方式：

| 获取映射表                             | 可用环境                   | 补充说明       |
| -------------------------------------- | -------------------------- | -------------- |
| `import { bus } "wujie";`              | 基座，包括子应用中的基座   | 推荐           |
| `window.$wujie.bus`                    | 子应用                     | 推荐           |
| `window.$wujie.bus`                    | 子应用中的基座             | 可以，但不推荐 |
| `window.__WUJIE.inject.appEventObjMap` | 子应用，包括子应用中的基座 | 不推荐         |

> `appEventObjMap` 的作用是映射表不同层级链路引用，作为使用者建议通过 `bus` 来处理通信

通过 `window.__POWERED_BY_WUJIE__` 判定嵌套在子应用中时，将通过 `inject` 向上引用：

- 实例中会保存 `inject` 作为链路引用，见：构造函数 `inject` [[查看](#1-inject-注入子应用-3-个对象)]
- 映射表链最底层是 `Map` 对象

> 适用于实例初始化，以及获取 `appEventObjMap` 映射表

**`EventBus` 的原理概述**

从通信方面概述原理，使用方法见：文档 [[查看](https://wujie-micro.github.io/doc/api/bus.html)]

通过 `$on` 收集订阅的事件：

- 构造函数中使用应用名作为 `key`，从映射表找出事件对象，没有则创建空对象 `{}`
- 将事件名和方法按照类型 `[event: string]: Array<Function>` 添加到 `eventObj`

通过 `$emit` 派发事件：

- 遍历整个映射表，收集事件同名的回调函数，以及所有事件都会触发的函数
- 分别遍历拿到的函数集合，透传提供通信的参数

> 如果没有提供事件名，或没有匹配到符合要求的函数集合，将输出警告

缺点：事件对象只有 1 级

- 由于子应用是通过 `inject` 注入链一级级往上找，所以无论层级，最终只会有 1 级监听对象
- 不过好在应用实例 `idToSandboxCacheMap` 也只有 1 级，实例名不能重复

可能存在的问题：

- 问题 1：事件重名造成错误订阅，例如：不同的应用都有同名事件
- 问题 2：嵌套自身作为子应用，事件订阅会造成重复监听

解决办法：

- 问题 1：监听的事件名加上应用名作为前缀，使其成为命名空间，如：`{project_name}_{event_name}`
- 问题 2：这是个无解的问题，但通常会用第三方路由做切换，而不是自我嵌套

除此之外还提供了 `props`、`window` 进行通信：

- 用于避免 `EventBus`承载过多，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/communication.html)]

不同的通信方式优缺点：

| 通信方式   | 优点                 | 定向通信     | 缺点                       |
| ---------- | -------------------- | ------------ | -------------------------- |
| `props`    | 简单、高效           | 只能指定接收 | 只能从基座向应用传数据     |
| `window`   | 灵活、无需配置       | 双向指定     | 跨站问题，会污染全局作用域 |
| `eventBus` | 强大，可指定执行机制 | 不可以       | 效率不高                   |

> `eventBus` 采用广域通信的方式，只要事件名相同就会收到消息，可以指定参数来进行区分

#### 📝 作用域下的映射表

#### 1. `setFnCacheMap` 存储绑定上下文的方法

目录：`utils.ts` - `setFnCacheMap` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L82)]

以下要求必须全部都满足：

- `isCallable`：必须是一个函数 [[查看](#iscallable判断对象是一个函数)]
- `!isBoundedFunction`：不能通过 `bind` 指定过上下文的函数 [[查看](#isboundedfunction判断通过-functionprototypebind-返回的函数)]
- `!isConstructable`：不能是可实例化的函数 [[查看](#isconstructable判断函数是否可以实例化)]

> 符合条件的函数：箭头函数、普通函数

存储类型为 `WeakMap` 的对象：

- 键名：从对象中提取的原始方法
- 键值：通过 `bind` 绑定上下文的方法

> 通过 `bind` 绑定箭头函数上下文无效，剪头函数的上下文为所在作用域的 `this`

使用场景：

- `checkProxyFunction`：添加方法到映射表
- `getTargetValue`：从对象中获取属性 [[查看](#gettargetvalue-从对象中获取属性)]

#### 2. 资源缓存集合

目录：`entry.ts` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L39)]

资源集合有 3 个，当使用重建模式时，通过资源缓存集合可以避免重复请求资源。

**`embedHTMLCache`：缓存应用入口链接资源**

类型为 `Partial<Record<string, Promise<htmlParseResult>>>`：

- 键名为资源入口链接
- 键值类型为应用静态资源信息，见：`importHTML` [[查看](#importhtml-加载资源)]

如何收集缓存：

- `importHTML`：加载资源 [[查看](#importhtml-加载资源)]

不缓存的情况：

- 通过插件配置 `htmlLoader`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#html-loader)]

应用实例中通过 `template` 缓存入口资源：

- 应用通过 `active` 激活时候记录资源，见：创建容器渲染资源 [[查看](#4-创建容器渲染资源)]
- 一样都来自 `importHTML`，不同的是 `template` 的资源已通过 `processCssLoader` 还原样式 [[查看](#processcssloader处理-css-loader)]

不同模式下缓存使用：

| 场景                  | `embedHTMLCache`             | `template`           |
| --------------------- | ---------------------------- | -------------------- |
| 初次启动应用          | `importHTML` 按条件记录      | 应用 `active` 时记录 |
| 预加载&预执行         | `importHTML` 按条件记录      | 应用 `active` 时记录 |
| `active` 预加载后启动 | 存在则使用，但不参与渲染     | 不使用               |
| `active` 模式切换     | 容器切换，不需要缓存         | 使用但不参与渲染     |
| `umd` 模式切换        | 使用 `template` 恢复，不需要 | 用于恢复容器资源     |
| 重建模式切换          | 存在则使用                   | 重新记录             |

> `alive` 预加载后资源存储在 `template` 中，启动时渲染；而切换应用时仅需挂载容器，不需要缓存

**`styleCache`：缓存外联样式资源**

类型为 `Partial<Record<string, Promise<string>|null>>`：

- 键名是提取的外联样式 `src`
- 如果获取资源成功，键值和 `fetchAssets` 返回类型一致，否则为 `null` [[查看](#fetchassets加载资源缓存后返回-promise)]

不缓存的情况：

- 配置插件 `cssExcludes` 将彻底忽略外联样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-excludes)]
- 配置插件 `cssIgnores` 将通过浏览器加载外联样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-ignores)]

> 所有符合要求的外联样式，会加载作为内联样式缓存到 `styleCache`

加载符合要求的外联样式，并缓存加载结果，包含：

- `processTpl`：提取应用内静态样式 [[查看](#processtpl-提取资源)]
- `processCssLoaderForTemplate`：手动配置应用样式 [[查看](#processcssloaderfortemplate手动添加样式)]
- `rewriteAppendOrInsertChild`：应用中动态添加样式 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

如何收集缓存：

- `getExternalStyleSheets` 匹配样式发起请求 [[查看](#getexternalstylesheets加载样式资源)]
- `fetchAssets` 处理请求，记录缓存 [[查看](#fetchassets加载资源缓存后返回-promise)]

应用实例中通过 `styleSheetElements` 缓存样式 [[查看](#2-stylesheetelements-收集样式表)]

和 `styleCache` 区别：

| 分类     | `styleCache`                                                     | `styleSheetElements`                                                               | `styleSheetElements`                              |
| -------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------- |
| 收集方法 | `getExternalStyleSheets`                                         | `rewriteAppendOrInsertChild`                                                       | `patchCssRules`                                   |
| 用处     | 处理请求，记录缓存 [[查看](#getexternalstylesheets加载样式资源)] | 动态添加样式 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)] | 打补丁 [[查看](#-patchcssrules-子应用样式打补丁)] |
| 缓存类型 | 静态样式                                                         | 动态样式                                                                           | 所有 `:root` 和字体样式                           |

缓存的使用：

- `styleCache`：通过 `processCssLoader` 还原入口资源样式后，记录在实例属性 `template` [[查看](#processcssloader处理-css-loader)]
- `styleSheetElements`：记录之后通过 `rebuildStyleSheets` 恢复样式 [[查看](#-rebuildstylesheets-重新恢复样式)]

不同模式下缓存使用：

| 场景                  | `styleCache`                 | `styleSheetElements`                 |
| --------------------- | ---------------------------- | ------------------------------------ |
| 初次启动应用          | 缓存所有外联样式             | 收集动态样式和补丁，不参与渲染       |
| 预加载&预执行         | 预加载缓存外联样式           | 预执行收集动态样式，每次渲染收集补丁 |
| `active` 预加载后启动 | 容器切换，不需要样式缓存     | 不使用                               |
| `active` 模式切换     | 容器切换，不需要样式缓存     | 不使用                               |
| `umd` 模式切换        | 使用 `template` 恢复，不需要 | 用于恢复容器样式                     |
| 重建模式切换          | 使用缓存的外联样式替换资源   | 重新记录，不参与渲染                 |

- `styleSheetElements` 仅限 `umd` 模式切换时使用，其他情况只保留记录不使用
- `styleCache` 缓存所有外联样式，包括静态提取、动态及手动添加，一旦缓存下次直接从缓存中获取

**`scriptCache`：缓存外联 `script` 资源**

类型为 `Partial<Record<string, Promise<string>|null>>`：

- 键名是提取的外联 `script` 的 `src`
- 如果获取资源成功，键值和 `fetchAssets` 返回类型一致，否则为 `null` [[查看](#fetchassets加载资源缓存后返回-promise)]

不缓存的情况：

- 配置插件 `jsExcludes` 将彻底忽略外联 `script`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-excludes)]
- 配置插件 `jsIgnores` 将通过浏览器加载外联 `script`，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#js-ignores)]

> 所有符合要求的外联 `script`，会加载作为内联 `script` 缓存到 `scriptCache`

加载符合要求的外联 `script`，并缓存加载结果，包含：

- `processTpl`：提取应用内静态 `script` [[查看](#processtpl-提取资源)]
- `start`：加载手动配置的 `script`，收集并执行队列 [[查看](#1-收集队列)]
- `rewriteAppendOrInsertChild`：应用中动态添加 `script` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]

如何收集缓存：

- `getExternalScripts` 匹配 `script` 发起请求 [[查看](#getexternalscripts加载-script-资源)]
- `fetchAssets` 处理请求，记录缓存 [[查看](#fetchassets加载资源缓存后返回-promise)]

应用实例中通过 `execQueue` 作为注入 `script` 队列，不做缓存 [[查看](#1-execqueue-应用启动执行队列)]：

- `scriptCache`：缓存所有外联 `script`
- `execQueue`：仅用于收集 `script`，提取并注入沙箱 `iframe`

`scriptCache` 和 `execQueue` 的使用都取决于应用什么时候 `start` [[查看](#-start-启动应用)]：

| 场景                  | `scriptCache`          | `execQueue`        |
| --------------------- | ---------------------- | ------------------ |
| 初次启动、预执行      | 缓存所有外联 `script`  | 收集并执行队列     |
| 预加载                | 缓存所有外联 `script`  | 不使用             |
| `active` 预加载后启动 | 外联 `script` 使用缓存 | 收集并执行队列     |
| 重建模式切换          | 外联 `script` 使用缓存 | 重新收集并执行队列 |
| 其他模式切换          | 不使用                 | 不使用             |

- `scriptCache`：仅首次加载时收集外联 `script`，包括静态提取、动态及手动添加，再次加载使用缓存
- `execQueue`：首次启动会执行收集提取队列，再次启动仅重建模式需要重新操作

> 因为 `execQueue` 随沙箱一起，只在重建模式下随应用切换销毁重建

`active` 预加载后启动会通过 `importHTML` 重复提取 `getExternalScripts`：

- 原因和解决办法见：`importHTML` - 5. 从缓存中提取资源 [[查看](#importhtml-加载资源)]

#### 📝 `Wujie` 实例中映射表和队列

常见属性初始和注销状态见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]

#### 1. `execQueue` 应用启动执行队列

队列收集来自 2 个区域：

| 所在位置                                                                                           | 用途                                             |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `rewriteAppendOrInsertChild` [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)] | 收集应用中动态添加的内联和外联 `script`，共 2 处 |
| `start` [[查看](#-start-启动应用)]                                                                 | 收集队列注入沙箱的 `script` 以及事件通知共 7 处  |

> 在单例应用中通常保留一个静态的入口 `script`，注入沙箱后动态加载 `chunk script` [[查看](#5-队列前的准备)]

**`scriptCache` 缓存外联 `script`**

`execQueue` 和 `scriptCache` 用途不一样：

- 但是他们调用场景都一样来自 `start` 启动应用，见：资源缓存集合 [[查看](#2-资源缓存集合)]

#### 2. `styleSheetElements` 收集样式表

收集应用中动态添加的样式，`:root` 以及字体样式，收集的样式以元素类型存储在集合：

- 目的为了 `umd` 模式切换应用时，通过 `rebuildStyleSheets` 恢复样式 [[查看](#-rebuildstylesheets-重新恢复样式)]

**集合收集有 3 处**

注入资源到容器后通过 `patchCssRules` 打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]：

- 仅收集容器中所有 `:root` 和字体样式

收集的样式来自 `rewriteAppendOrInsertChild` 拦截动态添加的样式 [[查看](#rewriteappendorinsertchild重写-appendchild-和-insertbefore)]：

- `link` 外联样式：下载后创建内联元素记录在集合中
- `style` 内联样式：直接记录在集合中

**`styleCache` 缓存外联样式**

`styleSheetElements` 和 `styleCache` 存在重叠的情况：

- 但他们用途不一样，调用场景也不相同，见：资源缓存集合 [[查看](#2-资源缓存集合)]

#### 3. `elementEventCacheMap` 记录降级容器事件

- 记录方法见：记录、恢复 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]
- 原理见：降级容器事件 [[查看](#elementeventcachemap降级容器事件)]

### `wujie` 中记录的事件

总结记录事件的目的和意义

#### `shadowRoot.[body|head]._cacheListeners`：容器事件

目的：`umd` 下卸载应用时清空 `head`、`body` 下的事件

- 记录：`patchEventListener`，见：`patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]
- 清除：`removeEventListener`，由应用 `unmount` 时候触发 [[查看](#-unmount-卸载应用)]
- 条件：`shadowRoot` 容器、`umd` 模式

为什么记录清空事件：

- `renderTemplateToHtml` 将资源转换为 `html` 时，会将 `head` 和 `body` 记录在应用实例 [[查看](#rendertemplatetohtml渲染-template-为-html-元素)]
- `umd` 模式切换应用时会还原实例中的 `head` 和 `body`，如果卸载时不清空事件会导致重复监听

为啥其他模式不需要：

- `alive`模式：不销毁资源、不记录事件、再次切换应用不重新注入资源、也不需要 `start`
- 重建模式：每次都重建容器、重启应用，虽也记录和清理事件，但最终都会通过 `destroy` 彻底销毁

> 除了 `umd` 模式外，只记录事件，记录的事件清理随同 `destroy` 销毁应用一同清理

为什么 `iframe` 容器不需要记录和清除：

- `degrade` 每次激活都会重建 `iframe` 容器，`iframe` 移除后事件自动销毁（来自备注）
- 相反 `iframe` 容器在 `alive` 模式或 `umd` 模式下需要记录并恢复事件，往下继续看

为什么只记录和消除 `head` 和 `body`：

- `shadowRoot` 在 `unmount` 时会清空容器、实例 `head`、实例 `body` 下所有的元素 [[查看](#-unmount-卸载应用)]

#### `elementEventCacheMap`：降级容器事件

和 `shadowRoot.[body|head]._cacheListeners` 目的正好相反：

| 记录对象               | 容器         | 记录事件用途                                       |
| ---------------------- | ------------ | -------------------------------------------------- |
| `_cacheListeners`      | `shadowRoot` | `unmount` 清理事件，避免 `active` 切换应用重复监听 |
| `elementEventCacheMap` | `iframe`     | 切换应用 `active` 时恢复记录，以便重新监听         |

流程参考：

- `active` 激活应用，见：`degrade` 主动降级渲染 [[查看](#41-degrade-主动降级渲染)]

切换应用恢复容器事件，是因为：`iframe` 移除后事件自动销毁（来自备注）

- 事件记录和恢复、适用模式，见：记录、恢复 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]
- 事件清除：每次激活时将使用新的容器代替老的的容器

> 重建模式每次启动应用都重建容器，不需要用到 `elementEventCacheMap`

为什么 `shadowRoot` 不需要记录和恢复：

| 模式    | `iframe` 容器                                              | `shadowRoot` 容器                                                |
| ------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `alive` | 重建容器，需要恢复所有事件                                 | 需要将 `shadowRoot` 重新挂载到 `el` 节点，不重建也不需要恢复事件 |
| `umd`   | 重建容器，需要为 `React 16` 及以下版本恢复 `document` 事件 | 根节点 `shadowRoot` 没变，不需要恢复事件                         |

#### `__WUJIE_EVENTLISTENER__`：转发 `window` 事件

子应用中对 `window` 上监听的事件，需转发到沙箱 `window`：

- 记录：`patchIframeEvents` [[查看](#patchiframeevents-劫持沙箱-iframe-的-eventlistener)]
- 清除：`destroy` 注销应用实例 [[查看](#-destroy-销毁实例)]
- 条件：所有模式、也不受渲染容器限制

原因：

- 应用中 `script` 包裹在模块中执行，`window` 指向 `proxyWindow`，见：`insertScriptToIframe` [[查看](#insertscripttoiframe为沙箱插入-script)]
- 执行事件回调时，需要将上下文指向沙箱 `window`

> 关于代理关系，见：`wujie` 中的代理的图谱 [[查看](#wujie-中的代理)]

`degrade` 降级时子应用 `widnow` 就是沙箱 `window`，同样也会记录事件并修正上下文，因为：

- 原生方法只能通过 `call` 来调用；
- 存在通过 `options.targetWindow` 指定上下文 [[查看](#patchiframeevents-劫持沙箱-iframe-的-eventlistener)]

#### 记录沙箱 `document` 上的事件

因为沙箱运行 `script`，而渲染在容器，同时有部分事件需要转发给基座，所以需要转发和记录关联的事件。

记录和清理：

- `patchDocumentEffect`：重写记录和清理方法，不支持 `document` 销毁前批量清理 [[查看](#patchdocumenteffect修正沙箱-document-的-effect)]

记录中包含 2 个 `WeakMap` 类型对象，键名是回调方法 `handle`，键值不同：

- `handlerCallbackMap`：如果是函数通过 `bind` 指向沙箱 `document`，否则等同 `handle`
- `handlerTypeMap`：事件类型集合，如：`click` 和 `mouseup` 回调相同，则为 `['click', 'mouseup']`

> `handle` 的类型可以是函数、也可以是包含 `handleEvent` 方法的对象

如何清理：

- 来自框架自动清理，如：`React 16` 会自动在 `document` 挂载、清理合成事件
- 手动清理自定义在 `document` 上的监听事件

> 如果没有清理手动监听在 `document` 上的事件，可能会造成内存泄露

无论是自动清理还是手动清理，`handlerTypeMap` 存在的意义就没那么必要了：

- 毕竟所有的清理方法都不是来自事件记录的对象

`handlerCallbackMap` 存在的意义：

- 记录已修正的回调对象 `handle`，使用相同的回调函数，不用重复判断是否要修正上下文

### 引入 `wujie` 包时默认就执行

全部在 `wujie` 入口文件 `index.ts` 中，当引入 `wujie` 即会立即执行，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts)]

#### `EventBus`

提供给基座与子应用通信，导出对象为 `bus`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/bus.html)]

#### `stopMainAppRun`

终止代码运行，前提条件：

- `window.__WUJIE`：说明为子应用，在沙箱 `iframe` 初始化时通过 `patchIframeVariable` 设置 [[查看](#patchiframevariable-为子应用-window-添加属性)]
- `!window.__POWERED_BY_WUJIE__`：说明此时没有通过 `start` 启动应用 [[查看](#5-队列前的准备)]

> 条件符合的情况下 `stopMainAppRun` 会输出警告，抛出异常

通常情况下子应用是不会检测全局变量的：

- 只有当子应用是基座的时候才会主动检测

`start` 启动应用注入 `script` 前一定会先更新沙箱全局变量 `__POWERED_BY_WUJIE__`：

- 更新后再注入 `script`，包括：应用入口 `script` 注入，到动态加载 `script`，到发起检测
- 正常启动下，沙箱中 `__WUJIE` 一定是存在的且 `__POWERED_BY_WUJIE__` 一定是 `true`

假设丢失了 `__POWERED_BY_WUJIE__`，并且加载过程没有捕获错误：

- 抛出的异常会直至整个应用最顶层，导致基座异常

#### `processAppForHrefJump` 监听前进和后端

整个流程围绕 3 点展开：

**1. 从 `window` 监听 `popstate`**

这就意味着监听的对象来自基座：

- 可以是最顶层的基座，也可以是作为子应用的基座，但一定不是沙箱 `iframe`
- 换个说法，当更新沙箱 `history` 后，前进后退是不会由 `processAppForHrefJump` 发起事件监听

表格中所在 `window` 列中，将由 `processAppForHrefJump` 负责监听事件：

| 方法                                                                          | 用途                                                                                   | `window`       | 沙箱 `iframe`               |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------- | --------------------------- |
| `patchIframeHistory` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)] | 重写应用中路由跳转、同步路由到基座                                                     | `replaceState` | `pushState`、`replaceState` |
| `syncIframeUrlToWindow` [[查看](#synciframeurltowindow-监听沙箱前进后退)]     | 通过 `syncUrlToWindow` 同步路由到基座 [[查看](#syncurltowindow同步子应用路由到主应用)] | `replaceState` | 无                          |
| `locationHrefSet` [[查看](#locationhrefset拦截子应用-locationhref)]           | 通过 `pushUrlToWindow` 同步路由到基座 [[查看](#pushurltowindow推送-url-到基座路由)]    | `pushState`    | 无                          |
| `constructor` [[查看](#3-创建沙箱-iframe)]                                    | 通过 `iframeGenerator` 更新沙箱 `history` [[查看](#iframegenerator创建沙箱-iframe)]    | 无             | `replaceState`              |
| `active` [[查看](#3-同步路由)]                                                | 通过 `syncUrlToIframe` 同步路由到应用 [[查看](#syncurltoiframe同步主应用路由到子应用)] | 无             | `replaceState`              |
| `active` [[查看](#3-同步路由)]                                                | 通过 `syncUrlToWindow` 同步路由到基座 [[查看](#syncurltowindow同步子应用路由到主应用)] | `replaceState` | 无                          |
| `unmount` [[查看](#-unmount-卸载应用)]                                        | 通过 `clearInactiveAppUrl` 还原基座路由 [[查看](#clearinactiveappurl清理路由)]         | `replaceState` | 无                          |

如果基座是子应用，本身就在沙箱中，前进后退看 `state` 对象来自哪里：

- 如果来自基座下的沙箱 ` history`，那么不会通过 `processAppForHrefJump` 发起监听 `popstate`
- 但应用内的路由更新会通过 `syncIframeUrlToWindow` 同步基座路由 [[查看](#synciframeurltowindow-监听沙箱前进后退)]

> 可以查看上述表格中沙箱 `iframe` 那一列，全部来自沙箱 `history`

**2. 只处理应用内的路由前进和后退**

即 `search` 中应用名保持不变，例如当前路由：`?react=/%7B%2F%7D`

| 变更路由                        | 分类             | 原因                    |
| ------------------------------- | ---------------- | ----------------------- |
| `?react=%7B%2Fabout%7D`         | 应用内路由       | 应用名 `react` 没有变化 |
| `?react=https%3A%2F%2Ftest.com` | 应用内的劫持路由 | 应用名 `react` 没有变化 |
| `?vue=/%7B%2F%7D`               | 应用外的路由     | 应用名不再是 `react`    |

> 需要说明的是 `processAppForHrefJump` 只处理应用内劫持路由，原因往下看第 3 点

比如：应用是 `react` 以劫持容器渲染，当点击基座链接切出应用后，执行后退操作

- 不会回退到上一个劫持容器页，而是上一个应用的入口页，在使用上会有割裂感

> 那这难道算不算 `bug` 吗？

原因：

- 执行后退操作，触发 `popstate` 检测后退的路由是 `http` 开头
- 执行 `renderIframeReplaceApp` 加载 `iframe` 替换子应用 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]
- 因提供的第 2 个参数挂载节点为 `null`，导致整个应用空白

为什么挂载节点是 `null`

- 当切出应用时改变了路由，导致基座组件重新渲染，原先的挂载点销毁

最终如何从空白页变为应用入口页面的：

- 当路由切换回应用时，再次重新渲染组件，按照配置重新加载应用

应用内的路由变更不也会重新渲染组件吗？

- 是的，会按照应用名和路由重新启动一遍，条件一致的情况下视觉上没有变化
- 劫持容器不能还原从 `syncUrlToIframe` 同步路由到应用的源码中也能看出来 [[查看](#syncurltoiframe同步主应用路由到子应用)]

```
  // 排除href跳转情况
  const syncUrl = (/^http/.test(idUrl) ? null : idUrl) || url;
```

被开发人员排除了，使用入口 `url` 作为了 `history`：

- 这点似乎也合理，因为劫持容器除了前进后退是无法还原应用本身的容器
- 当通过后退还原劫持容器，不明所以的人可能都不知道怎么返回最初的页面

应用内路由变化时也会因组件重新渲染销毁挂载节点：

- 但启动应用时会将新的挂载节点通过配置传过去
- 而 `processAppForHrefJump` 在恢复劫持容器时使用的挂载节点在切出应用时已销毁

如果使用非 `React` 这样单例应用，路由变更不刷新组件是不是能避免这个问题？

- 是个好想法，但这样会产生新的问题，比如路由更新后子应用没反应

**3. 只处理应用内劫持路由前进和后退**

从上诉总结可以排除以下 `popstate` 变更的情况：

- 来自沙箱 `iframe` 路由变更不触发当前操作，见上述表格 `iframe` 列
- 来自应用外的路由变更触发事件，但还原容器无效，最终由组件重新渲染重启应用
- 来自应用内的路由变更触发事件，但不在当前操作范围，下面将展开说明

以下描述将默认以：`history` 中包含劫持路由，在应用内执行前进和后退操作

- 关于劫持容器详细说明见：`locationHrefSet` [[查看](#locationhrefset拦截子应用-locationhref)]

前进或后退时做了什么：

- 通过当前的 `url` 获取 `queryMap`，见：`getAnchorElementQueryMap` [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]
- 通过 `queryMap` 筛选获取应用实例集合，遍历集合根据前进或后退重新渲染容器

2 个情况：

| 监听 | 判断依据   | 判定为劫持容器           | 否则应用内路由不操作 |
| ---- | ---------- | ------------------------ | -------------------- |
| 前进 | `queryMap` | 找到开头为 `http` 的链接 | 找到的是非链接的路由 |
| 后退 | `herfFlag` | `true`                   | `false`              |

应用内路由跳转流程：

| 应用入口页         | 应用内路由                         | `http` 开头的劫持路由     |
| ------------------ | ---------------------------------- | ------------------------- |
| 前进后退都不做处理 | --                                 | --                        |
| --                 | ⭕ 后退不处理，前进替换劫持容器 ▶️ | --                        |
| --                 | --                                 | ◀️ 只能后退，还原渲染容器 |

- 劫持容器是 `iframe` 网页，内部的链接将不再被劫持记录 `history`，因此只能后退
- 而通过基座链接切换到其他应用，后退将无法还原劫持容器，原因在上述第 2 点已说明

如何判断执行的是前进还是后退：

- 前进：执行后当前路由为 `http` 开头，而 `popstate` 到劫持容器只能前进
- 后退：`hrefFlag`，只有在劫持容器的情况下为 `true`，而劫持容器只能后退

> 关于 `hrefFlag` 见：特殊属性 [[查看](#2-特殊属性)]

不在处理范围的情况下 `history` 变更，将导致基座下加载应用的组件重新渲染：

- 由于配置信息没有变化，视觉上只看到应用内部因路由更新切换页面

> 重建模式会因路由变更重新渲染应用，如果因此看到闪屏，建议使用 `alive` 或 `umd` 模式

前进时匹配到链接为劫持的 `http` 怎么做：

| 分类                                                                                                              | `iframe` 容器 | `shadowRoot` 容器 |
| ----------------------------------------------------------------------------------------------------------------- | ------------- | ----------------- |
| `renderElementToContainer` 将容器中 `html` 元素添加到沙箱 [[查看](#renderelementtocontainer将节点元素挂载到容器)] | 执行          | 不执行            |
| `renderIframeReplaceApp` 创建 `iframe` 代替当前容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]       | 执行          | 执行              |
| 标记 `hrefFlag` 以便后退时能够返回应用                                                                            | 执行          | 执行              |

`shadowRoot` 绑定在应用实例中，`iframe` 容器只有 `document` 绑定到实例中

- 一旦容器被销毁，`iframe` 容器需要通过还原 `html` 元素恢复容器
- 因此先将 `iframe` 容器下的 `html` 元素转移到沙箱 `body` 中

> 在沙箱 `body` 中除了作为容器 `html` 元素临时存放点以外，其余情况都是空的

如果是从应用外部后退，是无法返回到劫持容器：

- 因为切出应用时之前提供容器的挂载点已销毁，无法继续挂载，将会切换到应用入口页

后退时 `hrefFlag` 存在，`shadowRoot` 容器怎么做：

- 通过 `renderElementToContainer` 将 `shadowRoot` 重新替换挂载到节点 [[查看](#renderelementtocontainer将节点元素挂载到容器)]

后退时 `hrefFlag` 存在，`iframe` 容器和降级渲染时操作一样 [[查看](#41-degrade-主动降级渲染)]：

- 通过 `initRenderIframeAndContainer` 创建 `iframe` 沙箱并挂载到指定节点 [[查看](#创建-iframe-容器)]
- 通过 `patchEventTimeStamp` 修复 `vue` 的 `event.timeStamp` 问题
- 绑定 `onunload` 到 `iframe` 容器上用于销毁时主动 `unmount` 应用
- 将之前迁移到沙箱 `body` 中的 `html` 元素添加到容器 `document` 下
- 将容器 `document` 绑定在应用实例的 `document` 上

问题：

- 因为 `locationHrefSet` 存在 `bug`，`degrade` 模式下不能劫持 `location.href` [[查看](#locationhrefset拦截子应用-locationhref)]

#### `defineWujieWebComponent` 定义自定义组件

- 当引入 `wujie` 的时候通过 `defineWujieWebComponent` 确保已定义了 `web component` 了
- 而在 `active` 中通过 `createWujieWebComponent` 会自动创建组件，无需手动引入 [[查看](#42-挂载子应用切换初始化预加载)]

> 在 `wujie` 中只能通过 `active` 自动创建 `web component`，不支持手动添加 `wujie-app` 到 `Dom tree`

#### 其他默认提供的方法

- `setupApp`：缓存配置，提供对外接口默认不执行，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]
- `destroyApp`：注销应用，对外提供的包装方法，见：文档 [[查看](https://wujie-micro.github.io/doc/api/destroyApp.html)]

除此之外会默认执行 `wujieSupport` 进行检测：

- 浏览器不支持 `Proxy` 或 `CustomElementRegistry` 输出警告，此时采用 `degrade` 模式

### `packages` - `wujie-react`

`WujieReact` 是官方提供的封装组件，和基座演示的自定义组件是一样的，见：自定义组件 [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/components/Wujie.tsx)]

- 官方只提供了 1 个组件，用于启动子应用，见：`index.js` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-react/index.js)]

**1. 属性**

静态属性：

- `propTypes`：定义组件的属性类型，用于类型检查。
- `bus`，`setupApp`，`preloadApp`，`destroyApp`：引入方法和对象，分别用于应用通信、预加载和注销

> 外部可以直接通过 `WujieReact` 这个类获取静态属性

状态和引用：

- `state`：定义 `myRef` 通过 `ref` 的方式引入 `div` 挂载节点
- `destroy` 绑定 `startApp` 启动应用后返回的注销方法

`destroy` 定义了但没有使用，如果自行扩展的话可以这样使用：

```
// 组件卸载时销毁应用
componentWillUnmount() {
  this.destroy();
}

// 也可以在需要重新启动应用时调用 `destroy`，例如在 `props` 变更时
componentDidUpdate(prevProps) {
  if(needRestart) {
    this.destroy();
    this.startApp();
  }
}
```

> 但文档中并不建议手动注销应用，如果后续还需要使用的话 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

此外还定义了 `startAppQueue`，用于发起微任务但没有使用，若要使用可以这样修改：

```
startApp = async (props) => {
  try {
    const { current: el } = this.state.myRef;
    this.destroy = await startApp({
      ...props,
      el,
    });
  } catch (error) {
    console.log(error);
  }
}

componentDidMount () {
  const list = this.props;
  list.forEach(props => {
    this.startAppQueue = this.startAppQueue.then(() => this.startApp(props))
  });
}
```

**2. 方法**

异步方法 `startApp` 用于启动子应用：

- 除了透传 `props` 作为配置以外，还需要将 `myRef` 作为应用容器挂载点

生命周期方法：

- `componentDidMount`：在组件挂载后调用 `startApp` 方法启动子应用
- `componentDidUpdate`：当组件的 `name` 或 `url` 属性发生变化时重新启动子应用

> 即使不注销应用也可以重启，在应用实例中会清空容器挂载点，然后根据配置重新挂载容器

`render` 方法：

- 定义渲染 `div` 元素，通过 `ref` 绑定在 `myRef` 中，并按照 `props` 设置宽和高

文档：

- `React` 封装组件使用 [[查看](https://wujie-micro.github.io/doc/pack/react.html)]
- 封装组件的 `props` 参考 `startApp` [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

官方 `react` 组件封装总结：

- `WujieReact` 通过 `react` 组件生命周期来管理 `wujie` 子应用
- 通过 `startApp` 方法启动子应用，并在组件更新时重新启动子应用
- 通过静态属性和类型检查确保组件的使用符合预期

> 建议手动定义组件代替官方提供的组件，因为灵活度更高
