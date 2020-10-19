export interface LoaderOptions {
    /** 是否开启debug模式
     */
    debug?: boolean;
    /** 过滤来源
     * @description 支持glob语法, 校验相对路径
     */
    filter: string | Array<string> | RegExp;
    /** 导出文件路径
     */
    out: string;
    /** 代码片段生成延时
     */
    delay?: number;
    /** 项目内存在的全局变量.
     * @description 如果在扫描过程中出现了使用
     */
    global?: {
        [key: string]: any;
    };
}
/**
 * @description 抛出事件对象
 *
 * @author Libin
 * @date 2020-10-15 17:20
 */
export declare class EmitEvent {
    eventName: string;
    description: string;
    constructor(eventName: string, description: string);
}
