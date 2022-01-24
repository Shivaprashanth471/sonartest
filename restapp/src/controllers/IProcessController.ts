import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IProcessController {
    shiftReminder: (req: IRouterRequest) => void
    unfilledRequirements: (req: IRouterRequest) => void
}
