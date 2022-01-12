import {injectable} from "inversify";
import express = require('express');
import {IRouterRequest} from "../src/interfaces/IRouterRequest";
import {any} from "async";

@injectable()
class ExpressRouterRequest implements IRouterRequest {

    public request: express.Request | undefined
    public response: express.Response | undefined
    public is_pushed: boolean = false

    getBody(): any {
        return this.request?.body;
    }

    getParams(): any {
        return this.request?.params;
    }

    getHeaders(): any {
        return this.request?.headers;
    }

    getQueryArgs(): any {
        return this.request?.query;
    }

    next(): any {
        // @ts-ignore
        return this.request?.next();
    }

    replyBack(code: number, payload: any): any {
        if (this.is_pushed) {
            console.log("already send HTTP reply")
        } else {
            if (code < 400) {
                payload["success"] = true
            } else {
                payload["success"] = false
            }
            this.response?.status(code).send(payload)
        }
        this.is_pushed = true;
    }
}

export const wrapExpressRequest = (handler: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const expressRequest = new ExpressRouterRequest()
        expressRequest.request = req;
        expressRequest.response = res;
        handler(expressRequest);
    }
}

export default ExpressRouterRequest