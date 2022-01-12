export interface IVerificationCodeRecord {
    addVerificationCode(data: any): Promise<any>

    getVerificationCode(data: any): Promise<any>

    editVerificationCode(condition: any, data: any): Promise<any>
}
