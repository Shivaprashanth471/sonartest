import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IBlastsController {
    addBlast: (req: IRouterRequest) => void
    listBlasts: (req: IRouterRequest) => void
    editBlast: (req: IRouterRequest) => void
    execute: (req: IRouterRequest) => void
    addGroupToBlast: (req: IRouterRequest) => void
    listBlastGroups: (req: IRouterRequest) => void
    removeGroupFromBlast: (req: IRouterRequest) => void
}