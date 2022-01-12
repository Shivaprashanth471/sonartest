import {ShiftRequirement} from "../models/ShiftRequirement";

export interface IShiftRequirementRecord {
    addRequirement(data: ShiftRequirement): Promise<any>

    bulkAddRequirements(data: any): Promise<any>

    getRequirement(filter: any): Promise<any>

    editRequirement(filter: any, updateObj: any): Promise<any>

    getAllRequirements(data: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>

    getFacilityRequirements(data: any): Promise<any>

    getFacilityRequirementsCount(data: any): Promise<any>
}
