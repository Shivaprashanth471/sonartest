import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IHCPController {
    addHCP: (req: IRouterRequest) => void
    listHCP: (req: IRouterRequest) => void
    listLiteHCP: (req: IRouterRequest) => void
    getHCP: (req: IRouterRequest) => void
    getHCPByUserID: (req: IRouterRequest) => void
    editHCP: (req: IRouterRequest) => void
    approveHCP: (req: IRouterRequest) => void
    rejectHCP: (req: IRouterRequest) => void

    addHCPEducation: (req: IRouterRequest) => void
    listHCPEducation: (req: IRouterRequest) => void
    removeHCPEducation: (req: IRouterRequest) => void

    addHCPExperiance: (req: IRouterRequest) => void
    listHCPExperiance: (req: IRouterRequest) => void
    removeHCPExperiance: (req: IRouterRequest) => void


    addHCPReference: (req: IRouterRequest) => void
    listHCPReference: (req: IRouterRequest) => void
    removeHCPReference: (req: IRouterRequest) => void


    addHCPAttachment: (req: IRouterRequest) => void
    listHCPAttachment: (req: IRouterRequest) => void
    removeHCPAttachment: (req: IRouterRequest) => void

    addHCPContract: (req: IRouterRequest) => void
    getHCPContract: (req: IRouterRequest) => void
    removeHCPContract: (req: IRouterRequest) => void

    editHCPProfile: (req: IRouterRequest) => void
    getHCProfile: (req: IRouterRequest) => void
}


