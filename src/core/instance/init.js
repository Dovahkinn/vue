/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // this._init
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options 合并配置
    if (options && options._isComponent) { // 是一个组件
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor), // 构造器的初始选项
        options || {},
        vm
      )

      // 合并后:
      // vm.$options = {
      //   components: { },
      //   created: [
      //     function created() {
      //       console.log('parent created')
      //     }
      //   ],
      //   directives: { },
      //   filters: { },
      //   _base: function Vue(options) {
      //     // ...
      //   },
      //   el: "#app",
      //   render: function (h) {
      //     //...
      //   }
      // }
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm) // 初始化生命周期
    initEvents(vm) // 初始化事件中心
    initRender(vm) // 初始化渲染 $slots, $scopedSlots
    callHook(vm, 'beforeCreate') // 调用钩子
    initInjections(vm) // resolve injections before data/props
    initState(vm) // 初始化 props, methods, data, computed, watcher 等等
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) { // 根实例设置了 el
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }

  // 合并后:
  // vm.$options = {
  //   parent: Vue /*父Vue实例*/,
  //   propsData: undefined,
  //   _componentTag: undefined,
  //   _parentVnode: VNode /*父VNode实例*/,
  //   _renderChildren:undefined,
  //   __proto__: {
  //     components: { },
  //     directives: { },
  //     filters: { },
  //     _base: function Vue(options) {
  //         //...
  //     },
  //     _Ctor: {},
  //     created: [
  //       function created() {
  //         console.log('parent created')
  //       }, function created() {
  //         console.log('child created')
  //       }
  //     ],
  //     mounted: [
  //       function mounted() {
  //         console.log('child mounted')
  //       }
  //     ],
  //     data() {
  //        return {
  //          msg: 'Hello Vue'
  //        }
  //     },
  //     template: '<div>{{msg}}</div>'
  //   }
  // }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
