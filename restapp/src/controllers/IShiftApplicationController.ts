import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IShiftApplicationController {
    newApplication: (req: IRouterRequest) => void
    withdrawApplication: (req: IRouterRequest) => void
    approveApplication: (req: IRouterRequest) => void
    rejectApplication: (req: IRouterRequest) => void
    listApplications: (req: IRouterRequest) => void
    listHCPApplications: (req: IRouterRequest) => void
}


