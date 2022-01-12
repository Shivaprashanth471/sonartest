export interface IResetCodeRecord {
    addResetCode(data: any): Promise<any>

    getResetCode(data: any): Promise<any>

    editResetCode(condition: any, data: any): Promise<any>
}
