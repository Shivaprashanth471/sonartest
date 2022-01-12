import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IUserController {
    addUser: (req: IRouterRequest) => void
    list: (req: IRouterRequest) => void
    listLite: (req: IRouterRequest) => void
    getUser: (req: IRouterRequest) => void
    login: (req: IRouterRequest) => void
    checkLogin: (req: IRouterRequest) => void
    logout: (req: IRouterRequest) => void
    forgotPassword: (req: IRouterRequest) => void
    resetPassword: (req: IRouterRequest) => void
    sendOTP: (req: IRouterRequest) => void
    otpVerification: (req: IRouterRequest) => void
}


