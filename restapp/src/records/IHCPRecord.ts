export interface IHCPRecord {

    addHCP(data: any): Promise<any>

    getHCP(data: any): Promise<any>

    getHCPs(data: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>

    editHCP(condition: any, updatedObject: any): Promise<any>

}
