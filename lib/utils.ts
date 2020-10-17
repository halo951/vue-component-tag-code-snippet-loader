import * as path from 'path'
import * as fs from 'fs'

/** 递归生成文件夹 */
export const mkdirs = (dirname: string) => {
    if (!fs.existsSync(path.dirname(dirname))) mkdirs(path.dirname(dirname))
    fs.mkdirSync(dirname)
}

/** 从 .vue 文件中获取 script 脚本 */
export const matchScript = (contents: string): string => {
    let r = contents.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi)
    if (r?.length) {
        r = r.map((s) => s.replace(/<(script|\/script|script.+?)>/gi, ''))
        return r.join('\n')
    } else {
        return `export default {}`
    }
}
