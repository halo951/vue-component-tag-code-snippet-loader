import * as path from 'path'

/** 事件名转化
 * @description 将驼峰格式的事件名转化为 小写加横杠分割方式
 */
export const formatEventName = (eventName: string) => {
    eventName = `${eventName}`.replace(/([A-Z])/g, (sub) => `-${sub.toLowerCase()}`).replace(/^-/, '')
    return `@${eventName}`
}

/** 格式化标签名 */
export const formatTagName = (name: string): string => {
    return `${name}`.replace(/([A-Z])/g, (sub) => `-${sub.toLowerCase()}`).replace(/^-/, '')
}

/** 解析组件文件名
 * @description 碰到使用 `index.vue` 作为文件名时,获取上级文件夹名称做组件名
 */
export const formatComponentFileName = (filePath: string): string => {
    const basename = path.basename(filePath, '.vue')
    if (basename == 'index') {
        return path.basename(path.dirname(filePath))
    } else {
        return basename
    }
}
