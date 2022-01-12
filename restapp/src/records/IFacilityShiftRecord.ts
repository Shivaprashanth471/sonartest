export interface IFacilityShiftRecord {

    addFacilityShift(data: any): Promise<any>

    getFacilityShift(data: any): Promise<any>

    getAllFacilityShifts(data: any): Promise<any>

    deleteFacilityShift(data: any): Promise<any>

    editFacilityShift(condition: any, updateObj: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>

}
