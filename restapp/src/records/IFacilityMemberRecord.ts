export interface IFacilityMemberRecord {

    addFacilityMember(data: any): Promise<any>

    getFacilityMember(data: any): Promise<any>

    getAllFacilityMembers(data: any): Promise<any>

    deleteFacilityMember(data: any): Promise<any>

    editFacilityMember(condition: any, updateObj: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>

}
