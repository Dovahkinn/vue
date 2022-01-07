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


### 合并配置

1. 外部调用
- src/core/global-api/index.js initGlobalAPI
> Vue.options.components = {}
  Vue.options.directives = {}
  Vue.options.filters = {}
  Vue.options._base = Vue

- src/core/util/options.js mergeOptions 

2. 组件场景
- src/core/instance/init.js - 合并配置
> 声明周期函数被合并为数组添加到 options

3. beforeCreate & created
- src/core/instance/init.js
> initLifecycle - initEvents - initRender -- beforeCreate -- 
> initInjection - initState -initProvide -- created

4. beforeMount & mounted
- src/core/instance/lifecycle.js
> $mount() -> beforeMount -> vm._render -> vm._update -> mounted

5. beforeUpdate & updated
- src/core/instance/lifecycle.js Watcher
> watcher.before -> beforeUpdate
> src/core/observer/scheduler.js - flushSchedulerQueue -> updated

6. beforeDestroy & destroyed

- src/core/instance/lifecycle.js $destroy -> beforeDestroy -> 删除自身, 删除 watcher, 执行 VNode 的销毁钩子 -> destroyed

### 组件注册
- src/core/global-api/assets.js - Vue.component
- src/core/vdom/create-element.js - _createElement 
- src/core/util/options.js - resolveAsset
> id -> camelized -> Pascal

### 异步组件
> 3 种异步组件的实现方式，高级异步组件的实现是非常巧妙的，它实现了 loading、resolve、reject、timeout 4 种状态。
> 异步组件实现的本质是 2 次渲染，除了 0 delay 的高级异步组件第一次直接渲染成 loading 组件外，其它都是第一次渲染生成一个注释节点，
> 当异步获取组件成功后，再通过 forceRender 强制重新渲染，这样就能正确渲染出我们异步加载的组件了。

1. 普通工厂函数
Vue.component('async-component', function(resolve, reject) {
    // 这个特殊的 require 语法告诉 webpack
    // 自动将编译后的代码分割成不同的块，
    // 这些块将通过 Ajax 请求自动下载。
    // 组件加载完成后, 执行 resolve
    require(['./async-component'], resolve)
})
2. Promise
Vue.component('async-component', () => import('./component.vue'))
3. 高级异步组件

const AsyncComponent = () => ({
    // 要加载的组件, Promise
    component: import('./component'),
    // 加载中渲染的组件
    loading: Loading,
    // 出错时
    error: ErrorComp,
    // 渲染加载中组件前的等待时间
    delay: 200,
    // 最长等待时间
    timeout: 3000,
})

Vue.component('async-component', AsyncComponent)

- src/core/vdom/create-component.js - createComponent
- src/core/vdom/helpers/resolve-async-component.js - resolveAsyncComponent createAsyncPlaceholder
- src/shared/util.js once
- src/core/instance/lifecycle.js $forceUpdate -- 异步组件加载过程中没有数据变化发生, 需要调用渲染 watcher 的 update, 触发组件的重新渲染
- createAsyncPlaceholder

# 响应式原理
> 场景: 修改 data, 模板对应的插值会渲染成新的数据
1. 传统实现:
  监听事件 -> 修改数据 -> 修改 DOM
2. 使用 Vue
  监听事件 -> 修改数据

* 修改 DOM 要处理的几个问题
1. 我需要修改哪块的 DOM
2. 我的修改效率和性能是不是最优的
3. 我需要对数据每一次的修改都去操作 DOM吗?
4. 我需要 case by case 去写修改 DOM 的逻辑吗?   

## 响应式对象
- Object.defineProperty

src/core/instance/state.js - initState // props, methods, data, computed, watch
src/core/observer/index.js - observe defineReactive

defineReactive 对象上定义一个响应式的属性

getter - 依赖收集
setter - 派发更新

## 依赖收集

src/core/observer/dep.js - Dep

> mount -> new Watcher(vm, updateComponent) -> watcher.get -> updateComponent -> vm._render -> dep.depend -> Dep.target.addDep -> dep.addSub(this)
> -> popTarget -> cleanupDeps

## 派发更新 *

> setter -> dep.notify -> watcher.update -> queueWatcher -> flushSchedulerQueue -> watcher.run

## nextTick

src/core/util/next-tick.js

