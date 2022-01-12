export interface ITokenRecord {

    addToken(data: any): Promise<any>

    getToken(data: any): Promise<any>

    editToken(condition: any, data: any): Promise<any>

}
