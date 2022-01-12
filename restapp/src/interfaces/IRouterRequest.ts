export interface IRouterRequest {
    getBody(): any

    replyBack(code: number, payload: any): any

    getHeaders(): any

    getParams(): any

    getQueryArgs(): any

    next(): any
}