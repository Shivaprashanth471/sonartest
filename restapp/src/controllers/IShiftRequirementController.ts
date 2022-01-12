import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IShiftRequirementController {
    add: (req: IRouterRequest) => void
    list: (req: IRouterRequest) => void
    view: (req: IRouterRequest) => void
    cancel: (req: IRouterRequest) => void
}


