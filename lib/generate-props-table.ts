/** 生成属性表格 */
export const generatePropsTable = (
    propList: Array<{
        name: string
        type: Array<string>
        def: any
        description: string
    }>
) => {
    const borderTop = `+-----------  props  -----------+`
    const border = `+-----------------------------+`
    const thead = `+ 属性 | 可选类型 | 默认值 | 描述 +`
    const tbody = []
    for (const prop of propList) {
        const line = [prop.name, `[${prop.type.join(', ')}]`, prop.def, prop.description]
        tbody.push(`> ${line.join(' ')}`)
    }
    const table = [borderTop, thead, border, ...tbody, border]
    return table.join('\n')
}
