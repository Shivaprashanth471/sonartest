export interface IHCPEducationRecord {

    addHCPEducation(data: any): Promise<any>

    listHCPEducation(filter: any): Promise<any>

    deleteHCPEducation(filter: any): Promise<any>


}
