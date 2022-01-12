import {IRouterRequest} from "../interfaces/IRouterRequest";

export interface IMetaController {
    hcpSpecialities: (req: IRouterRequest) => void
    hcpRegions: (req: IRouterRequest) => void
    hcpAttachmentTypes: (req: IRouterRequest) => void
    hcpTypes: (req: IRouterRequest) => void
}


