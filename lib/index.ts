import * as path from 'path'
import * as fs from 'fs'
import * as isGlob from 'is-glob'
import * as micromatch from 'micromatch'
import webpack from 'webpack'
import * as loaderUtils from 'loader-utils'
import * as babel from '@babel/core'
import { mkdirs, matchScript } from './utils'
import { LoaderOptions, EmitEvent } from './interfaces'
import { generatePropsTable } from './generate-props-table'
import { formatTagName, formatEventName, formatComponentFileName } from './format'

/** 默认参数 */
const DEFAULT_OPTIONS: LoaderOptions = {
    debug: false,
    filter: ['./src/component/**/*.vue'],
    out: `${process.cwd()}/.vscode/vue-component-tag.code-snippets`,
    delay: 500,
    global: {
        window: {}
    }
}
// 已加载组件缓存
const COMPONENT_CAHCE: {
    [tagName: string]: {
        filePath: string
        name: string
        tagName: string
        description: string
        propList: Array<{
            name: string
            type: Array<string>
            def: any
            description: string
        }>
        events: Array<EmitEvent>
        slots: boolean
    }
} = {}
// 缓存变量
let timer, lock, log, debug
// 缓存变量
let prefixTemplate, codeSnippetDescriptionTemplate

export const logger = (...msg) => debug && console.log(...msg)
/** 获取loader参数 */
const getLoaderOptions = (loaderContext: webpack.loader.LoaderContext): LoaderOptions => {
    const opt: any = loaderUtils.getOptions(loaderContext)
    return { ...DEFAULT_OPTIONS, ...opt }
}

/** 路径过滤 */
const filterPath = (path: string, options: LoaderOptions): boolean => {
    const { filter } = options
    if (!/\.vue$/i.test(path)) return false
    if (!filter) return true
    const matching = (rule: string | RegExp): boolean => {
        if (typeof rule === 'string' && isGlob(rule)) return micromatch.isMatch(path, rule)
        else if (typeof rule === 'string' && !isGlob(rule)) return rule === path
        else if (rule instanceof RegExp) return rule.test(path)
        return false
    }
    let isMatched = false
    if (filter instanceof Array) {
        for (const rule of filter) {
            isMatched = matching(rule)
            if (isMatched) break
        }
    } else {
        isMatched = matching(filter)
    }
    return isMatched
}

/** 填充全局变量 */
const fillGlobalCode = (script: string, options: LoaderOptions): string => {
    if (!prefixTemplate) {
        prefixTemplate = ''
        for (let key in options.global) prefixTemplate += `const ${key} = ${JSON.stringify(options.global[key])};`
    }
    return `${prefixTemplate}\n${script}`
}
/** 解析script脚本, 从构造参数中,获取需要的变量
 * @returns {name:string, description:string, props:any}
 */
const parseScript = (
    filePath: string,
    script: string,
    options: LoaderOptions
): { name: string; description: string; props: any } => {
    const m = new (module.constructor as any)()
    const fn = path.basename(filePath)
    const res = babel.transform(script, {
        filename: fn,
        babelrc: false,
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-modules-commonjs']
    })
    try {
        // 这里通过正则,将所有导入方法筛选掉
        res.code = res.code?.replace(/require\(.+?\)/gim, '{}')
        // 填充全局变量
        res.code = fillGlobalCode(res.code, options)
        m._compile(res.code, filePath)
    } catch (error) {
        if (options.debug) console.error(`解析错误 - path:${filePath}`, '\n', error)
        return { name: null, description: null, props: null }
    }
    if (!m.exports.default) return { name: null, description: null, props: null }
    const { name, description, props } = m.exports.default
    return { name, description, props }
}

/** 通过正则扫描抛出事件名称
 * @version 1.0.1 版本新增,从脚本的 @emit 注释中采集事件
 */
