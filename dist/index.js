"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const path = require("path");
const fs = require("fs");
const isGlob = require("is-glob");
const micromatch = require("micromatch");
const loaderUtils = require("loader-utils");
const babel = require("@babel/core");
const utils_1 = require("./utils");
const generate_props_table_1 = require("./generate-props-table");
const format_1 = require("./format");
/** 默认参数 */
const DEFAULT_OPTIONS = {
    debug: false,
    filter: ['./src/component/**/*.vue'],
    out: `${process.cwd()}/.vscode/vue-component-tag.code-snippets`,
    delay: 500,
    global: {
        window: {}
    }
};
// 已加载组件缓存
const COMPONENT_CAHCE = {};
// 缓存变量
let timer, lock, log, debug;
// 缓存变量
let prefixTemplate, codeSnippetDescriptionTemplate;
exports.logger = (...msg) => debug && console.log(...msg);
/** 获取loader参数 */
const getLoaderOptions = (loaderContext) => {
    const opt = loaderUtils.getOptions(loaderContext);
    return Object.assign(Object.assign({}, DEFAULT_OPTIONS), opt);
};
/** 路径过滤 */
const filterPath = (path, options) => {
    const { filter } = options;
    if (!/\.vue$/i.test(path))
        return false;
    if (!filter)
        return true;
    const matching = (rule) => {
        if (typeof rule === 'string' && isGlob(rule))
            return micromatch.isMatch(path, rule);
        else if (typeof rule === 'string' && !isGlob(rule))
            return rule === path;
        else if (rule instanceof RegExp)
            return rule.test(path);
        return false;
    };
    let isMatched = false;
    if (filter instanceof Array) {
        for (const rule of filter) {
            isMatched = matching(rule);
            if (isMatched)
                break;
        }
    }
    else {
        isMatched = matching(filter);
    }
    return isMatched;
};
/** 填充全局变量 */
const fillGlobalCode = (script, options) => {
    if (!prefixTemplate) {
        prefixTemplate = '';
        for (let key in options.global)
            prefixTemplate += `const ${key} = ${JSON.stringify(options.global[key])};`;
    }
    return `${prefixTemplate}\n${script}`;
};
/** 解析script脚本, 从构造参数中,获取需要的变量
 * @returns {name:string, description:string, props:any}
 */
const parseScript = (filePath, script, options) => {
    var _a;
    const m = new module.constructor();
    const fn = path.basename(filePath);
    const res = babel.transform(script, {
        filename: fn,
        babelrc: false,
        presets: ['@babel/preset-env'],
        plugins: ['@babel/plugin-transform-modules-commonjs']
    });
    try {
        // 这里通过正则,将所有导入方法筛选掉
        res.code = (_a = res.code) === null || _a === void 0 ? void 0 : _a.replace(/require\(.+?\)/gim, '{}');
        // 填充全局变量
        res.code = fillGlobalCode(res.code, options);
        m._compile(res.code, filePath);
    }
    catch (error) {
        if (options.debug)
            console.error(`解析错误 - path:${filePath}`, '\n', error);
        return { name: null, description: null, props: null };
    }
    if (!m.exports.default)
        return { name: null, description: null, props: null };
    const { name, description, props } = m.exports.default;
    return { name, description, props };
};
/** 通过正则扫描抛出事件名称
 * @version 1.0.1 版本新增,从脚本的 @emit 注释中采集事件
 */