数据的变化到 DOM 的重新渲染是一个异步过程，发生在下一个 tick。这就是我们平时在开发的过程中，比如从服务端接口去获取数据的时候，数据做了修改，如果我们的某些方法去依赖了数据修改后的 DOM 变化，我们就必须在 nextTick 后执行。

## 组件更新

VNode diff:
1. old != node
> 创建新节点 -> 更新父占位符节点 -> 删除旧节点
2. old == node
> updateChildren

## Props
src/core/instance/init.js _init -> mergeOptions
src/core/util/options.js - mergeOptions normalizeProps
src/core/instance/state.js - initState -> initProps
src/core/util/props.js -> validateProp assertProp
### 规范化
{}/[] -> normalizeProps -> {...}

### 初始化
> 校验 响应式 代理
_init -> initState -> initProps -> validateProp -> assertProp -> 定义响应式

### props 更新
> prop 数据的值在父组件中, 父组件 render 过程中会访问到 prop 数据
> prop 变化一定触发父组件的重新渲染: -> patch -> patchVnode

src/core/vdom/patch.js - patchVnode
src/core/vdom/create-component.js prepatch -> updateChildComponent
src/core/instance/lifecycle.js updateChildComponent -> 更新子组件 props

> 子组件 prop 修改
> 子组件 prop 对象类型的内部属性修改 

### toggleObserving

- src/core/observer/index.js toggleObserving observe 过程中是否把当前值当做一个 observer 对象

1. initProps

2. validateProp

3. updateChildComponent 

***
# 编译
> 模板编译成 render 函数

- Runtime + Compiler 运行时编译
- Runtime only       vue-loader 预编译

## 编译入口
src/compiler/to-function.js createCompileToFunctionFn
src/compiler/create-compiler.js createCompilerCreator
src/compiler/index.js createCompiler createCompilerCreator
src/platforms/web/compiler/index.js createCompiler(baseOptions) -> compileToFunctions
src/platforms/web/entry-runtime-with-compiler.js $mount -> compileToFunctions
## parse * 
> 利用正则解析字符串生成抽象语法树
src/compiler/parser/index.js parse
src/compiler/parser/html-parser.js parseHTML
parse 的目标是把 template 模板字符串转换成 AST 树，它是一种用 JavaScript 对象的形式来描述整个模板。那么整个 parse 的过程是利用正则表达式顺序解析模板，当解析到开始标签、闭合标签、文本的时候都会分别执行对应的回调函数，来达到构造 AST 树的目的。

AST 元素节点总共有 3 种类型，type 为 1 表示是普通元素，为 2 表示是表达式，为 3 表示是纯文本。
## optimize
深度遍历 AST, 检测每一颗子树是不是静态节点, 静态节点生成的 DOM 永远不需要改变
- src/compiler/optimizer.js optimize: 1. 标记静态节点 2. 标记静态根

## codegen
将优化后的 AST 转换成和执行的代码
src/core/instance/render.js initRender vm._c
src/core/instance/render-helpers/index.js installRenderHelpers _l, _v

_c: createElement
_l: renderList
_v: createTextNode
_e: createEmptyNode

src/compiler/to-function.js createFunction

src/compiler/codegen/index.js generate

# event

## parse
- src/compiler/parser/index.js processAttrs -[v-on]-> addHandler
- src/compiler/helpers.js addHandler -> codegen
- src/compiler/codegen/index.js genData -> genHandlers
- src/compiler/codegen/events.js genHandlers

## DOM 事件
- src/platforms/web/runtime/modules/events.js: updateDOMListeners -> updateListeners
- src/core/vdom/helpers/update-listeners.js updateListerners -> add
- src/platforms/web/runtime/modules/events.js add

## 自定义事件

-src/core/vdom/create-component.js createComponent
-src/core/instance/init.js initInternalComponent 子组件初始化, 收到父组件传入的 listeners
- src/core/instance/events.js initEvents 处理 vm.$options._parentListeners -> updateComponentListeners
事件中心: $on, $off...

# v-model

- parse: -> el.diretives
- codegen: getData
-> src/compiler/codegen/index.js: getDirectives
- state.directives[dir.name]
- src/platforms/web/compiler/directives/index.js: directives
- src/platforms/web/compiler/directives/model.js modal

```js
with(this) {
  return _c('div',[_c('input',{
    directives:[{
      name:"model",
      rawName:"v-model",
      value:(message),
      expression:"message"
    }],
    attrs:{"placeholder":"edit me"},
    domProps:{"value":(message)},
    on:{"input":function($event){
      if($event.target.composing)
        return;
      message=$event.target.value
    }}}),_c('p',[_v("Message is: "+_s(message))])
    ])
}
```

