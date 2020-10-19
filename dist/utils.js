"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchScript = exports.mkdirs = void 0;
const path = require("path");
const fs = require("fs");
/** 递归生成文件夹 */
exports.mkdirs = (dirname) => {
    if (!fs.existsSync(path.dirname(dirname)))
        exports.mkdirs(path.dirname(dirname));
    fs.mkdirSync(dirname);
};
/** 从 .vue 文件中获取 script 脚本 */
exports.matchScript = (contents) => {
    let r = contents.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
    if (r === null || r === void 0 ? void 0 : r.length) {
        r = r.map((s) => s.replace(/<(script|\/script|script.+?)>/gi, ''));
        return r.join('\n');
    }
    else {
        return `export default {}`;
    }
};
//# sourceMappingURL=utils.js.map