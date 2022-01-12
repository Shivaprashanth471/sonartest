export interface ITable {
    insertOne(data: any): Promise<any>

    findOne(query: any): Promise<any>

    findAll(query : any): Promise<any>

    insertMany(condition:any,updateObj: any): Promise<any>

    delete(data: any): Promise<any>

    paginate(data: any): Promise<any>
}
