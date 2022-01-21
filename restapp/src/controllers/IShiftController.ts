import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IShiftController {
    add: (req: IRouterRequest) => void
    listRequirementShifts: (req: IRouterRequest) => void
    listHCPShifts: (req: IRouterRequest) => void
    listAllShifts: (req: IRouterRequest) => void
    viewShift: (req: IRouterRequest) => void
    checkIn: (req: IRouterRequest) => void
    checkOut: (req: IRouterRequest) => void
    webCheckInOut: (req: IRouterRequest) => void
    webBreak: (req: IRouterRequest) => void
    editWebCheckInOut: (req: IRouterRequest) => void
    breakIn: (req: IRouterRequest) => void
    breakOut: (req: IRouterRequest) => void
    uploadAttachment: (req: IRouterRequest) => void
    listAttachments: (req: IRouterRequest) => void
    deleteAttachment: (req: IRouterRequest) => void
    cancel: (req: IRouterRequest) => void
    closed: (req: IRouterRequest) => void
    statusStats: (req: IRouterRequest) => void
    downloadShifts: (req: IRouterRequest) => void
}


