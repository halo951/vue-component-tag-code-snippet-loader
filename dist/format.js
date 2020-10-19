"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatComponentFileName = exports.formatTagName = exports.formatEventName = void 0;
const path = require("path");
/** 事件名转化
 * @description 将驼峰格式的事件名转化为 小写加横杠分割方式
 */
exports.formatEventName = (eventName) => {
    eventName = `${eventName}`.replace(/([A-Z])/g, (sub) => `-${sub.toLowerCase()}`).replace(/^-/, '');
    return `@${eventName}`;
};
/** 格式化标签名 */
exports.formatTagName = (name) => {
    return `${name}`.replace(/([A-Z])/g, (sub) => `-${sub.toLowerCase()}`).replace(/^-/, '');
};
/** 解析组件文件名
 * @description 碰到使用 `index.vue` 作为文件名时,获取上级文件夹名称做组件名
 */
exports.formatComponentFileName = (filePath) => {
    const basename = path.basename(filePath, '.vue');
    if (basename == 'index') {
        return path.basename(path.dirname(filePath));
    }
    else {
        return basename;
    }
};
//# sourceMappingURL=format.js.map