自定义组件中可以配置 prop 名称, 以及派发的事件名称

# slot
## 普通插槽
父组件编辑和渲染阶段生成 VNode, 数据的作用域是父组件实例, 子组件渲染的时候直接拿到这些渲染好的 VNode
parse:
- src/compiler/parser/index.js: processSlotContent
codegen:
- src/compiler/codegen/index.js genData 给 data 添加一个 slot 属性
```js
with(this){
  return _c('div',
    [_c('app-layout',
      [_c('h1',{attrs:{"slot":"header"},slot:"header"},
         [_v(_s(title))]),
       _c('p',[_v(_s(msg))]),
       _c('p',{attrs:{"slot":"footer"},slot:"footer"},
         [_v(_s(desc))]
         )
       ])
     ],
   1)}
```
- genSlot -> renderSlot
- 子组件 initRender -> resolvSlots => vm.$slots
父组件应用到子组件插槽里的数据都是绑定到父组件的, slot 的 VNode 的上下文是父组件的实例

## 作用域插槽

src/compiler/parser/index.js processSlotContent
src/compiler/codegen/index.js genScopedSlots genScopedSlot
src/core/instance/render-helpers/resolve-scoped-slots.js resolveScopedSlots
编辑
genSlot -> _t -- renderSlot

父组件在编译和渲染阶段不会生成 VNode, 而是在父节点的 VNode 的 data 中保留一个 scopedSlots 对象, 存储着不同名称的插槽以及他们对应的
渲染函数. 只有在编译和渲染子组件阶段才会执行这个渲染函数生成 VNode, 由于是在子组件中执行的, 所以对应的数据作用域是子组件实例.

两种插槽的目的都是让子组件 slot 占位符生成的内容有父组件决定, 但数据的作用域会根据他们 VNode 渲染时机不同而不同

# keep-alive
- src/core/components/keep-alive.js
- render
- watch
- include
- exclude

## 首次渲染
- patch -> initComponent

## 缓存渲染
<keep-alive> -> prepatch -> updateChildComponent -> $forceUpdate -> keepAlive.render -> cachedVnode -> patch -> reactiveComponent -> insert(parentElm, vnode.elm, refElm)

## 生命周期
组件被 keep-alive, 再次渲染不再执行 created, mounted 等钩子函数.
- invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
- activateChildComponent -> callHook(vm, 'activated')
- src/core/observer/scheduler.js queueActivatedComponent 

- destroy -> deactivateChildComponent -> deactiveChildComponent -> callHook(vm, 'deactivated')

# transition
<transition> 是 web 平台特有的
- src/platforms/web/runtime/components/transition.js

## transition-module
- src/platforms/web/runtime/modules/transition.js
- entering: enter 主要发生在组件插入后
- leaving: leave 主要发生在组件销毁前

总结起来，Vue 的过渡实现分为以下几个步骤：

自动嗅探目标元素是否应用了 CSS 过渡或动画，如果是，在恰当的时机添加/删除 CSS 类名。

如果过渡组件提供了 JavaScript 钩子函数，这些钩子函数将在恰当的时机被调用。

如果没有找到 JavaScript 钩子并且也没有检测到 CSS 过渡/动画，DOM 操作 (插入/删除) 在下一帧中立即执行。

所以真正执行动画的是我们写的 CSS 或者是 JavaScript 钩子函数，而 Vue 的 <transition> 只是帮我们很好地管理了这些 CSS 的添加/删除，以及钩子函数的执行时机。

# transiton-group
列表过渡
- src/platforms/web/runtime/components/transition-group.js
## render 函数生成 vnode. -- 插入和删除的元素的缓存动画是可以实现的

## move 过渡
新增数据 -> render + updated

## beforeMount
设置 __path__() 的 removeOnly = true, updateChildren 阶段不移动 vnode 节点
## 总结
和 <transition> 组件相比，实现了列表的过渡，以及它会渲染成真实的元素。当我们去修改列表的数据的时候，如果是添加或者删除数据，则会触发相应元素本身的过渡动画，这点和 <transition> 组件实现效果一样，除此之外 <transtion-group> 还实现了 move 的过渡效果，让我们的列表过渡动画更加丰富。