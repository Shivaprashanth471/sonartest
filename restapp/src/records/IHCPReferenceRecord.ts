export interface IHCPReferenceRecord {

    addHCPReference(data: any): Promise<any>

    listHCPReference(filter: any): Promise<any>

    deleteHCPReference(filter: any): Promise<any>
    
}
