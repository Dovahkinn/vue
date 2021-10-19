# Flow 静态类型检查
> .flowconfig 
 [libs] > flow

 # 源码目录

src
|-- compiler    # 编译相关
|-- core        # 核心代码
|-- platforms   # 跨平台支持
|-- server      # 服务端渲染
|-- sfc         # .vue 文件解析
|-- shared      # 共享代码

## compiler
> 模板解析成 ast, 代码生成
编译可以在构建时(webpack, vue-loader)
也可在运行时 (包含构建功能的 vue.js 版本)

编译耗性能, 推荐离线编译

## core
内置组件, 全局 api, Vue 实例化, 观察者, 虚拟 DOM, 工具函数等等

## platform
跨平台: web, weex

## server
服务端渲染主要的工作是把组件渲染为服务器端的 HTML 字符串，将它们直接发送到浏览器，最后将静态标记"混合"为客户端上完全交互的应用程序

## sfc
把 .vue 文件的内容解析成一个 JavaScript 对象

## shared
一些工具方法, 被 web, node 共享

# 构建过程

## scripts/
- build.js
- config.js
- alias.js

## 版本
- Runtime Only
我们在使用 Runtime Only 版本的 Vue.js 的时候，通常需要借助如 webpack 的 vue-loader 工具把 .vue 文件编译成 JavaScript，因为是在编译阶段做的，所以它只包含运行时的 Vue.js 代码，因此代码体积也会更轻量。
- Runtime Compiler
我们如果没有对代码做预编译，但又使用了 Vue 的 template 属性并传入一个字符串，则需要在客户端编译模板
最终渲染都是通过 render 函数, 如果写 template 属性, 需要编译成 render 函数,
这个编译过程发生在运行时, 所以需要带有编译器的版本 

编译过程有性能损耗

# 入口 (Runtime + Compiler)

## 文件
> src/platforms/web/entry-runtime-with-compiler.js 初始化
> src/core/index.js 初始化 Vue
> src/core/instance/index.js Vue 的类声明, 扩展
> src/core/global-api/index.js 全局 API 
> src/core/instance/init.js initMixin -- this._init

## 初始化

- new Vue -> this._init
- initMixin -> Vue.prototype._init

> Vue 初始化主要就干了几件事情，合并配置，初始化生命周期，初始化事件中心，初始化渲染，初始化 data、props、computed、watcher 等等。

## 实例的挂载 $mount
> 与平台, 构建方式相关

### 定义
src/platform/web/entry-runtime-with-compiler.js
src/platform/web/runtime/index.js
src/platform/weex/runtime/index.js

### compiler 版本

-src/platform/web/entry-runtime-with-compiler.js 入口, 扩展 $mount, 将 el 转换成 render 
-src/platform/web/runtime/index.js 声明最初的 $mount, 调用 mountComponent
-src/core/instance/lifecycle.js mountComponent -- vm._render vm._update

### render
-src/core/instance/render.js -> Vue.prototype._render -> createElement

## Virtual DOM
- src/core/vdom/vnode.js 定义

> VNode 是对真实 DOM 的一种抽象描述，它的核心定义无非就几个关键属性，标签名、数据、子节点、键值等，其它属性都是用来扩展 VNode 的灵活性以及实现一些特殊 feature 的。由于 VNode 只是用来映射到真实 DOM 的渲染，不需要包含操作 DOM 的方法，因此它是非常轻量和简单的。

Virtual DOM 除了它的数据结构的定义，映射到真实的 DOM 实际上要经历 VNode 的 create、diff、patch 等过程。

## createElement
-src/core/vdom/create-element.js -> _createElement

### 规范化 children
src/core/vdom/helpers/normalzie-children.js
- normalizeChildren
- simpleNormalizeChildren
- normalizeArrayChildren -- 列表嵌套的理解

## update


- src/core/instance/lifecycle.js - lifecycleMixin -> _update -> __patch__
- src/platforms/web/runtime/index.js web 平台 __patch__
- src/core/vdom/patch.js createPatchFunction

> _update 私有方法
> 调用时机: 1. 首次渲染, 2. 数据更新

## 组件化
- src/core/instance/lifecycle.js mountComponent
- src/core/instance/render.js Vue.prototype._render -> $createElement -> createElement
- src/core/vdom/create-element.js createElement -> _createElement -> createComponent
- src/core/vdom/create-component.js createComponent
- src/core/global-api/extend.js initExtend -> Vue.extend

### createComponent
它在渲染一个组件的时候的 3 个关键逻辑：构造子类构造函数，安装组件钩子函数和实例化 vnode。createComponent 后返回的是组件 vnode，它也一样走到 vm._update 方法，进而执行了 patch 函数

### patch

Vue.prototype._update -> vm.__patch__ -> patch -> createElm

- src/core/vdom/patch.js patch -> createElm -> createComponent -> vnode.data.hook.init
- src/core/vdom/create-component.js componentVNodeHooks.init -> createComponentInstanceForVnode(vnode, activeInstance) -> new vnode.componentOptions.Ctor
- src/core/instance/init.js _init -> initInternalComponent -> vm.$mount
