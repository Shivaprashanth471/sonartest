export interface IUserRecord {

    addUser(data: any): Promise<any>

    getUser(data: any): Promise<any>

    getUsers(data: any): Promise<any>

    editUser(condition: any, data: any): Promise<any>

    paginate(filter: any, select: any, page: number, limit: number, sort: any): Promise<any>


}
