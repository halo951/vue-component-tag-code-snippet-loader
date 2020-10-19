/** 事件名转化
 * @description 将驼峰格式的事件名转化为 小写加横杠分割方式
 */
export declare const formatEventName: (eventName: string) => string;
/** 格式化标签名 */
export declare const formatTagName: (name: string) => string;
/** 解析组件文件名
 * @description 碰到使用 `index.vue` 作为文件名时,获取上级文件夹名称做组件名
 */
export declare const formatComponentFileName: (filePath: string) => string;
