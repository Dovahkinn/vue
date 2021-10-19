import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 定义类
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue) // 不通过 new 调用
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // new Vue 调用
  this._init(options)
}

// 对 Vue 进行扩展
initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
// 扩展渲染 _render
renderMixin(Vue)

export default Vue
