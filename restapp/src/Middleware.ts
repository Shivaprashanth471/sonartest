import {injectable} from "inversify";
import {IRouterRequest} from "./interfaces/IRouterRequest";
import {IMiddleware} from "./IMiddleware"
import express = require('express');

import {ITokenRecord} from "./records/ITokenRecord";
import {TYPES} from "./types";

import {container} from "./app";
import jsonwebtoken from 'jsonwebtoken';

@injectable()
export class Middleware implements IMiddleware {

    ParseJWToken = async (req: IRouterRequest) => {
        try {
            const tokenRecord = container.get<ITokenRecord>(TYPES.ITokenRecord);

            let token;
            const authHeader = req.getHeaders();
            const bearerHeader = authHeader["authorization"];

            if (bearerHeader) {
                const bearer = bearerHeader.split(" ");
                token = bearer[1];

                let response = await tokenRecord.getToken({token, is_active: true})
                if (response != null) {
                    const JWT_SECRET = process.env.JWT_SECRET || "default"
                    const jsonPayload = jsonwebtoken.verify(token, JWT_SECRET);

                    // @ts-ignore
                    if (jsonPayload && jsonPayload["_id"] == response["user_id"]) {
                        // @ts-ignore
                        req["decoded"] = jsonPayload
                        return req.next()
                    } else {
                        return req.replyBack(403, {error: "User not logged in"});
                    }

                } else {
                    return req.replyBack(403, {error: "User not logged in"});
                }

            } else {
                req.replyBack(401, {error: "Authorization headers need to be passed"})
            }

        } catch (e) {
            console.log("error error", e)
            req.replyBack(500, {error: "error while parsing jwt token", errors: e})
        }
    }

    RoleCheck = async (roles: Array<string>) => {
        return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            res.status(200).send({"hey": "bye"})
            try {
                console.log("########3", req)
                console.log("in role che, ck", roles)
                next()
            } catch (e) {
                console.log("rerror in middleware", e)
                // req.repl({http_code: 500, error: 'error while parsing jwt token', errors: e.message})
            }
        }
    }

}


