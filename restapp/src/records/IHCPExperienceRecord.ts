export interface IHCPExperienceRecord {

    addHCPExperience(data: any): Promise<any>

    listHCPExperience(filter: any): Promise<any>

    deleteHCPExperience(filter: any): Promise<any>


}
