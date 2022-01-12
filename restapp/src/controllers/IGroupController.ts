import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IGroupController {
    addGroup: (req: IRouterRequest) => void
    listGroup: (req: IRouterRequest) => void
    getGroup: (req: IRouterRequest) => void
    editGroup: (req: IRouterRequest) => void
    deleteGroup: (req: IRouterRequest) => void

    addGroupMember: (req: IRouterRequest) => void
    getGroupMembers: (req: IRouterRequest) => void
    deleteGroupMember: (req: IRouterRequest) => void
}


