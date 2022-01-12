export interface IGroupRecord {

    addGroup(data: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>

    deleteGroup(filter: any): Promise<any>

    getGroup(filter: any): Promise<any>

    editGroup(condition: any, data: any): Promise<any>

}