const regScan = (script) => {
    // 写不出来,就这样了...
    const reg = /\.\$emit\([ ]{0,}['|"]([0-9a-zA-Z-_]+)['|"].+?\)/gi;
    const reg1 = /\.\$emit\([ ]{0,}['|"]([0-9a-zA-Z-_]+)['|"][ ]{0,}\)/gi;
    const regComment = /\* @emits (.+?)\n/gim;
    let events = [];
    // 按正字匹配到字符串
    let es = [...script.replace(/\n/gim, '\b').match(reg), ...script.replace(/\n/gim, '\b').match(reg1)];
    let commentEvents = script.match(regComment);
    if (es) {
        // 提取事件名
        es = es.map((e) => e.replace(reg, (_sub, $1) => $1).replace(reg1, (_sub, $1) => $1));
        es = Array.from(new Set(es));
        events = es.map((e) => {
            return {
                eventName: e,
                description: null
            };
        });
    }
    if (commentEvents) {
        for (const str of commentEvents) {
            const [_all, event, description] = str.match(/@emits (.+?) (.+?)\n/);
            let e = events.find((e) => e.eventName == event);
            if (e)
                e.description = description;
        }
    }
    return { events, slots: /<slot*>/.test(script) };
};
const cache = ({ filePath, fn, name, description, props, events, slots }) => {
    let propList = [];
    if (props) {
        for (let k in props) {
            if (typeof props[k] == 'function') {
                let type = `${props[k].prototype.constructor.name}`.toLocaleLowerCase();
                propList.push({ name: k, type: [type], def: undefined });
                continue;
            }
            else if (typeof props[k] == 'object') {
                if (props[k] instanceof Array) {
                    let type = props[k].map((p) => `${p.prototype.constructor.name}`.toLocaleLowerCase());
                    propList.push({ name: k, type: [...type] });
                    continue;
                }
                else if (props[k].type) {
                    let type = [], def, description;
                    if (props[k].type instanceof Array) {
                        type = props[k].type.map((p) => `${p.prototype.constructor.name}`.toLocaleLowerCase());
                    }
                    else {
                        type = [`${props[k].type.prototype.constructor.name}`.toLocaleLowerCase()];
                    }
                    if (props[k].default && ['boolean', 'number', 'string'].find((t) => t == typeof props[k].default)) {
                        def = props[k].default;
                    }
                    if (props[k].description) {
                        description = `${props[k].description}`;
                    }
                    propList.push({ name: k, type: [...type], def, description });
                }
            }
        }
    }
    let obj = {
        filePath,
        name: name || fn,
        tagName: format_1.formatTagName(name || fn),
        description,
        propList,
        events,
        slots
    };
    exports.logger(JSON.stringify(obj));
    COMPONENT_CAHCE[obj.name] = obj;
};
/** 获取代码片段注释模板 */
const getCodeSnippetDescriptionTemplate = () => {
    if (!codeSnippetDescriptionTemplate) {
        codeSnippetDescriptionTemplate = fs.readFileSync(path.resolve(__dirname, '../code-snippet-description-template.txt'), {
            encoding: 'utf-8'
        });
        const cleanComment = (text) => {
            let start = text.indexOf('```');
            if (start === -1)
                return text;
            let end = text.indexOf('```', start + 3);
            if (end === -1)
                end = text.length;
            text = text.substring(0, start) + text.substring(end + 3, text.length);
            return cleanComment(text);
        };
        codeSnippetDescriptionTemplate = cleanComment(codeSnippetDescriptionTemplate);
    }
    return codeSnippetDescriptionTemplate;
};
const generateCodeSnippets = () => {
    const out = {};
    for (let k in COMPONENT_CAHCE) {
        const component = COMPONENT_CAHCE[k];
        let description = getCodeSnippetDescriptionTemplate();
        const tagName = component.slots ? `<${component.tagName} ></${component.tagName}>` : `<${component.tagName} />`;
        const propsTableData = generate_props_table_1.generatePropsTable(component.propList);
        const eventsLine = (component.events || [])
            .map((e) => {
            return `${format_1.formatEventName(e.eventName)} | ${e.description || ''}`;
        })
            .join('\n');
        description = description
            .replace(/#component-tag/g, tagName)
            .replace(/#has-slot/g, component.slots ? '是' : '否')
            .replace(/#relative-path/g, component.filePath)
            .replace(/#description/g, component.description || '无')
            .replace(/#props/g, propsTableData)
            .replace(/#events/g, eventsLine);
        const snippets = {
            prefix: tagName,
            description,
            body: [tagName]
        };
        out[component.name] = snippets;
    }
    return JSON.stringify(out, null, 2);
};
const write = (options) => __awaiter(void 0, void 0, void 0, function* () {
    // 生成最新的输出文件内容
    let latest = generateCodeSnippets();
    // 判断是否有上次记录
    if (!log && fs.existsSync(options.out)) {
        // 尝试加载./vscode中记录
        log = fs.readFileSync(options.out, { encoding: 'utf-8' });
    }
    // diff
    if (log === latest)
        return;
    log = latest;
    // 目录缺失补充
    const dirname = path.dirname(options.out);
    if (!fs.existsSync(dirname))
        utils_1.mkdirs(dirname);
    exports.logger('触发代码片段更新', log);
    // 如果不一致输出
    fs.writeFileSync(options.out, log, { encoding: 'utf8' });
});
/** 触发更新操作 */
const trigger = (options) => {
    if (timer)
        clearTimeout(timer);
    timer = setTimeout(() => {
        // 清理计时器
        clearTimeout(timer);
        // 触发写入操作
        // 为了避免影响生成结果. 如果,写入文件时二次触发更新,那么直接忽略
        if (!lock) {
            lock = true;
            write(options).finally(() => (lock = false));
        }
    }, options.delay);
};
/** 解析vue文件, 异步获取信息 */
const parse = (filePath, contents, options) => __awaiter(void 0, void 0, void 0, function* () {
    // parse
    const fn = format_1.formatComponentFileName(filePath);
    const script = utils_1.matchScript(contents);
    // 解析文件内描述信息
    let { name, description, props } = parseScript(filePath, script, options);
    // 通过正则从vue文件里面找 $emit 事件
    let { events, slots } = regScan(script);
    // cache
    cache({ fn, name, description, props, events, slots, filePath });
    // trigger
    trigger(options);
});
/** loader 入口 */
function default_1(source) {
    var _a;
    (_a = this.cacheable) === null || _a === void 0 ? void 0 : _a.call(this); // 获取loader参数
    const options = getLoaderOptions(this);
    if (options.debug)
        debug = options.debug;
    exports.logger('vue component tag code snippet options\n', JSON.stringify(options, null, 2));
    // // 获取vue文件相对路径
    const relativePath = path.relative(process.cwd(), this.resourcePath);
    // 文件路径过滤, 被过滤掉,就跳出
    if (!filterPath(relativePath, options))
        return source;
    exports.logger('scan', relativePath);
    // 触发异步读取操作
    parse(relativePath, source, options);
    return source;
}
exports.default = default_1;
//# sourceMappingURL=index.js.map