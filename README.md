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
- 文件：`index.html` [[查看](https://github.com/cgfeel/micro-wujie-app-static/blob/main/ifram2shadow-dom.html)]
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

> 不是 `vue` 技术栈，并且封装的包是作为可选使用的单个组件，不是必须使用的

由于总结会很长，所以我将整个流程总结精简放在前面：

1. `preloadApp` 预加载（非 `alive` 模式和非预执行下的 `umd` 模式不推荐）[[查看](#preloadapp-预加载流程)]
2. `startApp` 根据实例情况决定初始化还是切换应用 [[查看](#startapp-启动流程)]
3. 首次启动和非 `alive`、`umd` 模式切换应用，要求 `destroy` 销毁后重新初始化 [[查看](#-destroy-销毁实例)]
4. 声明实例，创建沙箱 `iframe`、代理 `proxy`、通信 `EventBus` 等 [[查看](#-constructor-构造函数)]
5. `importHTML` 加载资源 [[查看](#importhtml-加载资源)]
6. `processCssLoader` 处理 `css-loader` [[查看](#processcssloader处理-css-loader)]
7. `active` 激活应用：将 `template` 根据 `degrade` 放入 `iframe` 容器或 `shadowRoot` 容器 [[查看](#-active-激活应用)]
8. `start` 启动应用：将 `script` 放入沙箱 `iframe`，发起通知事件和 `mount` [[查看](#-start-启动应用)]
9. 返回 `destroy` 以便手动销毁 [[查看](#-destroy-销毁实例)]

> 阅读建议，如果你做好准备阅读以下内容，这样可以提高效率：
>
> - “查看”指向源码链接或详细说明，记录罗列了关键内容，可以通过复制查找定位
> - 建议按照流程线去阅读，比如说：首次启动应用、切换应用、预加载应用，而不是全文阅读

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
| 优缺点                     | 强大，但功能上分工不清晰，`MicroAppElement` 处理完之后 `CreateApp` 还要做一遍对应操作，如：组件和应用分别 `mount`                                                                                 | 简单，开发者几乎不用关心 `web component` 的存在                                                                              |

加载 `WujieApp` 自定义组件方式：

- 在入口文件中直接调用 `defineWujieWebComponent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L170)]
- 当引入 `startApp` 的时候，就已经定义好了 `web component`

关于 `defineWujieWebComponent`：

目录：`shadow.ts` - `defineWujieWebComponent` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L39)]

只提供了两个方法：

- `connectedCallback`：完成挂载将自身设置为 `shadowDOM`，通过应用名获取实例 `sandbox`，将自身作为实例的 `shadowRoot`
- `disconnectedCallback`：卸载组件通过应用名获取实例 `sandbox`，并调用实例 `unmount`

在挂载组件时，将自身作为实例 `shadowRoot` 之前需要通过 `patchElementEffect` 打补丁 [[查看](#patchelementeffect为元素打补丁)]

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

- 使用应用名，通过 `getWujieById` [[源码](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L15)] 从映射表 `idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)] 获取沙箱中的实例
- 如果沙箱不存在返回 `null`

#### 1.2 获取应用配置

`getOptionsById` 获取配置信息：

- 拿应用名，从映射表 `idToSandboxCacheMap` 获取实例配置 `options`，不存在返回 `null`

`mergeOptions` 合并配置配置：

- 将 `startApp` 拿到的 `options` 和已存在实例的 `options` 合并得到新的配置信息，并结构提取必要的信息，见源文件 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L190)]

#### 2. 存在沙箱实例，切换或销毁应用

应用场景：

| 模式         | `preloadApp` 后初次加载                                                               | 切换已加载的应用         |
| ------------ | ------------------------------------------------------------------------------------- | ------------------------ |
| `alive` 模式 | 支持                                                                                  | 支持                     |
| `mount` 模式 | 由预加载时 `exec` 配置决定，没有 `start` 自然也不会 `mount` 方法挂载到 `iframeWindow` | 支持                     |
| 其他模式     | 将销毁应用后重新创建实例                                                              | 将销毁应用后重新创建实例 |

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

- `preloadApp` 预加载已经通过 `processCssLoader` [[查看](#processcssloader处理-css-loader)] 处理应用内的静态样式
- `startApp` 时无论预加载

`alive` 模式或 `umd` 模式下加载样式的场景：

- 预加载时替换应用资源通过 `active` 将 `template` 挂载到容器，待启动应用时将容器移动到指定 `el` 节点，`template` 不需要变更
- 初次启动应用通过 `active` 将 `template` 挂载到容器，下次切换应用时容器资源不变

其他模式往下看初始化应用实例

**第三步：`alive` 加载完成**

- 调用生命周期中的 `activated` 并返回子应用注销函数 `sandbox.destroy`
- 这里存在 `activated` 调用 2 次的情况，见：6.预加载中的 `bug` [[查看](#6预加载中的-bug)]

#### 2.2 `umd` 模式切换应用

通过 `umd` 切换应用的条件：

- 子应用存在 `__WUJIE_MOUNT` 方法挂载到 `window`
- 预加载时通过 `exec` 预执行后 `startApp`，或完成首次 `startApp` 后每次切换回应用

**第一步：重新加载资源**

- 卸载应用实例，见：`unmount` [[查看](#-unmount-卸载应用)]
- 重新激活应用，见：`active` [[查看](#-active-激活应用)]
- 恢复动态加载的样式，见 `rebuildStyleSheets` [[查看](#-rebuildstylesheets-重新恢复样式)]

`active` 激活应用：

- 无论是 `preloadApp` 已加载过资源，还是 `unmount` 清空资源，激活应用时都会重新将资源注入容器

`rebuildStyleSheets` 恢复样式：

- `umd` 模式切换应用后，只促发 `mount` 函数挂载应用
- 应用中动态添加的样式需要通过 `styleSheetElements` 收集并恢复 [[查看](#2-stylesheetelements-收集样式表)]
- 应用中的静态样式通过 `processCssLoader` 提取并替换资源 [[查看](#processcssloader处理-css-loader)]

**第二步：挂载应用**

和 `mount` 挂载 `umd` 模式的应用是一样的，见：`umd` 方式启动 [[查看](#1-umd-方式启动)]，主要做了 4 件事：

1. 使用沙箱的 `iframeWindow` 挂载前调用 `beforeMount`，挂载后调用 `afterMount`
2. 挂载应用，调用子应用 `__WUJIE_MOUNT`
3. 激活 `mountFlag` 表明已挂载，避免重复挂载
4. 将 `destroy` 注销方法返回

#### 2.3 `destroy` 注销应用

流程：

- 见 `WuJie` 应用类的 `destroy` 方法 [[查看](#-destroy-销毁实例)]

注销应用的场景包含：

- `umd` 首次 `startApp` 应用，包括预加载 `preloadApp` 没有 `exec` 预执行启动引用
- 非 `alive` 和 `umd` 模式的应用，无论是首次启动还是切换应用，还是预加载后再启动

所以：

- 以上场景下应用都会注销先前的实例后再重新创建实例
- 包括重新提取资源、替换资源、转变为 `html` 注入容器，挂载容器，等一系列操作
- 因此可能会导致短暂白屏的现象，要避免这种情况建议使用 `alive` 或 `umd` 模式
- 也因对于非 `alive` 模式的应用，预加载可能是一个多余的步骤，见：预加载中的 `bug` [[查看](#6预加载中的-bug)]

#### 3. 创建新的沙箱实例

这一过程和 `preloadApp` [[查看](#preloadapp-预加载流程)] 预加载应用流程是一样的：

| 流程               | 描述                                                                             | `preloadApp`                   | `startApp`                                                               |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| `addLoading`       | 启动应用时添加 `loading` [[查看](#启动应用时添加删除-loading)]                   | 不需要                         | 需要                                                                     |
| `sandbox`          | 通过 `WuJie` 声明实例，见：`constructor` [[查看](#-constructor-构造函数)]        | 需要                           | 需要                                                                     |
| `beforeLoad`       | 传递 `iframeWindow` 调用生命周期                                                 | 需要                           | 需要                                                                     |
| `importHTML`       | 提取应用资源 [[查看](#importhtml-加载资源)]                                      | 需要                           | 需要                                                                     |
| `processCssLoader` | 处理 `css-loader`，并更新已提取的资源 [[查看](#processcssloader处理-css-loader)] | 需要                           | 需要                                                                     |
| `alive`            | 激活应用 [[查看](#-active-激活应用)]                                             | 需要                           | 除了预加载提供的参数外，还包括：`sync` 同步路由、`el` 挂载容器           |
| `start`            | 启动应用 [[查看](#-start-启动应用)]                                              | 仅在提供 `exec` 预加载时才执行 | 需要                                                                     |
| `destroy`          | 返回注销方法 [[查看](#-destroy-销毁实例)]                                        | 不返回                         | 仅在 `start` 正常情况下返回，见：`bug` [[查看](#4-start-启动应用的-bug)] |

#### 4. `startApp` 的 `bug`

同样适用于 `preloadApp`，问题出现在：

- 启动或预加载应用时不提供 `name` 和 `url` 怎么处理

虽然在 `ts` 中已却明要求这两个参数必须提供：

- 但如果 `ignore` 或使用 `js` 的情况没有提供参数怎么处理

`micro-app` 中的处理方式：

- 在 `defineElement` 的 `attributeChangedCallback` 中观察 `name` 和 `url` 两个属性
- 只有都符合要求才开始挂载组件

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

- `micro-app` 预加载参考，见：`microApp.start` - 注 ⑥ [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#microappstart-%E5%90%AF%E5%8A%A8%E5%BA%94%E7%94%A8)]
- `micro-app` 预执行主要体现在沙箱对预渲染的处理，见：2.3. `WithSandBox` 默认沙箱 - 看预渲染相关部分 [[查看](https://github.com/cgfeel/micro-app-substrate?tab=readme-ov-file#23-withsandbox-%E9%BB%98%E8%AE%A4%E6%B2%99%E7%AE%B1)]

#### 6.预加载中的 `bug`

问题 1：`activated` 重复调用

- 预加载 `alive` 模式的应用，默认 `exec` 不预执行，在 `startApp` 启动应用的时候生命周期 `activated` 会调用 2 次

为什么 2 次：

- `start` 应用时 `mount` 调用 1 次
- `start` 之后返回 `destory` 前调用 1 次

问题 2：预加载逻辑问题

包含场景：

- 预加载但没有预执行的 `umd` 模式的应用
- 非 `alive` 也非 `umd` 模式的应用

试想下预加载流程：

1. 预加载一个非 `alive` 模式的应用，通过 `WuJie` 创建一个实例 [[查看](#wujie-应用类)]，并添加到映射表 `idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]
2. `startApp` 启动应用，通过 `getWujieById` 拿到应用实例，由于不是 `alive` 模式，随即销毁实例 `destroy`
3. 最后重新通过 `WuJie` 创建实例，再次激活、启动并挂载应用

问题来了：

- 上述过程中的第一步 `preloadApp` 的意义在哪里呢
- 反正都会在 `startApp` 启动应用时注销，反而是不通过 `preloadApp` 还能减少 `destory` 这一步骤

这也包括了预加载没有预执行的 `umd` 模式应用：

- 因为没有 `start` 启动应用 [[查看](#-start-启动应用)]，队列执行 `script`
- 初次 `startApp` 没有 `__WUJIE_MOUNT` 方法，同样也会 `destory` 后重新创建实例

### `Wujie` 应用类

目录：`sandbox.ts` - `Wujie` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L50)]

用于创建一个应用实例，和 `micro-app` 的 `CreateApp` 是一样的：

| 分类           | `micro-app`                                                                                               | `wujie`                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 创建实例       | `CreateApp`：应用实例                                                                                     | `Wujie`：应用实例，也是沙箱实例                                               |
| 映射表         | `appInstanceMap` 存应用实例，和组件映射表不同                                                             | `idToSandboxCacheMap` 唯一映射表，组件挂载时通过 `name` 从映射表获取实例      |
| 映射表添加方式 | `appInstanceMap.set`                                                                                      | `addSandboxCacheWithWujie` [[查看](#1-idtosandboxcachemap存储无界实例和配置)] |
| 加载资源       | 自动：构造函数调用 `loadSourceCode`                                                                       | 手动：`active` 激活应用 [[查看](#-active-激活应用)]                           |
| 启动沙箱       | 构造函数调用 `createSandbox`                                                                              | 构造函数调用 `iframeGenerator` [[查看](#iframegenerator创建沙箱-iframe)]      |
| 沙箱 `proxy`   | `proxy`、`iframe`                                                                                         | `proxy`、`iframe` [[查看](#wujie-中的代理)]                                   |
| 手动 `start`   | 不支持手动启动，通过 `mount` 挂载                                                                         | `startApp` 或 `preloadApp` 时调用应用 `start` 方法                            |
| `mount` 应用   | 自动：由组件或资源加载完毕决定，在 `mount` 中会 `start` 沙箱                                              | 不支持外部调用，由 `start` 方法通过队列执行                                   |
| `unmount` 应用 | 由组件 `disconnectedCallback` 发起                                                                        | 组件 `disconnectedCallback`、手动销毁 `destroy`                               |
| 复杂度         | 分了 3 类，组件实例：`MicroAppElement`，应用实例：`CreateApp`，沙箱实例：`IframeSandbox` 或 `WithSandBox` | 只要关心实例 `Wujie`、组件实例几乎可以忽略                                    |
| 优点           | 支持多种沙箱，多个隔离方式                                                                                | 简单，专注 `iframe` 沙箱，支持降级处理                                        |
| 缺点           | 过于复杂，从语意上看有的方法在 3 个实例上相互重叠，容易混淆；另外不支持降级处理                           | 过于零散，缺乏逻辑抽象分离，源码 `bug` 有点多                                 |

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
- 通过 `iframeGenerator` 获取沙箱 `iframe` [[查看](#iframegenerator创建沙箱-iframe)]

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

- `proxyDocument` 的差别，见：`localGenerator` - `proxyDocumennt` [[查看](#劫持空对象作为-proxydocument)]
- 代理对象的问题，见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

流程：

- 通过代理对象拿到 `proxyWindow`、`proxyDocument`、`proxyLocation`，其中降级模式没有 `proxyWindow`
- 将这些对象绑定在 `wujie` 实例中方便调用，见：代理在哪调用 [[查看](#proxywindow-在哪调用)]

#### 5. 将实例添加到映射表

在添加实例到映射表之前要将 `proxyLocation` 绑定在 `provide`，这样：

- 子应用就可以通过 `window.$wujie.location` 去调用 `proxyLocation`
- 在 `WuJie` 构造函数中 `provide` 绑定了 `bus` 和 `location`，见：实例中关键属性 [[查看](#-wujie-实例中关键属性)]

最后通过 `addSandboxCacheWithWujie` 将当前实例添加到映射表缓存起来，见：`idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]

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

| 场景                     | 容器        | `degrade` 降级 | `el` 容器挂载点 | 容器挂载位置    |
| ------------------------ | ----------- | -------------- | --------------- | --------------- |
| 预加载应用、初次启动应用 | `iframe`    | `true`         | 没有            | 沙箱 `iframe`   |
| 启动应用、每次切换应用   | `iframe`    | `true`         | 已提供          | `el` 容器挂载点 |
| 预加载应用、初次启动应用 | `shadowDom` | `false`        | 没有            | 沙箱 `iframe`   |
| 启动应用、每次切换应用   | `shadowDom` | `false`        | 已提供          | `el` 容器挂载点 |

> 每次 `active` 会根据当前情况来选择容器和挂载的节点

#### 1. 更新配置应用信息

第一步：更新配置信息

- 将 `props` 拿到的信息更新当前实例

其中 `this.replace` 需要说明下：

- 来自：`startApp`、`setupApp`、`preloadApp` 配置 `replace`，详细见文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#replace)]

用途：

- `processCssLoader`：替换应用的 `template` [[查看](#processcssloader处理-css-loader)]
- `insertScriptToIframe`：通过 `getJsLoader` 替换每一个 `script` [[查看](#insertscripttoiframe为沙箱插入-script)]
- `getCssLoader`：替换样式，包含 `rewriteAppendOrInsertChild` 和 `processCssLoaderForTemplate` [[查看](#processcssloaderfortemplate手动添加样式)]

> `getCssLoader` 不能处理子应用内置样式

`this.replace` 并非必要参数，不需要替换就不用提供：

- `replace` 的回调的参数只有 `code`，拿不到具体的类型，只能根据具体代码进行替换

第二步：等待 `iframe` 初始化 `await this.iframeReady`

过程：

- 见 `iframeGenerator` - `iframeReady` [[查看](#iframegenerator创建沙箱-iframe)]

需要等待 `iframeReady` 的场景：

- 除了 `alive` 模式和 `umd` 切换应用时 `iframeReady` 已加载完毕，其他情况都有可能需要等待
- 如果加载顺利的话，`iframeReady` 会在 `active` 之前加载完毕，见：`iframeGenerator` [[查看](#iframegenerator创建沙箱-iframe)]

> 在 `qiankun` 中有个 `frameworkStartedDefer` 和 `iframeReady` 用途是一样的，见：`startSingleSpa` [[查看](#23-startsinglespa-启动应用)]
>
> - 都是先发起一个微任务后继续执行后续流程，之后在启动应用前会等待微任务执行完毕才开始挂载应用

第三步：动态修改 `fetch`

- 替换 `fetch` 为自定义函数，在函数内部使用 `getAbsolutePath` [[查看](#getabsolutepath获取绝对路径)] 将 `url` 结合 `baseurl`
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
- `clearChild`：清空 `iframeBody`，如果提供了 `el` 容器的话
- `patchEventTimeStamp`：修复 `vue` 的 `event.timeStamp` 问题
- `onunload`：当销毁子应用时主动 `unmount` 子应用

> `onunload` 是一个废弃的方法，随时可能被浏览器弃用。这个监听方法只在 `iframe` 降级处理时存在与容器中，目的应该用于点击应用中第三方链接离开页面时注销应用。

第三步：`分支 1` - `alive` 模式下切换应用

- 恢复 `html`：将之前记录子应用的 `<html>` 替换“新容器”的 `<html>`
- 在保活场景恢复所有元素事件，见：记录、恢复 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]

第三步：`分支 2` - 非 `alive` 模式下切换应用

- 通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe)]
- `recoverDocumentListeners` 非保活场景需要恢复根节点的事件，防止 `react16` 监听事件丢失，见：记录、恢复 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]

第三步：`分支 3` - 初次渲染

- 通过 `renderTemplateToIframe` 将 `template` 注入创建 `iframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe)]

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

第二步：通过 `renderTemplateToShadowRoot` 将 `template` 渲染到 `shadowRoot` [[查看](#rendertemplatetoshadowroot-渲染资源到-shadowroot)]

第三步：通过 `patchCssRules` 为子应用样式打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]

第四步：更新 `this.provide.shadowRoot`

- `this.provide` 就是子应用中全局对象的 `$wujie`，详细见文档：全局变量 [[查看](https://wujie-micro.github.io/doc/guide/variable.html)]
- 在实例构造时通过 `iframeGenerator` 创建 `iframe` 的同时使用 `patchIframeVariable` 将其注入 `iframeWindow`

#### 激活应用的 `bug`

启动应用不提供 `el` 容器

- 虽然在 `ts` 规范里已明确要求必须提供 `el` 容器，但是如果 `ignore` 或 `js` 项目就没提供怎么办呢？

触发情况：

- 受影响：切换 `shadowDom` 容器的应用
- 不受影响：预加载、没有预加载初次启动、降级处理，会将沙箱 `iframe` 作为备用容器

解决办法：

- 和 `micro-app` 组件挂载一样做条件判断，条件不满足的情况直接返回不做任何渲染

#### 激活应用的补充

无论容器是 `iframe` 还是 `shadowRoot`，都要给容器添加属性 `WUJIE_APP_ID` 值为应用名，用途：

- 通过 `querySelector` 查找 `iframe[${WUJIE_APP_ID}="${id}"]` 找到 `iframe` 容器
- 通过自身属性 `WUJIE_APP_ID` 获取应用实例

`WUJIE_APP_ID` 定义都来自 `active` 激活应用时创建容器：

- `createIframeContainer`：创建 `iframe` 容器
- `createWujieWebComponent`：创建 `shadowRoot` 容器

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

> 注意：在这里无论是同步代码还是异步代码，所有的 `script` 都是应用中的静态 `script`，而不是动态添加的 `script`，而像 `React` 和 `Vue` 这样的 `SPA` 应用是通过动态添加的 `script`，见：`execQueue` 应用启动执行队列 [[查看](#1-execqueue-应用启动执行队列)]

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
- 为子应用全局注入 `__POWERED_BY_WUJIE__` 用于子应用是基座时，通过 `inject` 向父级获取对象 [[查看](#1-inject-注入子应用-3-个对象)]

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

触发场景：

- 只能在应用 `start` 时通过 `execQueue` 队列执行 `mount`

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

#### 📝 `unmount` 卸载应用

触发场景：

- `startApp` 切换 `umd` 模式的应用前先卸载
- `iframe` 降级处理子应用 `onunload`，例如：子应用跳转第三方页面
- `destroy` 注销应用
- `web component` 组件从 `Dom` 中卸载
- 浏览器前进后退触发子应用 `iframe` 降级容器 `onunload`

`unmount` 是存在重复触发的可能的，例如：

- 路由切换导致 `web component` 从 `Dom` 中卸载，而应用容器是 `iframe`

重写 `onunload` 事件

- 监听 `popstate` 后退，根据 `hrefFlag` [[查看](#-wujie-实例中关键属性)] 决定是否要重绘 `iframe` 触发 `onunload`

卸载流程分为 3 部分：

#### 1. 卸载应用 - 所有模式

- `activeFlag` 失活，见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- 清理路由，见 `clearInactiveAppUrl` [[查看](#clearinactiveappurl清理路由)]

#### 2. 卸载 `alive` 模式的应用

- 使用沙箱 `iframeWindow` 触发生命周期 `deactivated`

#### 3. 卸载 `umd` 模式的应用

准备卸载 `umd` 模式子应用，要求：

- `mountFlag` 已卸载不处理，见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- 子应用中不存在 `__WUJIE_UNMOUNT` 不处理
- `alive` 模式或当前的 `url` 不是来自基座不处理，见：注 n `hrefFlag` [[查看](#-wujie-实例中关键属性)]

卸载 `umd` 模式子应用：

- 使用沙箱 `iframeWindow` 触发生命周期 `beforeUnmount`
- 调用子应用挂载在 `window` 上的 `__WUJIE_UNMOUNT`
- 使用沙箱 `iframeWindow` 触发生命周期 `afterUnmount`
- `mountFlag` 失活
- `this.bus.$clear`：清空子应用所有监听的事件，见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]

非 `degrade` 主动降级 `umd` 模式补充操作：

- 这里判断 `degrade` 是因为主动降级模式下没有 `shadowRoot`
- 这里会清空 `shadowRoot` 下所有元素，并清理记录在实例 `head`、`body` 的事件

最后将实例的 `head`、`body` 下的元素全部删除

- 所有删除的元素会在下次 `active` 激活应用时，会重新注入应用资源
- 所有清空的监听记录，也会在下次 `active` 激活应用时，重新收集

#### 📝 `patchCssRules` 子应用样式打补丁

在子应用渲染完毕之后，提取子应用所有的样式，筛选挂载到外部：

1. 兼容 `:root` 选择器样式到 `:host` 选择器上
2. 将 `@font-face` 定义到 `shadowRoot` 外部

调用场景：

- `active` 中渲染到 `shadowRoot` 之后
- `rebuildStyleSheets` 在 `umd` 模式切换应用重建样式之后

不会执行操作的情况：

- `degrade` 主动降级不处理、`WUJIE_DATA_ATTACH_CSS_FLAG` 已处理过不处理

注意：

- `patchCssRules` 一定是渲染完成后调用，否则拿不到最终样式
- 在沙箱 `iframe` 提取最终样式，因为容器添加元素同时也会在沙箱 `iframe` 中添加，见：同时添加元素 [[查看](#同时添加元素)]

`patchCssRules` 存在合理的重复调用：

- 切换 `umd` 模式应用时，`active` 渲染模板之后，子应用不会再次动态添加样式，而是直接通过 `mount` 挂载应用
- 这个时候需要再次通过 `rebuildStyleSheets` 将初始化时记录的样式添加到容器中

#### 📝 `rebuildStyleSheets` 重新恢复样式

当子应用再次激活后，只运行 `mount` 函数，样式需要重新恢复。`styleSheetElements` 的样式来自 2 处，见：`styleSheetElements` [[查看](#同时添加元素)]

恢复方式：

- 遍历 `styleSheetElements` 集合，如果不存在或者为空则跳过恢复
- 根据容器决定将集合中的样式添加到 `shadowRoot` 还是 `iframe` 容器中

#### 📝 `destroy` 销毁实例

#### 1. 卸载应用

- 通过 `unmount` 卸载应用 [[查看](#-unmount-卸载应用)]
- 通过 `bus` 对象清理监听的通信，见：实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- 将实例中相关的属性设置为 `null`，见：实例中关键属性 [[查看](#-wujie-实例中关键属性)]

#### 2. 清空容器，销毁实例

- 如果容器挂载点 `el` 存在的话，通过 `clearChild` 讲其子集全部清空
- 从 `iframe` 中找到 `__WUJIE_EVENTLISTENER__` 将记录的事件清除，见：`patchIframeEvents` [[查看](#patchiframeevents-劫持沙箱-iframe-的-eventlistener)]
- 删除沙箱 `iframe` 元素
- 通过 `deleteWujieById` 从映射表中删除实例，见：`idToSandboxCacheMap` [[查看](#1-idtosandboxcachemap存储无界实例和配置)]

#### 📝 `Wujie` 实例中关键属性

#### 1. 常规属性

这里只列举部分关键的属性：

| 属性                   | 定义                                                                                                                                           | `constructor` 初始化                                                           | `destroy` 注销          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------- |
| `activeFlag`           | 实例已激活                                                                                                                                     | `undefined`，在 `active` 时为 `true`                                           | 在 `unmount` 中 `false` |
| `bus`                  | 通信对象，使用 `appEventObjMap` 获取事件映射表，通过 `inject` 实现父子应用指向同一个对象，见 `inject` [[查看](#1-inject-注入子应用-3-个对象)]  | `EventBus`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/bus.html)]  | `null`                  |
| `degrade`              | 主动降级，用 `iframe` 作为应用容器                                                                                                             | 通过配置文件在构造函数中声明                                                   | 不处理                  |
| `elementEventCacheMap` | 子应用 `dom` 监听事件留存，当降级时用于保存元素事件                                                                                            | `WeakMap`，在构造函数中通过 `iframeGenerator` 发起记录                         | `null`                  |
| `execFlag`             | `start` 应用则为 `true`                                                                                                                        | `undefined`                                                                    | `null`                  |
| `execQueue`            | `start` 应用中的任务队列                                                                                                                       | `undefined`                                                                    | `null`                  |
| `mountFlag`            | `umd` 模式挂载 `true`，卸载 `false`                                                                                                            | `undefined`                                                                    | `null`                  |
| `provide`              | 为子应用提供通信、传递数据、获取 `shadowRoot` 和子应用的 `location`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/wujie.html#wujie)] | 在构造函数里提供 `bus`、`location`，在 `active` 中提供 `props` 和 `shadowRoot` | `null`                  |
| `styleSheetElements`   | 收集应用中动态添加的样式，静态 `:root` 样式 [[查看](#2-stylesheetelements-收集样式表)]                                                         | `[]`                                                                           | `null`                  |
| `sync`                 | 单向同步路由，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#sync)]                                                      | `unndefined`，只在 `active` 时通过配置文件设置                                 | 不处理                  |
| `template`             | `string` 类型，记录通过 `processCssLoader` 处理后的资源，在 `alive` 或 `umd` 模式下切换应用时可保证资源一致性                                  | `unndefined`，只在 `active` 时候记录                                           | 不处理                  |

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
- 只有子应用内通过 `location.href` 修改当前页面链接才会拦截触法
- 由于 `locationHrefSet` 存在 `bug` [[查看](#locationhrefset拦截子应用-locationhref)]，因此仅限来自非降级模式下的子应用

用途：

- `unmount` 注销应用：`umd` 模式决定是否要通知子应用销毁 [[查看](#-unmount-卸载应用)]
- `clearInactiveAppUrl` 清理路由：也是 `unmount` 时触发 [[查看](#clearinactiveappurl清理路由)]
- `popstate` 后退时：判断是否是从 `locationHrefSet` 拦截的页面离开

**`el`：挂载容器**

通常来自配置文件设定挂载节点，但是下面情况除外：

- `preloadApp` 预加载：沙箱 `iframe` 的 `body`
- `startApp` 加载应用不提供 `el`：沙箱 `iframe` 的 `body`
- `startApp` 切换应用不提供 `el`：直接报错

属性值的更新：

- `constructor` 构建：`undefined`
- `destroy` 销毁：`null`
- `active` 激活应用：沙箱 `iframe` 的 `body`，或配置指定的 `el` 节点

用途：

- `startApp`：挂载容器 [[查看](#startapp-启动流程)]
- `preloadApp`：预加载时候将子应用临时挂载 [[查看](#preloadapp-预加载流程)]
- `locationHrefSet`：拦截跳转挂载临时 `iframe` [[查看](#locationhrefset拦截子应用-locationhref)]

### `wujie` 中的代理

#### 📝 `proxyGenerator` 非降级情况下的代理

非降级 `degrade` 情况下 `window`、`document`、`location`代理

目录：`entry.ts` - `proxyGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/proxy.ts#L40)]

参数：

- `iframe`：沙箱 `iframe`
- `urlElement`：将子应用入口链接通过 `appRouteParse` 转换成 `HTMLAnchorElement` 对象 [[查看](#approuteparse-提取链接)]
- `mainHostPath`：基座 `host`
- `appHostPath`：子应用 `host`

返回 1 对象，包含 3 个属性：

- `proxyWindow`：代理 `iframeWindow`，这个属性是降级代理 `localGenerator` 不能提供的
- `proxyDocument`：代理空对象，但是会从渲染容器和全局 `document` 中获取属性
- `proxyLocation`：代理空对象，但是会从沙箱 `location` 和子应用入口链接获取属性

#### 1. 代理 `iframeWindow` 作为 `proxyWindow`

分别对 `get`、`set`、`has` 做了代理

**`get` 操作按照获取的 `property` 返回相应对象**

返回 `proxyLocation` 对象：

- `location` [[查看](#3-代理空对象作为-proxylocation)]

返回自身 `proxyWindow` 对象：

- `self`
- `window`：获取全局 `window` 描述，如果存在 `get` 属性

从 `iframeWindow` 通过 `property` 获取对象直接返回：

- `window`：通过 `getOwnPropertyDescriptor` 获取全局 `window` 描述，不存在 `get` 属性
- 通过 `getOwnPropertyDescriptor` 从 `iframeWindow` 获取描述信息，返回的对象不可配置且不可写
- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR__`：这是初始 `iframe` 时绑定的原生方法不需要代理，见：`initIframeDom` [[查看](#initiframedom初始化-iframe-的-dom-结构)]
- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR_ALL__`：同 `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR__`
- `getTargetValue` 中所有不能缓存在映射表 `setFnCacheMap` 的属性 [[查看](#gettargetvalue-从对象中获取属性)]

其他情况：

- 这个情况 `property` 一定是函数，且不可 `isBoundedFunction` [[查看](#isboundedfunction判断-bound-函数)]，也不可 `isConstructable` [[查看](#isconstructable判断函数是否可以-new)]
- 通过 `getTargetValue` 使用 `bind.call` 将方法 `this` 指向 `iframeWindow` 返回 [[查看](#gettargetvalue-从对象中获取属性)]
- 如果 `iframeWindow` 中不存在 `property`，返回 `undefined`

**`set` 操作**

直接绑定在 `iframeWindow` 对象上：

- 但会通过 `checkProxyFunction` 对符合条件的方法缓存在映射表 `setFnCacheMap` 中
- 以便下次代理 `get` 操作时，直接从缓存表中获取

要求：

- 是函数 `isCallable` [[查看](#iscallable判断对象是一个函数)]，且不可 `isBoundedFunction` [[查看](#isboundedfunction判断-bound-函数)]，也不可 `isConstructable` [[查看](#isconstructable判断函数是否可以-new)]

缓存 `setFnCacheMap`：

- `WeakMap` 对象，键名 `property` 取出来的函数，键值一定是昂定了 `iframeWindow` 作为 `this` 的不可实例化的函数

**`has` 操作**

直接从 `iframeWindow` 判断是否存在对象，回顾一下 `get` 方法会发现：

- 除了 `self`、`window`、`location`，全部都从 `iframeWindow` 中获取
- 而 `self`、`window`、`location` 这 3 个属性在 `iframwWindow` 也依旧存在
- 因此 `get` 和 `has` 的逻辑就一致了，虽然 `get` 取值的时候不一定是从 `iframeWindow` 中获取

#### 2. 代理空对象作为 `proxyDocument`

代理的是一个空对象 `{}`，且只有 `get` 取值：

- 在 `get` 操作中，第一个对象也称为 `_fakeDocument`（假的 `document`），不会从这个对象上做任何操作

取值前的准备工作：

- 从全局 `window` 上获取：`document`
- 从应用实例上获取：`shadowRoot` 容器、`proxyLocation`
- 从 `iframeWindow` 上获取原生方法：`rawCreateElement` 创建元素、`rawCreateTextNode` 创建文本

> 在获取对象前需要确保 `shadowRoot` 已实例化，否则通过 `stopMainAppRun` 输出警告并抛出错误中断执行

**代理 `createElement` 和 `createTextNode`：**

- 代理劫持 `document` 上对的方法，并将其返回作为子应用的对应的方法

在 `Proxy` 中通过 `apply` 在调用时代理操作行为：

- 根据 `property` 决定使用 `rawCreateElement` 还是 `rawCreateTextNode`
- 执行方法时通过 `apply` 绑定 `iframe.contentDocument` 作为 `this`，透传参数 `arg`
- 为每一个生成的 `Dom` 打补丁后并返回，见：`patchElementEffect` [[查看](#patchelementeffect为元素打补丁)]

备注：

- 在应用中所有的 `createElement`、`createTextNode` 都会通过沙箱 `iframe`
- 而 `appendChild`、`insertBefore` 都会通过 `shadowRoot`
- 这是因为创建元素时需要通过 `patchElementEffect` 打补丁，而最终是要在 `shadowRoot` 容器中挂载

**代理 `documentURI` 和 `URL`：**

- 返回 `proxyLocation` 的 `href`

**代理：通过标签获取元素**

- 包含：`getElementsByTagName`、`getElementsByClassName`、`getElementsByName`
- 返回：劫持 `shadowRoot.querySelectorAll`
- 在返回的方法中通过 `apply` 去处理子应用获取代理方法后，作为处理执行结果并返回

如果上下文 `this` 不是 `iframe.contentDocument`：

- 直接从上下文中获取元素

如果 `getElementsByTagName` 获取所有的 `script`：

- 返回 `iframe.contentDocument.scripts`，因为所有的 `script` 存放在沙箱 `iframe` 中

其他情况全部在 `shadowRoot` 获取，但是获取前需要转换下参数：

- `getElementsByTagName`：不需要处理
- `getElementsByClassName`：转换成 `.{$arg}`
- `getElementsByName`：转换成 `[name="${arg}"]`

**代理：`getElementById`**

- 返回：劫持 `shadowRoot.querySelector`
- 在返回的方法中通过 `apply` 去处理子应用获取代理方法后，作为处理执行结果并返回

如果上下文 `this` 不是 `iframe.contentDocument`：

- 直接从上下文中获取元素

否则：

- 转换参数匹配 `querySelector` 去查询
- 优先从 `shadowRoot` 去查询，找不到再去沙箱 `iframe` 中查询，因为获取的有可能是 `script`

**代理：查询方法**

- 包含：`querySelector`、`querySelectorAll`
- 返回：通过 `shadowRoot` 劫持对应方法
- 在返回的方法中通过 `apply` 去处理子应用获取代理方法后，作为处理执行结果并返回

如果上下文 `this` 不是 `iframe.contentDocument`：

- 直接从上下文中获取元素

否则：

- 优先从 `shadowRoot` 查询
- 查询不到再去沙箱 `iframe` 中插叙
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

- 如果 `property` 是 `activeElement`，且 `shadowRoot` 找不到的情况下返回 `shadowRoot.body`
- 其他一律从 `shadowRoot` 中招对应的属性返回

`shadowMethods`：

- 通过 `getTargetValue` 优先从 `shadowRoot` 获取，否者从全局 `document` 中获取 [[查看](#gettargetvalue-从对象中获取属性)]

`documentProperties`：

- 直接从全局 `document` 中获取

`documentMethods`：

- 通过 `getTargetValue` 从全局 `document` 中获取 [[查看](#gettargetvalue-从对象中获取属性)]

#### 3. 代理空对象作为 `proxyLocation`

代理的是一个空对象 `{}`，在 `get` 和 `set` 中：

- 第一个对象也称为 `_fakeDocument`（假的 `document`），不会从这个对象上做任何操作
- 因此所有 `location` 从 `iframe.contentWindow.location` 来获取
- 在沙箱 `iframe` 初始化之前已将 `location` 设为和基座同域

拦截的方法：

- `get`：取值
- `set`：赋值
- `ownKeys`：枚举所有属性
- `getOwnPropertyDescriptor` 获取描述信息

**`get` 取值**

- 读取子应用中 `location` 对象所有属性和方法时拦截

**从子应用入口链接获取信息，包含：**

- `host`、`hostname`、`protocol`、`port`、`origin`

**获取 `href`：**

- 获取沙箱 `iframe` 的 `location.href`，返回之前要用主应用的 `host` 替换为子应用的 `host`
- 因为 `iframe` 的 `host` 和基座同域，在子应用中的 `href` 要和子应用的 `host` 对齐

**屏蔽 `reload` 的 `bug`：**

- 毕竟辛苦加载的 `script`，不能因为 `replad` 清空了
- 一旦 `reload` 子应用会因为自身的 `src` 是基座的 `host` 重新加载基座造成错误
- 但同时也阉割子应用 `reload` 功能，正确的做法应该是转发自全局 `window.reload`

**处理 `replace` 的 `bug`**

先解读流程：

- 获取沙箱 `iframe` 的 `location.replace` 通过 `call` 将 `this` 指向 `iframe` 的 `location`
- 处理之前会将子应用的 `host` 替换为基座 `host`

`replace` 的条件：

- 只处理带有基座 `host` 的绝对路径，只拦截 `location.replace` 不拦截 `history.replace`
- 而对于 `spa` 应用来说通常是由 `history` 来负责做这件事，也很少人会将完整的 `url` 进行跳转，毕竟线上线下 `host` 不一样

问题：

- 拦截后所有链接跳转是在沙箱 `iframe` 下进行的
- 假定 `replace` 跳转到子应用首页，那么最终会导致沙箱 `iframe` 链接跳转到基座首页，从而引发问题
- 这个问题我在 `vue` 子应用中复现了，见路由页面 `/about` [[查看](https://github.com/cgfeel/micro-wujie-app-vue3)]

怎么修复：

- 开发人员可能需要用到的是 `history` 上的 `replace`，如下演示
- 而子应用的 `history` 在沙箱 `iframe` 初始化时已经打补丁了，见：`patchIframeHistory` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)]

```
iframeWindow.history.replaceState(null, "", args[0])
```

**其他情况**

- 通过 `getTargetValue` 直接从 `iframe` 中的 `location` 中获取 [[查看](#gettargetvalue-从对象中获取属性)]

**`set` 赋值**

赋值会绑定新的值到沙箱 `location` 对应的 `property` 上，但 `href` 除外

**`href` 赋值操作**

方法：

- 拦截操作并通过 `locationHrefSet` 创建一个新的 `iframe` 代替渲染容器 [[查看](#locationhrefset拦截子应用-locationhref)]

结果：

- 用 `iframe` 替换子应用容器，并更新当前 `url` 中对应的 `search`
- 由于拦截的很直接粗暴，并没有考虑页面适配，切换会很突兀，需要使用者自行适配

这么做的意图可能是：

- 出于 `spa` 的考量，所有链接都是基座的子应用，哪怕跳到第三方页面也不能离开基座
- 比如说后台管理，子应用中有个第三方查快递的跳转链接，通常情况可能就跳转走了，但是在 `wujie` 中，第三方查快递的网站也是基座的子应用

**`ownKeys` 枚举所有属性**

- 从沙箱 `iframe` 的 `location` 中获取所有 `property`，但不包括 `reload`

**`getOwnPropertyDescriptor` 获取描述信息**

返回信息包含有：

- `enumerable`：可枚举
- `configurable`：可配置
- `writable`：不可写，自动补全
- `value`：很有可能拿到 `undefined`

关于 `value` 的 `bug`：

- 这里通过 `this` 取值，而 `this` 是 `fake` 空对象 `{}`，所以有可能是 `undefined`
- 当然空对象也有原型链，例如：`toString` 是可以拿到的，但这就和 `location` 无关了

#### 📝 `localGenerator` 降级情况下的代理

降级情况下`document`、`location`代理处理

目录：`proxy.ts` - `localGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/proxy.ts#L261)]

参数：

- `iframe`：沙箱 `iframe`
- `urlElement`：将子应用入口链接通过 `appRouteParse` 转换成 `HTMLAnchorElement` 对象 [[查看](#approuteparse-提取链接)]
- `mainHostPath`：基座 `host`
- `appHostPath`：子应用 `host`

返回 1 对象，包含 2 个属性：

- `proxyDocument`：代理空对象，但是会从渲染容器和全局 `document` 中获取属性
- `proxyLocation`：代理空对象，但是会从沙箱 `location` 和子应用入口链接获取属性

> 由于降级采用 `iframe` 作为容器，子应用的 `window` 指向 `iframe`，不需额外代理

#### 劫持空对象作为 `proxyDocument`

和 `proxyGenerator` 相同，见：`proxyGenerator` - `proxyDocument` [[查看](2-代理空对象作为-proxydocument)]

- 创建元素和文本：`createElement`、`createTextNode`
- 代理 `documentURI` 和 `URL`
- `getElementsByTagName`：通过标签获取元素集合，包含获取 `script` 集合
- `getElementById`：通过 `id` 获取元素，先容器再沙箱

和 `proxyGenerator` 不同：

- `proxyGenerator` 通过 `Proxy` 拦截对象做代理
- `locationHrefSet` 通过 `Object.defineProperties` 劫持空对象做代理
- `documentProxyProperties` 见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L42)]

`documentProxyProperties` 的处理：

- 遍历集合罗列的属性，劫持并通过容器 `iframe` 查找对应的属性
- 如果是可执行的方法，绑定 `this` 为容器 `iframe` 并返回，否则直接返回属性

不需要考虑的属性：

- 获取元素集合：`getElementsByClassName`、`getElementsByName`
- 查询 `html` 元素：`documentElement`、`scrollingElement`
- 获取集合：`forms`、`images`、`links`
- 查询方法：`querySelector`、`querySelectorAll`

> 这些方法在 `iframe` 中可以和通过 `document` 获取，不需要代理，而容器中所有的元素都通过 `patchElementEffect` 将 `ownerDocument` 指向沙箱 `iframeWindow.document` [[查看](#patchelementeffect为元素打补丁)]

#### 劫持空对象作为 `proxyLocation`

和 `proxyGenerator` 相同，见：`proxyGenerator` - `proxyLocation` [[查看](#3-代理空对象作为-proxylocation)]

- 从子应用入口链接获取信息：`host`、`hostname`、`protocol`、`port`、`origin`
- 获取 `href`：用主应用的 `host` 替换为子应用的 `host`
- 设置 `href`：会通过 `locationHrefSet` 创建一个新的 `iframe` 代替应用容器 [[查看](#locationhrefset拦截子应用-locationhref)]
- 屏蔽 `reload`，当然屏蔽导致的问题也一样，见：`proxyGenerator` - `proxyLocation` [[查看](#3-代理空对象作为-proxylocation)]
- 遍历 `location` 属性绑定在 `proxyLocation`，如果是 `isCallable` 方法 [[查看](#iscallable判断对象是一个函数)]，绑定 `this` 为沙箱的 `location`

和 `proxyGenerator` 不同：

- 不拦截 `replace`，也不存在 `replace` 带来的问题，见：`proxyGenerator` - `proxyLocation` [[查看](#3-代理空对象作为-proxylocation)]
- 不会通过 `getTargetValue` 缓存 `isCallable` 方法，这可能是因为 `location` 方法并没有 `window` 那么多
- 降级后的 `proxyLocation` 不会捆绑在子应用中，见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

#### 📝 总结

#### `proxyWindow` 在哪调用

仅在 `insertScriptToIframe` 注入 `script` 到沙箱 `iframe` 时，包裹模块用到 [[查看](#insertscripttoiframe为沙箱插入-script)]

- 仅限非降级 `degrade` 模式，降级的 `iframe` 容器也不提供 `proxyWindow`

那 `degrade` 降级时真的不需要代理 `window` 吗？

- 并不是，至少 `location` 就不是
- 降级后 `iframe` 的 `location` 存在哪些问题？见：`proxyLocation` 的问题

以下属性在降级情况的确不用 `proxyWindow`：

| 属性     | 非降级模式                                            | `degrade` 降级      |
| -------- | ----------------------------------------------------- | ------------------- |
| `self`   | `proxyWindow`                                         | 沙箱 `iframeWindow` |
| `window` | 全局 `window` 描述信息存在 `get` 属性为 `proxyWindow` | 沙箱 `iframeWindow` |

以下属性无论降级不降级都从 `iframeWindow` 获取：

- 全局 `window` 描述信息不存在 `get` 属性
- `__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR__`、`__WUJIE_RAW_DOCUMENT_QUERY_SELECTOR_ALL__`
- 不可配置不可重写的属性
- `getTargetValue`

为什么降级后渲染容器 `iframe` 的 `window` 是沙箱 `iframe` 中获取：

- 因为 `script` 是注入在沙箱 `iframe` 中

#### `proxyDocument` 在哪调用

来自沙箱 `document` 打补丁有 2 处，见：`patchDocumentEffect` [[查看](#patchdocumenteffect修正沙箱-document-的-effect)]

- 遍历 `documentProxyProperties` 集合劫持沙箱 `document` 属性
- 获取 `body` 和 `head` 对象时，从渲染容器里返回 `Dom` 元素

在 `proxyDocument` 执行顺序：

- `patchDocumentEffect` 打补丁时候通过 `defineProperty` 劫持，然后调用 `proxyDocument` 的 `get` 拦截
- 为了能够拦截的更全面，会迭代 `documentProxyProperties` 属性集合，依次拦截

关于 `documentProxyProperties` 集合：

- 集合中涵盖了 `document` 需要劫持的属性，包括 `createElement`、`createTextNode` 这些在劫持过程中特殊处理的属性
- 在 `Proxy` 的 `get` 中会先处理特殊指定的属性，最后通过遍历 `documentProxyProperties` 批量定义

特殊指定的属性会因为遍历 `documentProxyProperties` 被覆盖吗：

- 不会，`Proxy` 中的 `get` 的规则是匹配即返回指定结果，特殊的属性会被优先匹配并返回

#### `proxyLocation` 在哪里调用

- 需要用到 `getCurUrl` 获取资源链接，将其提供给 `plugin` 中的 `loader`
- 通过 `patchElementEffect` 给子应用每一个元素打补丁，让其 `baseURI` 指向 `proxyLocation` [[查看](#patchelementeffect为元素打补丁)]
- 通过 `insertScriptToIframe` 在非降级模式下为所有 `script` 包裹的模块代理 `location` [[查看](#insertscripttoiframe为沙箱插入-script)]

#### `proxyLocation` 的问题

问题 1：在 `wujie` 子应用中谨慎使用 `location`

- 如果只是获取值那么一切正常，如果是要跳转、更新 `location` 建议你通过 `history` 来执行
- 否则可能会有意想不到的效果哦～

问题 2：在降级模式下的 `location` 和非降级模式下不一致

降级模式下子应用和基座的 `location` 不是同一个对象，对比如下：

| 分类       | 非降级模式             | `degrade` 子应用            | `degrade` 基座         |
| ---------- | ---------------------- | --------------------------- | ---------------------- |
| `location` | `proxyLocation`        | 沙箱 `iframeLocation`       | `proxyLocation`        |
| `url`      | 子应用入口链接         | 当前基座链接                | 子应用入口链接         |
| `host`     | 子应用                 | 主应用                      | 子应用                 |
| `reload`   | 屏蔽                   | 不屏蔽                      | 屏蔽                   |
| `replace`  | 创建 `iframe` 代替容器 | `location.replace` 默认行为 | 创建 `iframe` 代替容器 |

原因：

- 非降级的 `location` 在`insertScriptToIframe` 注入 `script` 到沙箱 `iframe` 时，包裹到模块中 [[查看](#insertscripttoiframe为沙箱插入-script)]
- 降级的子应用 `location` 为沙箱 `iframe` 的 `location`，不做代理
- 而降级的沙箱 `iframe` 和基座的 `host` 同域，也就造成了子应用的 `location` 和真实不符

那为什么 `degrade` 下基座不一样呢？

- 基座中调用的 `location` 全都来自 `proxyLocation`，这个对象绑定在了 `Wujie` 这个实例对象上了

要怎么修复：

- 我的想法是在 `proxyWindow` 劫持 `location` 指向 `proxyLocation`
- 但是降级后的 `iframe` 容器使用的是沙箱 `iframeWindow`，而不是 `proxyWindow`
- 这样就需要从 `patchWindowEffect` 着手打补丁了

怎么打补丁：

- 通过 `Object.getOwnPropertyNames` 遍历 `iframeWindow` 拿到属性 `location`
- 从 `iframeWindow.__WUJIE` 中获取 `degrade`
- 如果存在降级通过 `Object.defineProperty` 劫持并指向 `proxyLocation`

复现问题：

- 在基座中找到 `/src/pages/VuePage.tsx` [[查看](https://github.com/cgfeel/micro-wujie-substrate/blob/main/src/pages/VuePage.tsx)]
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
- `appHostPath`：子应用 `host`

目的：

- 创建一个 `iframe` 去加载子应用的链接，用来代替挂载当前渲染容器

**提取对象**

从实例中提取以下对象：

- 渲染容器：`shadowRoot`、`document`，根据 `degrade` 决定新建的 `iframe` 替换的对象
- `id`，用处 1：降级时从 `Dom` 中找到 `iframe` 容器，用处 2：更新链接，从 `search` 找到当前应用
- `degradeAttrs`：来自启动配置，便于使用者需要时让新建的 `iframe` 替换不那么突兀
- `url`：通常情况下是 `location.href` 更新的链接，但是相对路径需要转换一下

转换相对路径：

- 通过 `anchorElementGenerator` 将链接转换成 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- 提取 `appHostPath` 子应用 `host` + 链接对象的 `pathname` + `search` + `hash` 作为 `url`

执行替换有 3 步：

- 标记 `hrefFlag` 以便点击后退时将渲染容器重新替换新建的 `iframe`
- 替换渲染容器为新建的 `iframe`
- `pushUrlToWindow` 推送指定 `url` 到主应用路由 [[查看](#pushurltowindow推送-url-到基座路由)]

替换渲染容器有 2 种情况，先看 `degrade` 主动降级：

- 通过 `rawDocumentQuerySelector` （原生方法），拿到沙箱 `iframe` 的 `body`
- 通过 `renderElementToContainer` 将渲染容器中的 `html` 添加到沙箱 `iframeBody` 中 [[查看](#renderelementtocontainer将节点元素挂载到容器)]
- 通过 `renderIframeReplaceApp` 创建一个新的 `iframe` 替换渲染容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]

非主动降级 `degrade` 只做一件事：

- 通过 `renderIframeReplaceApp` 创建一个新的 `iframe` 替换渲染容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]

以上描述仅在正常情况，不巧 `locationHrefSet` 也有 `bug`：

- 这个问题来自代理 `localGenerator`，因为降级模式下不使用 `proxyLocation` [[查看](#proxylocation-的问题)]
- 因此降级模式下也不会拦截 `location.href` 的 `set` 操作
- 因此上述 `locationHrefSet` 流程中，请忽略降级处理部分

复现和修复：

- 和 `proxyLocation` 解决方法一致，见：`proxyLocation` 的问题 [[查看](#proxylocation-的问题)]

#### `pushUrlToWindow`：推送 `url` 到基座路由

目录：`sync.ts` - `pushUrlToWindow` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L98)]

参数：

- `id`：应用名
- `url`：跳转的链接，来自 `locationHrefSet` [[查看](#locationhrefset拦截子应用-locationhref)]

调用场景：

- 只有 `locationHrefSet` 拦截子应用 `location.href`
- 同时也说明监听 `popstate` 时检测前进的页面，正是来自 `locationHrefSet` 做的拦截后推送的更新

流程：

- 通过 `anchorElementGenerator` 拿到 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- 通过 `getAnchorElementQueryMap` 拿到 `searc` 的键值对
- 根据当前应用名 `id` 将值更新为 `encode` 的 `url`
- 将更新后的键值对更新为 `searh`，并通过 `window.history.pushState` 更新记录

### 辅助方法 - 提取应用资源

围绕提取应用资源归纳相关的方法

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

目录：`entry.ts` - `processCssLoader` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L56)]

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

目录：`entry.ts` - `getEmbedHTML` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/entry.ts#L77)]

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

### 辅助方法 - 容器渲染

围绕应用的渲染容器归纳相关的方法，包含：`shadowRoot` 容器、`iframe` 容器

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

- `startApp` 加载应用时通过 `addLoading` 设置，见：启动应用时添加、删除 `loading` [[查看](#启动应用时添加删除-loading)]

为什么 `addLoading` 后就不需要清空容器：

- 因为容器在 `addLoading` 时已清空

调用场景：

- `renderIframeReplaceApp`：劫持 `url` 创建 `iframe` 替换容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]
- `locationHrefSet`：降级处理时将 `iframe` 容器的 `html` 添加到沙箱 `iframe` [[查看](#locationhrefset拦截子应用-locationhref)]
- `active` 激活应用时，将 `shadowRoot` 添加到挂载节点 [[查看](#-active-激活应用)]
- `initRenderIframeAndContainer`：创建 `iframe` 容器添加到挂载点 [[查看](#2-degrade-主动降级渲染)]
- `popstate` 时将 `iframe` 容器的 `html` 添加到沙箱 `iframe`，或将 `shadowRoot` 添加到挂载点 [[查看](#processappforhrefjump-监听前进和后端)]

#### `renderTemplateToIframe` 渲染资源到 `iframe`

目录：`shadow.ts` - `renderTemplateToIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L252)]

参数：

- `renderDocument`：降级 `iframe` 容器的 `document`
- `iframeWindow`：沙箱的 `iframeWindow`
- `template`：通过 `importHTML` [[查看](#importhtml-加载资源)] 提取，并由 `processCssLoader` [[查看](#processcssloader处理-css-loader)] 处理过的应用资源

主动降级时将资源渲染到 `iframe`，调用场景：

- 应用初次激活 `active`
- 非 `active` 模式切换应用

流程：

- 通过 `renderTemplateToHtml` 将 `template` 渲染为 `html` 元素 [[查看](#rendertemplatetohtml渲染-template-为-html-元素)]
- 通过 `processCssLoaderForTemplate` 手动添加样式 [[查看](#rendertemplatetohtml渲染-template-为-html-元素)]
- 将更新后的 `html` 替换容器 `iframe` 的 `html`
- 通过 `Object.defineProperty` 劫持容器 `html` 元素的 `parentNode`，指向沙箱 `iframeWindow.document`
- 通过 `patchRenderEffect` 给容器打补丁 [[查看](#patchrendereffect-为容器打补丁)]

注意向容器添加元素，会同时在沙箱 `iframe` 中也添加一份，如下所示。见：同时添加元素 [[查看](#同时添加元素)]

```
renderDocument.replaceChild(processedHtml, renderDocument.documentElement);
```

#### `renderTemplateToShadowRoot` 渲染资源到 `shadowRoot`

目录：`shadow.ts` - `renderTemplateToShadowRoot` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L212)]

参数：

- `shadowRoot`：注入的容器
- `iframeWindow`：沙箱的 `iframeWindow`
- `template`：通过 `importHTML` [[查看](#importhtml-加载资源)] 提取，并由 `processCssLoader` [[查看](#processcssloader处理-css-loader)] 处理过的应用资源

调用场景：

- 只要不是 `degrade` 主动降级，也不是 `alive` 模式切换应用
- 其他所有模式激活应用都会通过 `renderTemplateToShadowRoot` 渲染 `shadowRoot`

流程和 `renderTemplateToIframe` 一样 [[查看](#rendertemplatetoiframe-渲染资源到-iframe)]，不同在于：

| 分类           | `renderTemplateToIframe` | `renderTemplateToShadowRoot`   |
| -------------- | ------------------------ | ------------------------------ |
| 容器           | `iframe.document`        | `shadowRoot`                   |
| 指向实例属性   | `this.document`          | `this.shadowRoot`              |
| 容器 `head`    | `this.document.head`     | `this.shadowRoot.head`         |
| 容器 `body`    | `this.document.body`     | `this.shadowRoot.body`         |
| 遮罩层 `shade` | 不支持                   | 作为在容器 `html` 第一个子元素 |

> 因此 `patchRenderEffect` 打补丁的容器对象也不一样 [[查看](#patchrendereffect-为容器打补丁)]

注意向容器添加元素，会同时在沙箱 `iframe` 中也添加一份，如下所示。见：同时添加元素 [[查看](#同时添加元素)]

```
shadowRoot.appendChild(processedHtml);
```

关于 `head`、`body`：

- 容器的 `head`、`body` 主要用于容器事件、元素操作的代理和劫持
- 除此之外无论是 `iframe` 还是 `shadowRoot`，都有一个实例的 `head`、`body`，用于渲染子应用的 `template`，见：`renderTemplateToHtml` [[查看](#rendertemplatetohtml渲染-template-为-html-元素)]

遮罩层 `shade`：

- 在容器中看不见，用途是为了撑开容器中的弹窗和浮层
- 由于在 `iframe` 容器中无法撑开容器区域，所以仅限 `shadowRoot`

#### `renderTemplateToHtml`：渲染 `template` 为 `html` 元素

目录：`shadow.ts` - `renderTemplateToHtml` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L176)]

参数：

- `iframeWindow`：沙箱的 `iframeWindow`
- `template`：通过 `importHTML` [[查看](#importhtml-加载资源)] 提取，并由 `processCssLoader` [[查看](#processcssloader处理-css-loader)] 处理过的应用资源

返回：

- 整个渲染完成并更新资源的 `html` 元素

做了 3 件事：

- 通过沙箱 `iframe` 下的 `document` 创建一个 `html` 元素，并将 `template` 作为 `innerHTML`
- 遍历 `html` 下所有可见元素，通过 `patchElementEffect` 为每个元素打补丁 [[查看](#patchelementeffect为元素打补丁)]
- 获取所有 `a`、`img`、`source` 元素，修正资源相对路径

优化 `umd` 模式加载的应用：

- 组件多次渲染，`head` 和 `body` 必须一直使用同一个来应对被缓存的场景
- 所以启动之前将 `head` 和 `body` 指向应用实例，以便下次通过 `replaceHeadAndBody` 直接替换

在末尾可能是担心不存在 `head` 或 `body` 的情况进行了补全：

- 但目前来看似乎做了多余的工作
- 因为当为一个 `html` 元素设置 `innerHTML` 时候，会根据情况自动补全
- 所以完全不用担心 `head` 或 `body` 缺失造成下次切换应用提取实例时拿不到对象

修正相对路径的细节：

- 通过 `patchElementEffect` 为遍历中每一个可见元素打补丁 [[查看](#patchelementeffect为元素打补丁)]
- 通过 `relativeElementTagAttrMap` 拿到资源链接 `url`

只有当资源的 `url` 存在时才进行处理，有 2 种情况：

- 绝对路径：`new URL(绝对路径，baseUrl).href`，原封不动返回绝对路径
- 相对路径：`new URL(相对路径, baseUrl).href`，返回：`baseUrl/相对路径`

为什么要通过沙箱创建 `html` 元素，而不是直接注入 `template` 到容器

- 需要通过 `iframeWindow` 获取 `sandbox` 实例，将 `html` 元素的 `head` 和 `body` 分别指向实例
- 渲染容器的 `document` 指向沙箱 `iframe`

#### `processCssLoaderForTemplate`：手动添加样式

目录：`shadow.ts` - `processCssLoaderForTemplate` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L109)]

参数：

- `sandbox`：应用实例
- `html`：由 `renderTemplateToHtml` [[查看](#rendertemplatetohtml渲染-template-为-html-元素)] 渲染的 `html` 元素

返回：

- 将更新后的 `html` 作为 `promise` 传回去，无论是 `resolve` 成功，还是 `reject` 拒绝

先提取了 3 个 `plugin`：

- `cssLoader`：用于每条样式加载成功后自定义处理，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-loader)]
- `cssBeforeLoaders`：用于插入应用 `html` 头部的样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-before-loaders)]
- `cssAfterLoaders`：用于插入应用 `html` 末尾的样式，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#css-after-loaders)]

> 其中 `cssLoader` 通过 `getCssLoader` 柯里化，方式和 `getJsLoader` 一致，见：`insertScriptToIframe` - 第一步 [[查看](#insertscripttoiframe为沙箱插入-script)]

提取样式的步骤和 `processCssLoader` [[查看](#processcssloader处理-css-loader)] 提取应用内部样式一样：

- 通过 `getExternalStyleSheets` 为每个样式添加一个 `promise` 对象 `contentPromise`
- 通过 `contentPromise` 将所有样式都变成内联样式
- 将拿到的内联样式创建 `style` 元素，根据配置插入应用 `html` 的头部或尾部

#### 启动应用时添加、删除 `loading`

目录：`shadow.ts` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts)]

**`addLoading` 添加 `loading`**

参数：

- `el`：挂载容器
- `loading`：加载状态的 `HTMLElement`，应该是可选的，按照配置文件传入的类型决定

两个参数只能来自配置文件：

- 因为 `addLoading` 只能在 `startApp` 调用 [[查看](#3-创建新的沙箱实例)]

用途：

- 清空挂载节点
- 给节点中添加 `loading` 元素

流程：

- 通过 `getContainer` 获取挂载节点，通过 `clearChild` 清空节点
- 为挂载节点添加样式和标签
- 创建一个 `loading` 元素添加到挂载节点里

根据 `position` 为挂载节点创建便签、更新样式：

| 行为            | `static`                            | `relative`、`sticky`                |
| --------------- | ----------------------------------- | ----------------------------------- |
| 记录 `position` | 标签 `CONTAINER_POSITION_DATA_FLAG` | 不记录                              |
| 记录 `overflow` | 标签 `CONTAINER_OVERFLOW_DATA_FLAG` | 标签 `CONTAINER_OVERFLOW_DATA_FLAG` |
| 更新 `position` | `relative`                          | 不更新                              |
| 更新 `overflow` | `hidden`                            | `hidden`                            |

> 其他 `position` 状态不做处理

创建 `loadingContainer` 元素：

- 作为 `loading` 父节点，添加样式 `position` 为 `absolute`，居中展示
- 添加标签 `LOADING_DATA_FLAG`，避免应用 `active` 时通过 `renderElementToContainer` [[查看](#renderelementtocontainer将节点元素挂载到容器)] 清空挂载点
- 将提供的 `loading` 添加到 `loadingContainer`，没有就使用默认的 `svg`，之后将整个元素添加到挂载节点

此时的 `loading` 是不可见的：

- 因为父级的 `position` 不是 `static`，且 `overflow` 会隐藏子集，自身又没有高度
- 子集只有一个 `absolute` 的 `loadingContainer` 无法撑开挂载节点的高度

什么时候可见：

- `active` 激活应用时，通过 `renderTemplateToShadowRoot` 或 `renderTemplateToIframe`，将容器添加到挂载节点撑开节点高度时

在哪清除：

- 只能通过 `removeLoading`，继续往下看

**`removeLoading` 删除 `loading`**

参数：

- `el`：挂载容器

做了 3 件事：

- 根据添加的标签还原 `position` 和 `overflow`
- 删除添加的标签：`CONTAINER_POSITION_DATA_FLAG`、`CONTAINER_OVERFLOW_DATA_FLAG`
- 删除 `loadingContainer` 元素

调用场景：

- `start` 启动应用时候，只要不是 `umd` 模式切换应用都会执行
- `mount` 挂载应用时，仅限 `umd` 模式切换应用

> `umd` 不存在首次加载应用，因为第一次启动应用 `mount` 方法还没有挂载到 `iframeWinndow`

#### 记录、恢复 `iframe` 容器事件

目录：`shadow.ts` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts)]

仅用于 `degrade` 主动降级：

- `recordEventListeners`：记录容器中所有事件
- `recoverEventListeners`：恢复容器中所有元素事件
- `recoverDocumentListeners`：恢复容器 `document` 事件

**1. 记录事件：**

- 重写子应用 `addEventListener` 和 `removeEventListener`
- 根据操作从实例 `elementEventCacheMap` 映射表中添加或删除记录，见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- 然后再监听子应用相关事件

**2. 恢复容器元素事件：**

- 仅用于 `degrade` 降级处理切换 `alive` 模式的应用
- 通过 `createTreeWalker` 拿到应用下所有的可见元素
- 遍历元素，通过 `elementEventCacheMap` 获取事件监听对象，将拿到的事件对象记录到一个新的 `WeakMap`
- 更新实例 `elementEventCacheMap`

**3. 恢复容器 `document` 事件：**

- 仅用于 `degrade` 降级处理切换非 `alive` 模式的应用
- 和恢复容器元素事件一样的步骤，不同的是仅获取、恢复容器 `document` 的监听事件

### 辅助方法 - 打补丁

围绕 `patch*` 打补丁归纳方法

#### `patchRenderEffect` 为容器打补丁

目录：`effect.ts` - `patchRenderEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L427)]

参数：

- `render`：容器的 `shadowRoot` 或 `document`
- `id`：应用名称
- `degrade`：是否主动降级

做的事情（部分）：

- 用于子应用中动态操作 `Dom`，比如：`appendChild` 和 `insertBefore`
- 在子应用动态添加 `script` 时，会通过 `insertScriptToIframe` 添加到沙箱的 `iframe` 中
- 在子应用动态添加内联或外联样式同时，会通过 `styleSheetElements.push` 收集添加的样式，以便 `umd` 切换应用时通过 `rebuildStyleSheets` 恢复样式
- 非主动降级情况下，记录子应用 `head` 和 `body` 所有监听的事件，集合在 `_cacheListeners`

> 主动降级不需要记录：降级场景 `dom` 渲染在 `iframe` 中，`iframe` 移动后事件自动销毁，不需要记录
>
> 关于 `_cacheListeners` 的用途就有点不明所以了：
>
> - 可以在子应用中通过 `[body|head]._cacheListeners` 获取所有监听的实例，但是需要获取吗？
> - 可以在卸载应用时通过 `removeEventListener` 清空所有记录，意义是？

#### `patchElementEffect`：为元素打补丁

目录：`iframe.ts` - `patchElementEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L668)]

参数：

- `element`：`html` 节点元素、`ShadowRoot`
- `iframeWindow`：沙箱的 `iframeWindow`

**内部补丁 1：`baseURI`**

- 通过 `proxyLocation` 定位到当前应用的 `protocol` + `host` + `pathname`

用途：

- 通过获取元素的 `baseURI` 去纠正子应用中带有相对路径的资源，比如：`a`、`img` 等
- 使其路径相对于子应用，而不是基座

**内部补丁 2：`ownerDocument`**

- 指向当前沙箱 `iframeWindow.document`

用途：

- 纠正子应用中动态创建 `style` 时 `document` 对象
- 纠正子应用中动态创建 `iframe` 时 `querySelector` 上下文指向
- 让渲染容器所有的元素 `document` 都指向沙箱 `iframeWindow.document`

**内部补丁 3：`_hasPatch`**

- 表明已给元素打过补丁，不用再打补丁

**外部补丁：`patchElementHook`**

通过 `execHooks` 提取 `plugins`，提供则使用 `patchElementHook` 为每个元素打补丁，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#patchelementhook)]

#### `patchIframeVariable` 为子应用 `window` 添加属性

目录：`iframe.ts` - `patchIframeVariable` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L155)]

参数：

- `iframeWindow`：沙箱的 `window` 对象
- `wujie`：应用实例
- `appHostPath`：子应用的 `host`

添加的属性：

- `__WUJIE`：指向应用实例 `wujie`
- `__WUJIE_PUBLIC_PATH__`：子应用的 `host`
- `$wujie`：子应用的 `provide`，见：`WuJie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]
- `__WUJIE_RAW_WINDOW__`：指向 `iframeWindow`

#### `patchIframeHistory` 劫持沙箱 `iframe` 的 `history`

目录：`iframe.ts` - `patchIframeHistory` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L170)]

参数：

- `iframeWindow`：沙箱的 `window` 对象
- `appHostPath`：子应用的 `host`
- `mainHostPath`：基座的 `host`

调用场景：

- `initIframeDom`：初始化 `iframe` 的 `dom` 结构

在此之前需要明白一个概念：

- 在劫持 `history` 之前，会通过 `initBase` [[查看](#base标签操作)] 为子应用中所有相对路径的资源链接，指定为子应用 `host` 的基础链接
- 当点击链接时需要拦截这部分的链接，替换为基座 `host` 然后更新沙箱 `iframe` 的 `url`
- 更新完之后再通过 `updateBase` [[查看](#base标签操作)]，将 `iframe` 的 `url` 中基座的 `host` 替换回子应用的 `host`

劫持 `history` 的方法：

- `pushState`：插入链接
- `replaceState`：替换链接

流程都一致：

- 将 `baseUrl` 指定为：基座 `host` + `iframe` 的 `pathname` + `search` + `hash`
- 在更新的连接中，将子应用的 `host` 替换为空变成一个 `pathname`，通过 `new URL` 使其成为 `baseUrl` 的相对链接
- 通过 `rawHistoryPushState.call` 执行 `history` 的更新，除非当前更新的 `url` 不存在则停止并返回
- 通过 `updateBase` 更新呢 `base` 元素，以便子应用做的相对路径给予路由的 `pathname` [[查看](#base标签操作)]
- 通过 `syncUrlToWindow` 同步子应用路由到基座，以 `hash` 形式存在 [[查看](#syncurltowindow同步子应用路由到主应用)]

关于 `rawHistoryPushState.call`：

- 这里需要注意指定的上下文是 `iframeWindow.history`
- 这样就为 `syncIframeUrlToWindow` 中监听 `iframeWindow` 的 `popstate` 和 `hashchange` 提供了支持 [[查看](#synciframeurltowindow-监听沙箱前进后退)]

#### `patchIframeEvents` 劫持沙箱 `iframe` 的 `EventListener`

目录：`iframe.ts` - `patchIframeEvents` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L115)]

参数：

- `iframeWindow`：沙箱的 `window` 对象

调用场景：

- `initIframeDom`：初始化 `iframe` 的 `dom` 结构

劫持的方法：

- `addEventListener`：添加监听事件
- `removeEventListener`：删除监听事件

流程都一致：

**1. 通过 `execHooks` 提取并执行插件函数**

- `addEventListener`：`windowAddEventListenerHook` 见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#windowaddeventlistenerhook)]
- `removeEventListener`：`windowRemoveEventListenerHook` 见：文档 [[查看](https://wujie-micro.github.io/doc/guide/plugin.html#windowremoveeventlistenerhook)]

`windowAddEventListenerHook` 的意义在于：

- 无界子应用的 `dom` 渲染在 `webcomponent` 中，`js` 在 `iframe` 中运行
- 当子应用需要通过 `window.addEventListener` 监听滚动时需要通过插件从基座添加监听对象

**2. 设置 `__WUJIE_EVENTLISTENER__`**

- `addEventListener` 中添加，`removeEventListener` 中删除
- 删除监听项需要 `type`、`listener`、`optionns` 全部都匹配

对于 `__WUJIE_EVENTLISTENER__` 不理解存在的意义：

- 在源码中 `__WUJIE_EVENTLISTENER__` 只存在添加和删除，没有获取和调用
- 那有个可能是留给子应用内部使用？但子应用内部用 `window` 事件监听集合做设么呢？
- 那只剩下恢复事件监听，但是目前只有主动降级需要恢复事件，且通过 `recoverEventListeners` 执行 [[查看](https://github.com/cgfeel/micro-wujie-substrate?tab=readme-ov-file#%E8%AE%B0%E5%BD%95%E6%81%A2%E5%A4%8D-iframe-%E5%AE%B9%E5%99%A8%E4%BA%8B%E4%BB%B6)]

**3. 执行添加或删除事件监听**

使用劫持的方法执行添加或删除，调用方法时会将劫持的 `type`、`listener` 和 `options` 透传过去，不同的是上下文中 `this` 指向，分别如下：

- `appWindowAddEventListenerEvents` 包含的 `type`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L169)]，`this` 优先指向 `targetWindow`，不存在使用 `iframeWindow`
- `options` 提供 `targetWindow`，`this` 指向 `targetWindow`
- 以上情况都不是的情况优先使用 `iframeWindow` 否则使用基座 `window`

> 对于最后一点，子应用中 `__WUJIE_RAW_WINDOW__` 指向都是 `iframeWindow`，见：`patchIframeVariable` [[查看](#patchiframevariable-为子应用添加-window-属性)]

#### `patchWindowEffect`：修正 `iframeWindow` 的 `effect`

目录：`iframe.ts` - `patchWindowEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L215)]

做了 3 件事：

1. 将 `window` 上的属性绑定到 `iframe` 上
2. 将 `window` 上的事件用 `iframe` 做劫持
3. 通过插件 `windowPropertyOverride` 自定义给 `iframeWindow` 打补丁

**绑定 `window` 上的属性**

内部定义的函数 `processWindowProperty` 用处：

- 是将 `window` 上的属性绑定到 `iframeWindow`
- 需要通过 `isConstructable` 来判断提供的属性是否可以实例化 [[查看](#isconstructable判断函数是否可以-new)]

有 3 种情况：

- 允许通过 `new` 声明实例的构造方法，直接绑定到 `iframeWindow`，`this` 默认指向 `window`
- 不允许通过 `new` 声明实例的函数，通过 `bind` 将方法绑定到 `iframe`，并将 `this` 指向 `window`
- 不是函数的 `window` 属性，直接绑定覆盖 `iframeWindow` 默认的属性

方法：

- 通过 ` Object.getOwnPropertyNames` 遍历 `iframeWindow` 获取属性名去绑定

`getSelection` 属规则：

- 劫持属性，`get` 时指向 `iframeWindow.document`
- 因为应用是渲染在容器里的，而容器所有的元素通过 `patchElementEffect` 指向 `iframeWindow.document` [[查看](#patchelementeffect为元素打补丁)]

单独属性属规则：

- `windowProxyProperties`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L192)]
- 这这部分属性通过 `processWindowProperty` 从 `window` 提取出来绑定到 `iframeWinndow`

正则匹配属性规则：

- `windowRegWhiteList`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L195)]
- 规则方式和“单独属性”一样，通过 `processWindowProperty` 绑定
- 但是在执行前需要先确保 `iframeWindow.parent` 存在这个属性

这里存在一个 `bug`：

- 通常来说 `iframeWindow.parent` 指的是基座的 `window`
- 但是有一种情况是应用的基座也是子应用，那么 `iframeWindow.parent` 依然是 `iframeWindow`
- 当我在作为子应用的基座 `widnow` 上定义了最顶层 `window` 不存在的属性，被正则匹配到了
- 通过 `processWindowProperty` 去 `window` 拿对应的属性得到的可能是 `undefinde`

**绑定 `window` 上所有的 `onEvent`**

- 监听除了 `onload`、`onbeforeunload`、`onunload` 之外所有 `on` 开头的方法
- 通过 `Object.getOwnPropertyNames` 遍历 `window` 筛选存在的事件

流程：

- 通过 `Object.getOwnPropertyDescriptor` 拿到 `iframeWindow` 监听事件的描述信息
- 通过 `Object.defineProperty` 劫持 `iframeWindow` 上的监听事件
- 通过 `set` 将 `iframeWindow` 监听的事件绑定到 `window`
- 在 `set` 中对于类型为函数的 `handle` 通过 `bind` 将上下文 `this` 指向 `iframe`
- 在 `get` 中直接返回返回绑定在 `window` 上的监听事件

获取描述信息的目的：

- `enumerable`：判断是否可枚举
- `set`：重写前判断属性是否可写或存在 `set`，不满足设为 `undefined`

举个例子：

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

// 通过 `Object.getOwnPropertyDescriptor` 将事件绑定在基座 `window`
window.onfocus = () => {
  this; // 但是 this 指向 iframeWindow
}

// 这样当基座触发 `window.onfocus` 时，就会调用来自子应用的监听事件
// 因为子应用那个中一开始监听事件的目的就是奔着 `window` 来的，而不是 `iframeWindow`
```

**通过插件打补丁**

- `windowPropertyOverride` 文档居然没提，好在当前总结已多次罗列插件系统
- 会将 `iframeWindow` 作为参数直接传过去，直接进行覆盖

#### `patchDocumentEffect`：修正沙箱 `document` 的 `effect`

目录：`iframe.ts` - `patchDocumentEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts)]

做了 6 件事：

**1. 处理 `addEventListener` 和 `removeEventListener`**

声明 2 个 `WeakMap` 映射表：

- `handlerCallbackMap`：根据 `handle` 记录 `callback`
- `handlerTypeMap`：根据 `handle` 将所有监听的类型集合成一个数组

处理 `callbabck`：

- 首次添加：如果 `handle` 是函数，`bind` 沙箱的 `document` 为 `this`，否则直接采用 `handle`
- 再次添加：直接使用首次缓存的 `callback`
- 删除：只删除已缓存的记录，将记录从 `handlerTypeMap` 中剔出指定类型
- 如果剔出类型后 `handle` 为空，将 `handle` 从 `handlerCallbackMap` 和 `handlerTypeMap` 都删除

通过 `execHooks` 提取并执行插件函数：

- `addEventListener`：`documentAddEventListenerHook`
- `removeEventListener`：`documentRemoveEventListenerHook`
- 插件函数的意义和 `windowAddEventListenerHook` 一样，见：`patchIframeEvents` [[查看](#patchiframeevents-劫持沙箱-iframe-的-eventlistener)]

执行添加或删除事件监听：

- 无论添加还是删除，参数都一样：`type`、`callback`、`options`，不同的是上下文中 `this` 对象

`this` 对象的不同场景：

- 类型在 `appDocumentAddEventListenerEvents` 中：`iframeWindow`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L151)]
- `degrade` 主动降级：`sandbox.document` 沙箱 `iframe` 渲染容器
- 类型在 `mainAndAppAddEventListenerEvents` 中，需要同时监听基座和子应用，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L166)]
- 其他情况：`sandbox.shadowRoot` 渲染容器

**2. 处理 `onEvent`**

提取 2 个集合：

- `elementOnEvents`：提取 `iframeWindow.HTMLElement.prototype` 所有 `on` 开头的事件
- `documentOnEvent`：提取 `iframeWindow.Document.prototype` 所有 `on` 开头的事件，但不包含 `onreadystatechange`

取他们的交集进行处理，处理的方法和 `patchWindowEffect` 中处理 `onEvent` 一样 [[查看](#patchwindoweffect修正-iframewindow-的-effect)]：

- 通过 `Object.getOwnPropertyDescriptor` 拿到 `iframeWindow.Document.prototype` 监听事件的描述信息
- 通过 `Object.defineProperty ` 劫持 `iframeWindow.Document.prototype` 上的监听事件
- 在 `set` 将监听的事件绑定到渲染容器上，渲染容器由 `degrade` 决定是 `iframe` 还是 `shadowRoot`
- 在 `get` 中直接返回返回绑定在渲染容器上的监听事件

> 注意：如果渲染容器是 `shadowDom`，那么劫持的事件会绑定到 `shadowDom` 的 `html` 元素上，而如果渲染容器是 `iframe` 则会绑定到容器的 `document` 上

获取描述信息的目的：

- `enumerable`：判断是否可枚举
- `set`：重写前判断属性是否可写或存在 `set`，不满足设为 `undefined`

为什么要劫持：

- 因为子应用是渲染在容器里，而 `script` 是存放在沙箱 `iframe` 里
- 通过劫持事件，让沙箱 `document` 触发由于渲染容器添加的事件

**3. 处理属性 `get` 时指向沙箱 `proxyDocument`**

属性来自：

- `documentProxyProperties`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L42)]

方法和处理 `onEvent` 一样：

- 通过 `Object.getOwnPropertyDescriptor` 拿到 `iframeWindow.Document.prototype` 属性的描述信息
- 通过 `Object.defineProperty ` 劫持 `iframeWindow.Document.prototype` 上的属性

不同在于：

- 不可 `set`，`get` 操作指向 `proxyDocument`

**4. 处理 `document` 专属事件**

属性来自：

- `documentEvents`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L131)]

方法和处理 `onEvent` 一样：

- 通过 `Object.getOwnPropertyDescriptor` 拿到 `iframeWindow.Document.prototype` 监听事件的描述信息
- 通过 `Object.defineProperty ` 劫持 `iframeWindow.Document.prototype` 上的监听事件
- 对于类型为函数的 `handle` 将 `this` 指向 `iframeWindow`

不同在于：

- 方法根据 `degrade` 决定绑定对象是渲染容器 `iframe`，还是最顶层基座的 `window`
- 在当定对象的 `document` 中绑定监听事件的方法，同理获取也是从指定对象的 `document` 中获取

**5. 处理 `head` 和 `body`**

- 遍历 `ownerProperties` 集合进行劫持
- 从 `iframeWindow.document` 中劫持对象，`get` 时指向 `proxyDocument`

**6. 运行插件钩子函数**

文档没提 `documentPropertyOverride`，和 `windowPropertyOverride` 一样，见：`patchWindowEffect` [[查看](#patchwindoweffect修正-iframewindow-的-effect)]

- 将 `iframeWindow` 作为参数直接传过去，在基座中通过 `plugin` 的方式劫持特定属性或事件

#### `patchNodeEffect`：修正 `node` 的 `effect`

目录：`iframe.ts` - `patchNodeEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L563)]

覆盖了 3 个方法：

- `getRootNode`：获取 `document`、`appendChild`：追加元素、`insertBefore`：在内部元素之前插入元素

`appendChild`、`insertBefore` 的目的：

- 为每一个添加的 `node` 通过 `patchElementEffect` 打补丁 [[查看](#patchelementeffect为元素打补丁)]
- 由于子应用的 `Dom` 来自渲染容器，渲染时已通过 `patchElementEffect` 打补丁
- 在渲染容器通过 `appendChild`、`insertBefore` 插入元素会被劫持重写
- 重写的方法中为新增的元素通过 `patchElementEffect` 再次打补丁，使其具有和子应用中其他 `Dom` 元素拥有一样的操作方法

`getRootNode` 这里做了一个很“奇妙”的操作：

- 渲染容器里每个元素都重写了 `ownerDocument` 指向 `iframeWindow.document`
- 当通过 `getRootNode` 拿到的是渲染容器 `shadowRoot`，说明出现了异常情况
- 于是将沙箱降级容器 `iframe` 的 `document` 返回，这个时候 `iframeWindow.document` 是 `undefinned`，也就什么也拿不到
- 其他情况正常返回，也就是 `iframeWindow.document`

那降级容器 `ifram` 为什么不做处理：

- 可能还是要考虑用户在容器里跳转到第三方页面的情况

#### `patchRelativeUrlEffect`：修复动态添加元素资源

修复资源元素的相对路径问题（来自备注）

目录：`iframe.ts` - `patchRelativeUrlEffect` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L588)]

流程：

- 通过 `fixElementCtrSrcOrHref` 重写 `setAttribute`，`Object.defineProperty` 劫持资源属性 [[查看](#fixelementctrsrcorhref对元素资源打补丁)]
- 从而对动态设置相对路径的资源修复为绝对路径

#### `fixElementCtrSrcOrHref`：对元素资源打补丁

劫持元素原型对相对地址的赋值转绝对地址

目录：`utils.ts` - `fixElementCtrSrcOrHref` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L167)]

参数：

- `iframeWindow`：沙箱的 `window`
- `elementCtr`：资源元素
- `attr`：资源属性，例如：`src`

做了 2 件事：

- 重写 `setAttribute`、劫持 `elementCtr.prototype`

目的：

- 来自子应用动态设置资源链接，通过 `getAbsolutePath` 重新配置最终的链接 [[查看](#getabsolutepath获取绝对路径)]

处理链接有 3 种情况：

- 相对路径，按照 `baseURI` 取转换为绝对路径，`baseURI` 见：`base` 元素 [[查看](#base标签操作)]
- 绝对路径或是 `hash`，不处理直接返回

### 辅助方法 - 沙箱 `iframe`

围绕沙箱 `iframe` 归纳相关的方法

#### `insertScriptToIframe`：为沙箱插入 `script`

向沙箱 `iframe` 中插入 `script`，而并非 `shadowDom`

目录：`iframe.ts` - `insertScriptToIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L710)]

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

> `rewriteAppendOrInsertChild` 有 2 种情况，且都来自 `active` 激活应用，见：`active` [[查看](#-active-激活应用)]：
>
> - `degrade` 降级处理：优化 `iframe` 容器
> - 非 `dagrade`：优化 `shadowDom` 容器
>
> 它们的目的只有全都满足以下 2 个条件才可以：
>
> - 通过 `patchRenderEffect` 重写子应用 `node` 操作 [[查看](#patchrendereffect-为容器打补丁)]
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
- 只有通过子应用 `rewriteAppendOrInsertChild` 动态添加的 `script` 才需要打标记，见：`patchRenderEffect` [[查看](#patchrendereffect-为容器打补丁)]

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
- 包含：子应用的 `script`、启动应用时手动配置的、在应用中通过节点操作添加的
- 对于内联 `script` 会包裹一个模块，通过 `proxy` 更改 `window` 等对象的指向，避免全局污染
- 这个函数存在逻辑问题，见：`start` 启动应用的 `bug` [[查看](#4-start-启动应用的-bug)]

#### `iframeGenerator`：创建沙箱 `iframe`

目录：`iframe.ts` - `iframeGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L815)]

`js` 沙箱，来自备注：

- 创建和主应用同源的 `iframe`，路径携带了子路由的路由信息，`iframe` 必须禁止加载 `html`，防止进入主应用的路由逻辑

参数：

- `sandbox`：应用实例
- `attrs`：配置 `iframe`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html#attrs)]
- `mainHostPath`：基座 `host`
- `appHostPath`：子应用 `host`
- `appRoutePath`：子应用的 `pathname`

**第一步：创建 `iframe`**

- 创建一个 `iframe` 元素，并设置属性
- 属性包含：`src` 为基座 `host`，样式不可见，自定义属性，`id` 为应用名以及 `wujie` 特有的 `flag`
- 将 `iframe` 添加到 `body` 末尾
- 通过 `patchIframeVariable` 为 `iframeWindow` 添加属性 [[查看](#patchiframevariable-为子应用-window-添加属性)]

关于 `patchIframeVariable`

- 备注是这样的：变量需要提前注入，在入口函数通过变量防止死循环。
- 但在入口函数倒是没有找到需要用到注入 `iframeWindow` 属性的地方
- 倒是在 `localGenerator` 主动降级的代理方法中需要用到 `iframe.contentWindow.__WUJIE`
- 而 `localGenerator` 对于 `iframeGenerator` 来说是上下文关系，优先于微任务先执行

**第二步：发起微任务**

- 发起微任务 `stopIframeLoading` 并挂在到实例属性 `iframeReady` 上
- 返回创建的沙箱 `iframe`

`iframeReady` 用于确保 `iframe` 完成初始化：

- 在 `active` 激活任务前会先通过 `await this.iframeReady` 确保完成
- 在 `active` 之前还会发起 2 轮微队列：`importHTML` [[查看](#importhtml-加载资源)]、`processCssLoader` [[查看](#processcssloader处理-css-loader)]

如果加载顺利的话 `iframeReady`：

- 会在 `importHTML` 之前完成 `stopIframeLoading` [[查看](#stopiframeloading实现一个纯净的沙箱-iframe)]
- 会在 `processCssLoader` 之前完成 `stopIframeLoading().then()` [[查看](#processcssloader处理-css-loader)]

**`iframeReady` 都做了什么：**

微任务 1：检测并停止加载 `iframe`

- 通过 `stopIframeLoading` 观察 `document` [[查看](#stopiframeloading实现一个纯净的沙箱-iframe)]

微任务 2：给 `iframe` 打补丁

- 若因 `iframe` 加载导致注入的全局属性丢失，需要通过 `patchIframeVariable` 重新注入 [[查看](#patchiframevariable-为子应用-window-添加属性)]
- 通过 `initIframeDom` 初始化 `iframe` 的 `dom` 结构 [[查看](#initiframedom初始化-iframe-的-dom-结构)]
- 从当前网页的 `url` 查找出是否存在当前应用名的 `query`，如果查到先更新 `iframe` 的 `history`

> 通过 `iframeWindow.history.replaceState` 更新 `history`，采用：基座 `host` + 子应用 `pathname`

#### `initIframeDom`：初始化 `iframe` 的 `dom` 结构

目录：`iframe.ts` - `initIframeDom` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L616)]

参数：

- `iframeWindow`：沙箱的 `window` 对象
- `wujie`：应用实例
- `mainHostPath`：基座 `host`
- `appHostPath`：子应用 `host`

**第一步：创建新的 `html`**

- 通过 `iframeWindow` 拿到 `iframeDocument`
- 通过 `window.document.implementation.createHTMLDocument` 创建一个新的空白 `html` 元素
- 如果沙箱的 `iframe` 的 `html` 元素存在就是用新的 `html` 替换，否则添加到 `iframeDocument`

为什么要创建一个新的 `html`：

- 因为 `initIframeDom` 之前通过 `stopIframeLoading` 检测了 `document` 改变 [[查看](#stopiframeloading实现一个纯净的沙箱-iframe)]
- `document` 因配置了 `src` 实例化后加载基座 `host` 完成变更
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
- `patchNodeEffect`：修正 `node` 的 `effect` [[查看](#patchnodeeffect修正-node-的-effect)]
- `patchRelativeUrlEffect`：修复动态添加元素资源 [[查看](#patchrelativeurleffect修复动态添加元素资源)]

#### `base`：标签操作

目的：

- 在沙箱 `iframe` 中添加一个 `base` 元素
- 由于渲染的容器中通过 `patchElementEffect` [[查看](#patchrendereffect-为容器打补丁)] 将 `ownerDocument` 指向 `iframeWindow.document`
- 所以应用的渲染容器中所有资源的相对链接会通过沙箱 `iframe` 指向 `base` 元素

操作分 2 部分，即：初始化和动态更新

**`initBase` 初始化 `base` 标签**

目录：`iframe.ts` - `initBase` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L600)]

参数：

- `iframeWindow`：沙箱的 `window` 对象
- `url`：子应用的入口链接

流程：

- 通过 `iframeWindow` 拿到沙箱的 `iframeDocument` 并创建一个 `base` 元素
- 将 `iframe` 的 `href`（即基座的 `host`），和应用的入口链接通过 `anchorElementGenerator` [[查看](#anchorelementgenerator转换-url)] 创建 2 个 `HTMLAnchorElement` 对象
- 使用子应用的 `host` + 基座的 `pathname` 作为 `base` 元素的 `href`
- 将 `base` 元素插入沙箱 `iframe` 中

注意：

- 沙箱 `iframe` 的 `src` 为基座应用的 `host`，而 `initBase` 是在初始化 `iframe` 时创建
- 所以无论如何 `pathname` 始终拿到的是 `/`

**`updateBase` 动态更新 `base` 标签**

目录：`iframe.ts` - `updateBase` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L204)]

参数：

- `iframeWindow`：沙箱的 `window` 对象
- `appHostPath`：子应用的 `host`
- `mainHostPath`：基座的 `host`

流程：

- 将 `iframe` 的 `host` 取出 `mainHostPath` 变成相对路径，通过 `new URL` 使其作为 `appHostPath` 的 `pathname`
- 调用 `iframe` 原生的方法查找 `base` 元素并更新 `href` 属性

#### `stopIframeLoading`：实现一个纯净的沙箱 `iframe`

防止运行主应用的 `js` 代码，给子应用带来很多副作用（来自备注）

目录：`iframe.ts` - `stopIframeLoading` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L9)]

参数：

- `iframeWindow`：沙箱的 `window` 对象

原因：

- 子应用的 `script` 运行在一个和主应用同域的 `iframe` 沙箱中
- 设置 `src` 为 `mainHostPath`（主域名 `host`），会主动加载主应用
- 所以必须在 `iframe` 实例化完成前，还没有加载完 `html` 时中断加载，防止污染子应用

`iframe` 实例化之前 `stop` 可以吗？

- 不行，此时 `iframe` 的 `location.origin` 还是 `about:blank`
- 会导致后续获取 `iframeWindow.location` 无效

那 `iframe` 实例化后通过 `document.write` 擦除可以吗？

- 不行，路由器的同步功能将失败

流程：

- 记录一个还未完成加载的 `iframeWindow.document` 作为 `oldDoc`，此时的 `location.origin` 是 `about:blank`
- 返回一个微任务，微任务中创建一个 `loop` 函数作为 `document` 检测
- 在 `loop` 中再创建一个微任务，由于 `appendChild` 是同步操作，所以执行微任务前会优先挂载 `iframe` 避免死循环
- 在 `loop` 微任务中获取当前 `iframe.document` 和 `oldDoc` 进行比较
- 如果 `iframe` 没有完成实例化导致 `document` 不变，将重新发起一轮 `loop` 微任务
- 直到 `iframe` 实例化完毕 `document` 发生改变，立即 `stop` 停止 `iframe` 加载后释放微任务

> 由于沙箱 `iframe` 在初始化之前已经设置不可见，所以加载过程也全程不可见

#### `syncIframeUrlToWindow` 监听沙箱前进后退

子应用前进后退，同步路由到主应用

目录：`iframe.ts` - `syncIframeUrlToWindow` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L697)]

参数：

- `iframeWindow`：沙箱的 `window` 对象

监听的事件：

- `hashchange`：监听 `hash` 变化
- `popstate`：监听前进后退

要做的事：

- 通过 `syncUrlToWindow` 同步路由到基座 [[查看](#syncurltowindow同步子应用路由到主应用)]

#### `renderIframeReplaceApp`：加载 `iframe` 替换子应用

目录：`iframe.ts` - `renderIframeReplaceApp` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L799)]

参数：

- `src`：新疆 `iframe` 的 `src`
- `element`：要替换的渲染容器的父级挂载点
- `degradeAttrs`：新疆 `iframe` 的属性，由配置入口提供

调用场景：

- 子应用通过 `locationHrefSet` 拦截 `location.href` [[查看](#locationhrefset拦截子应用-locationhref)]
- 监听 `popstate`，前进的链接 `search` 是来自 `pushUrlToWindow` 推送的链接 [[查看](#pushurltowindow推送-url-到基座路由)]

流程：

- 创建 `iframe` 元素，定义一个宽高 `100%` 的样式
- 通过 `setAttrsToElement` 为 `iframe` 添加样式、`src`、`degradeAttrs`
- 通过 `renderElementToContainer` 清空容器挂载元素，并添加 `iframe` 元素 [[查看](#renderelementtocontainer将节点元素挂载到容器)]

### 辅助方法 - 路由同步和链接处理

围绕应用中的路由、链接归纳相关方法

#### `syncUrlToWindow`：同步子应用路由到主应用

目录：`sync.ts` - `syncUrlToWindow` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L9)]

参数：

- `iframeWindow`：沙箱的 `window` 对象

调用场景：

- `active` 激活应用时同步路由，包含：预加载、初次启动应用、切换应用 [[查看](#-active-激活应用)]
- `syncIframeUrlToWindow`：监听 `iframeWindow` 后退和前进 [[查看](#synciframeurltowindow-监听沙箱前进后退)]
- `patchIframeHistory`：劫持 `iframeWindow。history` 对象的 `pushState` 和 `replaceState` [[查看](#patchiframehistory-劫持沙箱-iframe-的-history)]

不做处理的情况：

- 没有配置 `sync` 同步路由，并且基座 `url.search` 找不到当前应用名匹配的值

**第一步：提取配置**

- 从应用实例中获取：`sync` 同步路由、`id` 应用名、`prefix` 短链接，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]
- 提取当前的 `url` 转变为 `HTMLAnchorElement` 对象，见：`anchorElementGenerator` [[查看](#anchorelementgenerator转换-url)]
- 通过 `HTMLAnchorElement` 拿到 `queryMap`，见：`getAnchorElementQueryMap` [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]
- 拿到 `iframeWindow.location` 中的 `pathnname` + `search` + `hash`，作为当前子应用目标路由 `curUrl`
- 声明一个变量 `validShortPath` 用于记录匹配的短链接名

**第二步：处理短路径**

遍历 `prefix` 拿到短链名和对应的 `url`，匹配并更新 `validShortPath`，要求：

- `curUrl` 必须是用遍历的 `url` 开头，且 `url` 尽可能匹配 `curUrl`

**第三步：同步路由**

`sync` 已配置：

- 通过 `encodeURIComponent` 更新 `queryMap[id]` 的值为 `curUrl`
- 如果 `validShortPath` 匹配到值，优先替换 `curUrl` 中匹配短链对应的 `url` 为 `{短链名}`

`sync` 未配置：

- 从 `queryMap` 中删除应用对应的值

**第四步：更新路由**

- 将同步后的 `queryMap` 还原成 `url.search`，并更新 `winUrlElement` 对象
- 当 `winUrlElement` 链接发生改变，通过 `window.history.replaceState` 更新当前 `url`

#### `syncUrlToIframe`：同步主应用路由到子应用

目录：`sync.ts` - `syncUrlToIframe` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L51)]

参数：

- `iframeWindow`：沙箱的 `window` 对象

调用场景：

- 只有 `alive` 模式切换路由不会调用
- 其他所有场景，无论是预加载、初次启动、切换应用都会显同步主应用路由，再从子应用同步路由到主应用

**第一步：拿到配置**

- 从沙箱 `iframe` 的 `location` 中提取： `pathname`、`search`、`hash`
- 从应用实例中拿到必要的属性，见源码

计算子应用的路由：

- 如果 `sync` 同步路由，且初次启动或预加载 `active`，通过 `getSyncUrl` [[查看](#getsyncurl获取需要同步的-url)] 获取子应用路由
- 否则没有配置同步路由，或者 `umd` 切换应用，都会使用子应用入口链接作为路由

**第二步：比较路由**

- 将拿到的路由通过 `appRouteParse` [[查看](#approuteparse-提取链接)]，计算得到 `appRoutePath` 作为最终预期的子应用路由
- 比较 `appRoutePath` 和最初从沙箱 `iframe` 中拿到的 `pathname` + `search` + `hash` 进行比较
- 如果不同则通过 `iframeWindow.history.replaceState` 进行替换跳转

#### `clearInactiveAppUrl`：清理路由

目录：`sync.ts` - `clearInactiveAppUrl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sync.ts#L72)]

清理非激活态的子应用同步参数：

- 通过 `anchorElementGenerator` 将当前的链接转换为一个 `HTMLAnchorElement` 对象
- 通过 `getAnchorElementQueryMap` 将链接的 `search` 转化为键值对 [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]

遍历 `search` 对象所有的 `key`，作为 `name` 提取并筛选应用：

- 应用必须存在，且已经 `start` 启动、存在 `sync` 同步路由、路由全部来自基座、且应用已激活

将条件匹配的 `searchkey` 全部删除，组合新的链接：

- 和当前链接进行比对，如果不一致 `replace` 替换链接

#### `appRouteParse` 提取链接

目录：`utils.ts` - `appRouteParse` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L122)]

参数：

- `url`：字符类型的链接

根据传入的链接提取 3 个对象：

- `urlElement`：通过 `anchorElementGenerator` 转换 `url` 为 `HTMLAnchorElement` 对象 [[查看](#anchorelementgenerator转换-url)]
- `appHostPath`：根据提供的 `url` 提取 `host`
- `appRoutePath`：包含了 `pathname` + `search` + `hash`

调用场景有 2 个：

- `WuJie` 实例初始化
- `syncUrlToIframe` 同步主应用路由到子应用

#### `anchorElementGenerator`：转换 `url`

将 `url` 转换为 `HTMLAnchorElement` 对象

目录：`utils.ts` - `anchorElementGenerator` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L138)]

参数：

- `url`：链接 `string` 类型

返回：

- `HTMLAnchorElement` 对象

#### `getAnchorElementQueryMap` 转化 `url.search` 为键值对象

目录：`utils.ts` - `getAnchorElementQueryMap` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L145)]

参数：

- `anchorElement`：`HTMLAnchorElement` 类型的对象

流程：

- 将 `url.search` 按照 `&` 拆分成数组，遍历并根据 `=` 拆分成 `key` 和 `value`
- 如果 `key` 和 `value` 都存在责作为键值对添加到对象
- 最后将添加的对象返回，如果没有任何匹配的键值对，返回一个空对象

#### `getSyncUrl`：获取需要同步的 `url`

从提取 `url.search` 中通过应用名，提取应用路由

目录：`utils.ts` - `getSyncUrl` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L221)]

参数：

- `id`：应用名
- `prefix`：短链接，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/sync.html#%E7%9F%AD%E8%B7%AF%E5%BE%84)]

返回：

- 子应用路由：`string`

流程：

- 拿到 `url.search` 键值对 `queryMap`，见：`anchorElementGenerator` [[查看](#anchorelementgenerator转换-url)]、`getAnchorElementQueryMap` [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]
- 使用应用名提取 `queryMap` 使用 `decodeURIComponent` 解析路由，如果不存在则使用空值
- 提取路由中的短链 `validShortPath`，见：`syncUrlToWindow` [[查看](#syncurltowindow同步子应用路由到主应用)]
- 如果提供短链集合，并且提取出短链名，通过提取的值返回子路由
- 否则将解析的路由 `syncUrl` 直接返回

存在的 `bug`：

- 即便提供了短链集合，也即便从路由中提取到了短链名，但是未必短链集合中就存在提取的短链名
- 有可能因为在集合中找不到短链名 `replace` 为一个 `undefined` 字符

#### `getAbsolutePath`：获取绝对路径

目录：`utils.ts` - `getAbsolutePath` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L206)]

参数：

- `url`：可以是 `url`、`pathname`、`search`、`hash`、空字符
- `base`：参考的 `url` 或 `host`
- `hash`：提取 `hash`，可选 `boolean` 值

返回有 3 个情况：

- `url` 是 `pathname`、`search`、`hash`，通过 `new URL` 按照 `base` 返回绝对路径的链接
- `url` 是一个绝对路径的链接，通过 `new URL` 会忽视 `base`，原样返回 `url`
- 其他情况直接返回 `url`，包括 `hash` 模式

> 参数 `hash` 存在的意义在于 `url` 是 `hash` 时直接返回而不用合并 `base`

### 辅助方法 - 实用工具

#### `isConstructable`：判断函数是否可以 `new`

目录：`utils.ts` - `isConstructable` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L60)]

参数：

- `fn`：任意函数，包括构造函数

**第一步：检查函数是否有原型方法**

- 存在 `prototype` 且 `prototype.constructor` 指向自身，`prototype` 上的属性除了 `constructor` 还有其他属性
- 如果以上条件都存在返回 `true`

**第二步：从缓存中获取**

- 之前计算过的会存在在映射表 `fnRegexCheckCacheMap` 中，存在直接返回

**第三步：通过正则表达式检查函数字符串**

- `constructableFunctionRegex`：检查大写开头的函数，`classRegex`：检查以 `class` 开头的类
- 以上任意条件存在即可

**第四步：缓存并返回结果**

- 将获取的结果 `constructable` 存储在 `fnRegexCheckCacheMap`，并返回

#### `isCallable`：判断对象是一个函数

目录：`utils.ts` - `isCallable` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L37)]

参数：

- `fn`：任意对象

流程：

- 判断 `fn` 是一个函数，会优先从映射表 `callableFnCacheMap` 获取
- 不存在则判断，是函数记录到映射表，最终返回判断结果

#### `isBoundedFunction`：判断 `bound` 函数

目录：`utils.ts` - `isBoundedFunction` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L50)]

参数：

- `fn`：`CallableFunction`

流程：

- 判断 `fn` 是一个以 `bound` 开头的剪头函数，，会优先从映射表 `boundedMap` 获取
- 不存在则判断，匹配记录到映射表，最终返回判断结果

#### `getTargetValue` 从对象中获取属性

目录：`utils.ts` - `getTargetValue` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/utils.ts#L91)]

参数：

- `target`：源码中是 `any`，实则应该是 `{ [key: PropertyKey]: any }` 对象，否则就报错了
- `p`：源码中是 `any`，实则应该是 `PropertyKey`，否则就报错了

返回：

- 从 `target` 找找到 `p` 返回回来

分别有以下几种情况：

- `setFnCacheMap`：映射表中存在直接返回
- 非函数的属性直接返回
- 函数但是 `bound` 开头的剪头函数直接返回，见：`isBoundedFunction` [[查看](#isboundedfunction判断-bound-函数)]
- 可以实例化的函数直接返回，见：`isConstructable` [[查看](e#isconstructable判断函数是否可以-new)]
- 其他函数通过 `bind.call` 修正 `this` 指向并返回新函数

> 关于 `bind.call` 速记方法，全部以 `call` 作为记忆点：
>
> - `call`：立即调用对象中的方法，第一个参数指向 `this`，后面参数传递给执行方法
> - `apply`：和 `call` 一样，不同的是传递的参数是以数组形式
> - `bind`：可以看做将 `call` 柯里化之后返回新的函数
> - `bind.call`：和 `bind` 一样，不同的是会在第一个参数前面插入一个函数对象，用于修正调用的方法

`bind.call` 修正 `this` 指向过程：

- 通过 `Function.prototype.bind.call` 将函数上下文 `this` 指向 `target` 返回新函数
- 将新的方法记录在映射表 `setFnCacheMap` 中
- 遍历方法对象中的属性，绑定在新的方法中，如果方法存在原型，也绑定在新方法中

绑定原型是让当前方法和绑定的方法原型链一致，遍历属性的目的见下方演示：

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

为什么要用 `getTargetValue`：

- `getTargetValue` 用于 `Proxy` 劫持对象需要 `get` 属性时
- 如果不提供 `get` 或 `get` 中直接返回对象方法会报错，见下方演示：
- 正确的做法是从对象中找到对应的方法，并且绑定 `this` 为指定对象

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

### 映射表和队列

#### 📝 全局映射表

#### 1. `idToSandboxCacheMap`：存储无界实例和配置

目录：`common.ts` - `idToSandboxCacheMap` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L11)]

全部无界实例和配置存储 `map`（来自备注）：

- 类型：`new Map<String, SandboxCache>()`，应用名为 `key`，实例为 `SandboxCache`
- `SandboxCache` 包含 2 个属性：`wujie`：`Wujie` 类的实例，`options`：来自 `setupApp` 存储的配置信息

添加映射表有 2 个方法，分别为：

- `addSandboxCacheWithWujie`：收集 `Wujie` 实例对象，收集在每个映射对象的 `wujie` 属性，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L23)]
- `addSandboxCacheWithOptions`：收集 `setupApp` 设置应用信息，收集在每个映射对象的 `options` 属性，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]

使用 `addSandboxCacheWithWujie` 只有 1 处调用；

- `Wujie` 构造函数，见：源码[[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L532)]

创建 `Wujie` 实例有 2 个地方：

- `preloadApp`：预加载，见：文档 [[查看](https://wujie-micro.github.io/doc/api/preloadApp.html)]
- `startApp`：启动应用，见：文档 [[查看](https://wujie-micro.github.io/doc/api/startApp.html)]

使用 `addSandboxCacheWithOptions` 只有 1 处：

- `setupApp` 缓存子应用配置，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/index.ts#L179)]

从这里可以知道：

- `preloadApp`：预加载可以极大的提升子应用首次打开速度
- `startApp`：只要应用名和链接没变，通过组件重复插入子应用不会重复创建实例
- `setupApp`：可以预先为 `startApp` 和 `preloadApp` 提供信息

> `startApp` 虽然每次都会从映射表拿取实例，但实例只要不是 `alive` 模式或 `umd` 模式，所有实例都会通过 `destroy` 注销后重建

删除映射表的方法只有 1 个：

- `deleteWujieById`：会从映射表 `idToSandboxCacheMap` 中删除实例和缓存实例的配置

调用 `deleteWujieById` 也只有 1 处：

- `destroy`：销毁 `WuJie` 实例 [[查看](#-destroy-销毁实例)]

实例映射表在应用中具有唯一性：

- 和 `appEventObjMap` 一样，通过 `window.__WUJIE.inject.appEventObjMap` 指向上一级映射表，见：构造函数 `inject` [[查看](#1-inject-注入子应用-3-个对象)]

#### 2. `appEventObjMap`：存储 `eventBus` 托管的事件

目录：`event.ts` - `appEventObjMap` [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/event.ts#L7)]

全部事件存储 `map`（来自备注）：

- 类型：`new Map<String, EventObj>()`，实例名为 `key`，监听事件为 `EventObj`
- `key` 分两种情况：基座以时间命名、子应用以子应用命名
- `EventObj`：是一个事件集合，`event_name` 是键名，键值是监听函数集合的数组

事件映射表关联流程图（点开新窗口放大缩小查看细节）：

![事件映射表关联流程图](https://github.com/user-attachments/assets/0139adca-49bb-40e3-bbe3-87838db32be8)

当子应用是嵌套关系的基座时：

- 子应用的基座，以及基座下的子应用会通过 `window.__WUJIE.inject.appEventObjMap` 指向上一级映射表，见：构造函数 `inject` [[查看](#1-inject-注入子应用-3-个对象)]
- 这样就保证了整个映射表呈树状结构

简单理解：

- `appEventObjMap` 顶层是一个 `Map` 对象
- 这个对象为顶层的基座和每个应用分配一个 `Map item`
- 子应用无论是应用还是基座，都通过 `inject` 指向子应用名称对应的 `Map item`

如何收集订阅的：

- `EventBus` 构造函数中使用 `key` 从映射表找出对应的事件对象，没有则创建一个空对象 `{}`
- 通过 `$on` 将要监听的事件名和方法以 `EventObj` 的方式添加到事件对象中

如何派发事件：

- 遍历所有的事件对象，从事件对象找到要触发的监听函数集合，添加到队列 `cbs` 数组中
- 遍历并执行拿到的监听函数集合 `cbs`

缺点：事件对象只有 1 级

- 由于子应用是通过 `inject` 注入链一级级往上找，所以无论层级，最终只会有 1 级监听对象
- 不过好在应用实例 `idToSandboxCacheMap` 也只有 1 级，实例名不能重复

带来的问题：

- 问题 1：事件重名造成错误订阅，如果子应用很多，可能很难保证事件的唯一性
- 问题 2：嵌套自身作为子应用，事件订阅会造成重复监听

解决办法：

- 问题 1：自行为每一个监听事件名称加上自身应用名作为前缀，使其成为一个命名空间，如：`{project_name}_{event_name}`
- 问题 2：这是个无解的问题，最好的办法就是尽量不要层层潜逃，层层嵌套在 `wujie` 不仅仅只是事件通信存在问题

除此之外：

- `wujie` 还提供了 `props` 通信通信和 `window` 通信，来避免 `EventBus`承载过多，见：文档 [[查看](https://wujie-micro.github.io/doc/guide/communication.html)]

#### 📝 `Wujie` 实例中映射表和队列

所有属性初始和注销状态见：`Wujie` 实例中关键属性 [[查看](#-wujie-实例中关键属性)]

#### 1. `execQueue` 应用启动执行队列

队列收集来自 2 个区域：

| 所在位置                                                                                                                                                                       | 用途                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `rewriteAppendOrInsertChild` 共 2 处，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/effect.ts#L158)] | 收集来自子应用中动态添加的内联和外联 `script`                                                                       |
| `start` 共 7 处，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/sandbox.ts#L251)]                     | 收集配置文件手动插入和同步应用中静态 `script`，派发事件，通知 `start` 完成，见：启动应用 [[查看](#-start-启动应用)] |

> 对于像 `React` 或 `Vue` 这样的 `SPA` 应用，`script` 是通过动态添加到应用中的，需要通过 `rewriteAppendOrInsertChild` 来收集

倒推流程：

- `rewriteAppendOrInsertChild` 来自 `patchRenderEffect`
- `patchRenderEffect` 有 2 处：`renderTemplateToShadowRoot` [[查看](#rendertemplatetoshadowroot-渲染资源到-shadowroot)]、`renderTemplateToIframe` [[查看](#rendertemplatetoiframe-渲染资源到-iframe)]
- 渲染容器的 2 个方法都来自 `active` 激活应用 [[查看](#-active-激活应用)]

由此得出启动应用过程时：

1.  通过 `active` 激活应用，渲染 `template` 到容器
2.  通过 `patchRenderEffect` 给容器打补丁收集来自应用中动态添加的 `script`
3.  启动应用 `start`，收集配置文件手动插入和同步应用中静态 `script`、派发事件等

#### 2. `styleSheetElements` 收集样式表

数组类型，分 2 个部分：

- `patchCssRules`：实例方法，用于子应用样式打补丁 [[查看](#-patchcssrules-子应用样式打补丁)]
- `rewriteAppendOrInsertChild`：收集来自应用中动态添加的内联和外联样式

加载流程和 `execQueue` 稍微不一样：

1.  预加载应用或初次启动应用时通过 `processCssLoader` 替换应用中的静态样式 [[查看](#processcssloader处理-css-loader)]，这部分样式不会被收集
2.  通过 `active` 激活应用，渲染 `template` 到容器
3.  通过 `patchRenderEffect` 给容器打补丁收集来自应用中动态添加的 `style`，并将动态样式插入容器
4.  `active` 激活最后 `shadowRoot` 下会遍历容器中所有 `style`，提取并记录 `:root` 样式

问题：

- `styleSheetElements` 并不收集应用内的除 `:root` 以外的静态样式
- 而是每次激活应用时重复提取并加载样式，见：`importHTML` - 5. 存在的 2 个问题 [[查看](#importhtml-加载资源)]
- 当然可以通过 `alive` 模式和 `umd` 模式，在切换应用时避免重复加载

#### 3. `elementEventCacheMap` 记录降级容器事件

- 记录方法见：记录、恢复 `iframe` 容器事件 [[查看](#记录恢复-iframe-容器事件)]

### 引入 `wujie` 包时默认就执行

#### `EventBus`

提供给基座与子应用通信，导出对象为 `bus`，见：文档 [[查看](https://wujie-micro.github.io/doc/api/bus.html)]

#### `stopMainAppRun`

终止代码运行，前提条件：

- `window.__WUJIE`：说明为子应用，在沙箱 `iframe` 初始化时通过 `patchIframeVariable` 设置 [[查看](#patchiframevariable-为子应用-window-添加属性)]
- `!window.__POWERED_BY_WUJIE__`：说明此时没有通过 `start` 启动应用 [[查看](#-start-启动应用)]
- `stopMainAppRun`：能够执行这个函数必须是基座

由此得出：

- 子应用是基座的情况下，`__POWERED_BY_WUJIE__` 还未经过 `start` 启动应用添加
- 通常情况下，要执行 `script` 就要先 `start` 启动子应用
- 而在注入 `script` 之前一定会先定义 `__POWERED_BY_WUJIE__`

假设存在 `__POWERED_BY_WUJIE__` 丢失的情况，不阻止会发生什么：

- 实例注入的对象链条会被中断，见：`inject` [[查看](#1-inject-注入子应用-3-个对象)]

#### `processAppForHrefJump` 监听前进和后端

前进或后退时做了什么：

- 通过当前的 `url` 获取 `queryMap`，见：`getAnchorElementQueryMap` [[查看](#getanchorelementquerymap-转化-urlsearch-为键值对象)]
- 通过 `queryMap` 筛选获取应用实例集合，遍历集合根据前进或后退重新渲染容器

2 个情况：

| 监听 | 判断依据   | `locationHrefSet` 劫持   | 应用内路由           |
| ---- | ---------- | ------------------------ | -------------------- |
| 前进 | `queryMap` | 找到开头为 `http` 的链接 | 找到的是非链接的路由 |
| 后退 | `herfFlag` | `true`                   | `false`              |

前进不处理的情况：

| 条件                 | 原因                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `queryMap` 为路由    | 路由时 `hrefFlag` 不可能为 `true`，2 个判断分支都不匹配                                      |
| `herfFlag` 为 `true` | ① 前进优先匹配 `queryMap`，② 被 `locationHrefSet` 劫持后，不会继续劫持网页的 `location.href` |

后退不处理的情况：

| 条件                         | 原因                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `queryMap` 匹配开头为 `http` | `locationHrefSet` 劫持后在 `iframe` 打开的应用所有操作都视为 `iframe` 内部操作，不会记录在 `history` |
| `herfFlag` 为 `false`        | 说明来自应用路由的变更，不需要额外处理                                                               |

所以：

- `locationHrefSet` 劫持后，后退时只能是路由对应的应用
- 而路由前进，打开的应用可能会是 `locationHrefSet` 劫持的 `iframe`

不处理情况 `history` 变更做了什么：

- 交由基座决定，重新渲染应用或切换应用

前进时匹配到链接为劫持的 `http` 怎么做：

| 分类                                                                                                                          | `iframe` 容器 | `shadowRoot` 容器 |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------- |
| `renderElementToContainer` 将 `iframe` 容器添加到沙箱 `iframeBody` 中 [[查看](#renderelementtocontainer将节点元素挂载到容器)] | 执行          | 不执行            |
| `renderIframeReplaceApp` 创建 `iframe` 代替当前容器 [[查看](#renderiframereplaceapp加载-iframe-替换子应用)]                   | 执行          | 执行              |
| 标记 `hrefFlag` 以便后退时能够返回应用                                                                                        | 执行          | 执行              |

后退时 `hrefFlag` 存在怎么做：

- 只看 `shadowRoot` 模式，通过 `renderElementToContainer` 将 `shadowRoot` 重新替换挂载到节点 [[查看](#renderelementtocontainer将节点元素挂载到容器)]

为什么后退时忽略 `degrade`：

- 先看 `degrade` 下 `locationHrefSet` 拦截时的操作 [[查看](#locationhrefset拦截子应用-locationhref)]
- 会通过 `renderElementToContainer` 清空沙箱 `iframe` 然后再把 `iframe` 容器的 `html` 添加进来
- `popstate` 恢复时会通过 `initRenderIframeAndContainer` 重建 `iframe` 替换挂载到节点
- 然后将沙箱 `iframeBody` 下的第一个元素添加到 `iframe` 容器的 `document` 下

问题：

- 难道不是把 `iframeBody` 的 `parentElement`，添加到容器 `document` 下吗？
- 渲染容器是恢复了，沙箱 `iframe` 的 `script` 叻？在 `locationHrefSet` 时已被清空了啊。。。

幸运的时目前不会碰到上述问题：

- 因为 `locationHrefSet` 存在 `bug`，`degrade` 模式下不能劫持 `location.href` [[查看](#locationhrefset拦截子应用-locationhref)]

#### `defineWujieWebComponent` 定义自定义组件

- 当引入 `wujie` 的时候通过 `defineWujieWebComponent` 确保已定义了 `web component` 了
- 而在 `active` 中通过 `createWujieWebComponent` 会自动创建组件，无需开发者关心

> 在 `wujie` 中只能通过 `active` 自动创建 `web component`，不支持手动添加 `wujie-app` 到 `Dom tree`

#### 其他

- `wujieSupport`：浏览器不支持 `Proxy` 或 `CustomElementRegistry` 输出警告，此时采用 `degrade` 模式
- `setupApp`：缓存配置，提供对外接口默认不执行，见：文档 [[查看](https://wujie-micro.github.io/doc/api/setupApp.html)]
- `destroyApp`：删除应用，提供对外接口默认不执行，见：文档 [[查看](https://wujie-micro.github.io/doc/api/destroyApp.html)]

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

### 还没有解开的问题

记录还没有找到答案的疑问，待后续深入。如果有人知道可以通过 `issue` 告诉我

#### 同时添加元素

来自：

- `renderTemplateToShadowRoot` 中 `shadowRoot.appendChild`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L221)]
- `renderTemplateToIframe` 中 `renderDocument.replaceChild`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L261)]

现象：

- 通常 `appendChild` 移动元素时候，元素之前的父级将会被清空
- 但是当我向容器添加 `html` 元素的时候，沙箱也会一模一样添加了一份

先想到的的是 `patchElementEffect`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L668)]

- 通过劫持 `ownerDocument` 所有元素的 `ownerDocument` 指向 `iframeWindow.document`
- 但这和容器 `appendChild` 有什么关系？

然后我想可能是 `cloneNode` 拷贝了元素副本：

- 查过所有源码，只有 `replaceHeadAndBody` 有，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/shadow.ts#L153)]
- 但它的用途仅仅是用来引用 `template` 生成的 `html` 资源

最后我想到的可能是 `proxy`：

- 在 `proxyDocument` 会代理 `document` 中 `createElement`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/proxy.ts#L94)]
- 而 `proxyDocument` 会在 `patchDocumentEffect` 遍历指定的属性集合进行劫持，共计 2 处，见：[[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/iframe.ts#L513)]
- 但是这是添加元素，`patchDocumentEffect` 劫持的属性不存在 `appendChild`，见：源码 [[查看](https://github.com/Tencent/wujie/blob/9733864b0b5e27d41a2dc9fac216e62043273dd3/packages/wujie-core/src/common.ts#L42)]
- 而劫持 `createElement` 目的也只是为动态创建的元素通过 `patchElementEffect` 打补丁

目前能确定的是：

- 向 `shadowRoot` 添加的每个元素，都会在沙箱 `iframe` 中也添加一份
- 动态添加的每一个元素都会通过 `patchElementEffect` 打补丁
