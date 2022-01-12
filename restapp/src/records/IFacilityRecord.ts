export interface IFacilityRecord {

    addFacility(data: any): Promise<any>

    getFacility(data: any): Promise<any>

    getFacilities(data: any): Promise<any>

    editFacility(condition: any, updateObj: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>

    aggregate(data: any): Promise<any>
}
