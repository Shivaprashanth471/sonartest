import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IFacilityController {
    addFacility: (req: IRouterRequest) => void
    list: (req: IRouterRequest) => void
    facilityDistanceList: (req: IRouterRequest) => void
    mapBasedList: (req: IRouterRequest) => void
    listLite: (req: IRouterRequest) => void
    getFacility: (req: IRouterRequest) => void
    editFacility: (req: IRouterRequest) => void

    addFacilityMember: (req: IRouterRequest) => void
    getFacilityMembers: (req: IRouterRequest) => void
    deleteFacilityMember: (req: IRouterRequest) => void

    addFacilityShift: (req: IRouterRequest) => void
    getFacilityShifts: (req: IRouterRequest) => void
    deleteFacilityShift: (req: IRouterRequest) => void

    uploadProfile: (req: IRouterRequest) => void
    deleteProfile: (req: IRouterRequest) => void
}


