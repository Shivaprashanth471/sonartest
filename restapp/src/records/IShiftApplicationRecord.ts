import {ShiftRequirement} from "../models/ShiftRequirement";

export interface IShiftApplicationRecord {
    addApplication(data: any): Promise<any>

    getApplication(filter: any): Promise<any>

    getApplications(filter: any): Promise<any>

    editApplication(filter: any, updateObj: any): Promise<any>

    editApplications(filter: any, updateObj: any): Promise<any>

    listHCPApplicationsByStatus(hcp_user_id: string, filter: any | undefined): Promise<any>

    getHCPApplication(requirement_id: string, hcp_user_id: string, filter: any | undefined): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>
}