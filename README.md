# vue-component-tag-code-snippet-loader

> vue 组件标签代码片段生成工具, 用于动态更新当前项目内引用组件提示工具

## usage

-   安装: yarn add vue-component-tag-code-snippet-loader
-   在 vue.config.js 中,添加 loader 规则
-   具体配置项在 [file](./lib/index.ts)

```
// 参数
{
    // 是否打印日志
    debug: false,
    // 根据项目, 选择不同的组件扫描目录. 支持,正则 和 glob语法 匹配.
    filter: ['./src/component/**/*.vue'],
    // 输出文件路径, 默认直接输出到vscode目录下,一般情况下,不需要去动
    out: `${process.cwd()}/.vscode/vue-component-tag.code-snippets`,
    // 生成延时
    delay: 500,
    // 全局参数, 因为采用 module.constructor() 方式初始化vue, 会抹除全局变量和方法引用.
    // 导致的变量丢失报错问题, 通过这个参数解决
    global: {
        window: {}
    }
}
// 参考示例
module: {
    rules: [
        {
            test: /\.vue$/i,
            use: [
                {
                    loader: 'vue-component-tag-code-snippet-loader',
                    options: {
                        filter: ['src/components/**/*.vue'] //
                    }
                }
            ]
        }
    ]
}
```

### 输出提示示例

> 模板文件在: [link](./code-snippet-template.txt)

```
组件: <compoent>
路径: /相对路径
附加描述: (此项存在时,再渲染)
┏━━━━━━━━━━━ props ━━━━━━━━━━━┓
┃ 属性 | 可选类型 | 默认值 ┃ 描述 ┃
┃┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┃
┃                             ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
----------> emits <------------
  @event

```
