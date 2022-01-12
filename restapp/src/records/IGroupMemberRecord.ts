export interface IGroupMemberRecord {

    addGroupMember(data: any): Promise<any>

    listGroupMember(filter: any): Promise<any>

    deleteGroupMember(filter: any): Promise<any>

}
