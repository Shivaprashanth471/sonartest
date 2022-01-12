import {IRouterRequest} from "./interfaces/IRouterRequest";

export interface IMiddleware {
    ParseJWToken: (req: IRouterRequest) => void
    RoleCheck: (roles: Array<string>) => void
}