const regScan = (script: string): { events: Array<EmitEvent>; slots: boolean } => {
    // 写不出来,就这样了...
    const reg = /\.\$emit\([ ]{0,}['|"]([0-9a-zA-Z-_]+)['|"].+?\)/gi
    const reg1 = /\.\$emit\([ ]{0,}['|"]([0-9a-zA-Z-_]+)['|"][ ]{0,}\)/gi

    const regComment = /\* @emits (.+?)\n/gim
    let events: Array<EmitEvent> = []
    // 按正字匹配到字符串
    let es: Array<string> = [...script.replace(/\n/gim, '\b').match(reg), ...script.replace(/\n/gim, '\b').match(reg1)]
    let commentEvents = script.match(regComment)

    if (es) {
        // 提取事件名
        es = es.map((e) => e.replace(reg, (_sub, $1) => $1).replace(reg1, (_sub, $1) => $1))
        es = Array.from(new Set(es))
        events = es.map((e) => {
            return {
                eventName: e,
                description: null
            }
        })
    }
    if (commentEvents) {
        for (const str of commentEvents) {
            const [_all, event, description] = str.match(/@emits (.+?) (.+?)\n/)
            let e = events.find((e) => e.eventName == event)
            if (e) e.description = description
        }
    }
    return { events, slots: /<slot*>/.test(script) }
}

const cache = ({ filePath, fn, name, description, props, events, slots }) => {
    let propList = []
    if (props) {
        for (let k in props) {
            if (typeof props[k] == 'function') {
                let type = `${props[k].prototype.constructor.name}`.toLocaleLowerCase()
                propList.push({ name: k, type: [type], def: undefined })
                continue
            } else if (typeof props[k] == 'object') {
                if (props[k] instanceof Array) {
                    let type = props[k].map((p) => `${p.prototype.constructor.name}`.toLocaleLowerCase())
                    propList.push({ name: k, type: [...type] })
                    continue
                } else if (props[k].type) {
                    let type = [],
                        def,
                        description
                    if (props[k].type instanceof Array) {
                        type = props[k].type.map((p) => `${p.prototype.constructor.name}`.toLocaleLowerCase())
                    } else {
                        type = [`${props[k].type.prototype.constructor.name}`.toLocaleLowerCase()]
                    }
                    if (props[k].default && ['boolean', 'number', 'string'].find((t) => t == typeof props[k].default)) {
                        def = props[k].default
                    }
                    if (props[k].description) {
                        description = `${props[k].description}`
                    }
                    propList.push({ name: k, type: [...type], def, description })
                }
            }
        }
    }
    let obj = {
        filePath,
        name: name || fn,
        tagName: formatTagName(name || fn),
        description,
        propList,
        events,
        slots
    }
    logger(JSON.stringify(obj))
    COMPONENT_CAHCE[obj.name] = obj
}
/** 获取代码片段注释模板 */
const getCodeSnippetDescriptionTemplate = () => {
    if (!codeSnippetDescriptionTemplate) {
        codeSnippetDescriptionTemplate = fs.readFileSync(
            path.resolve(__dirname, '../code-snippet-description-template.txt'),
            {
                encoding: 'utf-8'
            }
        )
        const cleanComment = (text) => {
            let start = text.indexOf('```')
            if (start === -1) return text
            let end = text.indexOf('```', start + 3)
            if (end === -1) end = text.length
            text = text.substring(0, start) + text.substring(end + 3, text.length)
            return cleanComment(text)
        }
        codeSnippetDescriptionTemplate = cleanComment(codeSnippetDescriptionTemplate)
    }
    return codeSnippetDescriptionTemplate
}

const generateCodeSnippets = () => {
    const out = {}
    for (let k in COMPONENT_CAHCE) {
        const component = COMPONENT_CAHCE[k]
        let description: string = getCodeSnippetDescriptionTemplate()
        const tagName = component.slots ? `<${component.tagName} ></${component.tagName}>` : `<${component.tagName} />`
        const propsTableData = generatePropsTable(component.propList)

        const eventsLine = (component.events || [])
            .map((e) => {
                return `${formatEventName(e.eventName)} | ${e.description || ''}`
            })
            .join('\n')
        description = description
            .replace(/#component-tag/g, tagName)
            .replace(/#has-slot/g, component.slots ? '是' : '否')
            .replace(/#relative-path/g, component.filePath)
            .replace(/#description/g, component.description || '无')
            .replace(/#props/g, propsTableData)
            .replace(/#events/g, eventsLine)

        const snippets = {
            prefix: tagName,
            description,
            body: [tagName]
        }
        out[component.name] = snippets
    }
    return JSON.stringify(out, null, 2)
}
const write = async (options: LoaderOptions) => {
    // 生成最新的输出文件内容
    let latest = generateCodeSnippets()
    // 判断是否有上次记录
    if (!log && fs.existsSync(options.out)) {
        // 尝试加载./vscode中记录
        log = fs.readFileSync(options.out, { encoding: 'utf-8' })
    }
    // diff
    if (log === latest) return
    log = latest
    // 目录缺失补充
    const dirname = path.dirname(options.out)
    if (!fs.existsSync(dirname)) mkdirs(dirname)
    logger('触发代码片段更新', log)
    // 如果不一致输出
    fs.writeFileSync(options.out, log, { encoding: 'utf8' })
}

/** 触发更新操作 */
const trigger = (options: LoaderOptions) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
        // 清理计时器
        clearTimeout(timer)
        // 触发写入操作
        // 为了避免影响生成结果. 如果,写入文件时二次触发更新,那么直接忽略
        if (!lock) {
            lock = true
            write(options).finally(() => (lock = false))
        }
    }, options.delay)
}

/** 解析vue文件, 异步获取信息 */
const parse = async (filePath: string, contents: string, options: LoaderOptions): Promise<void> => {
    // parse
    const fn = formatComponentFileName(filePath)
    const script = matchScript(contents)
    // 解析文件内描述信息
    let { name, description, props } = parseScript(filePath, script, options)
    // 通过正则从vue文件里面找 $emit 事件
    let { events, slots } = regScan(script)
    // cache
    cache({ fn, name, description, props, events, slots, filePath })
    // trigger
    trigger(options)
}

/** loader 入口 */
export default function(source: string) {
    this.cacheable?.() // 获取loader参数
    const options = getLoaderOptions(this)
    if (options.debug) debug = options.debug
    logger('vue component tag code snippet options\n', JSON.stringify(options, null, 2))
    // // 获取vue文件相对路径
    const relativePath = path.relative(process.cwd(), this.resourcePath)
    // 文件路径过滤, 被过滤掉,就跳出
    if (!filterPath(relativePath, options)) return source
    logger('scan', relativePath)
    // 触发异步读取操作
    parse(relativePath, source, options)
    return source
}

/**
 * expose public types via declaration merging
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace loader {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface Options extends LoaderOptions {}
}
