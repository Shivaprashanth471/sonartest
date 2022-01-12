import {ShiftRequirement} from "../models/ShiftRequirement";
import {Shift} from "../models/Shift";

export interface IShiftRecord {
    addShift(data: Shift): Promise<any>

    editShift(condition: any, updatedObj: any): Promise<any>

    editShifts(condition: any, updatedObj: any): Promise<any>

    getShifts(config: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>

    getShiftsOfHCP(config: any): Promise<any>

    getShiftByStatus(config: any): Promise<any>

    getHCPUserIds(config: any): Promise<any>

    getFacilityIds(config: any): Promise<any>

    viewShift(filter: { [name: string]: any }): Promise<any>
}
