"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePropsTable = void 0;
/** 生成属性表格 */
exports.generatePropsTable = (propList) => {
    const borderTop = `+-----------  props  -----------+`;
    const border = `+-----------------------------+`;
    const thead = `+ 属性 | 可选类型 | 默认值 | 描述 +`;
    const tbody = [];
    for (const prop of propList) {
        const line = [prop.name, `[${prop.type.join(', ')}]`, prop.def, prop.description];
        tbody.push(`> ${line.join(' ')}`);
    }
    const table = [borderTop, thead, border, ...tbody, border];
    return table.join('\n');
};
//# sourceMappingURL=generate-props-table.js.map