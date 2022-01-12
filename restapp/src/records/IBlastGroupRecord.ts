export interface IBlastGroupRecord {
    addGroupToBlast(blast_group: any): Promise<any>

    listBlastGroups(data: any): Promise<any>

    removeGroupFromBlast(data: any): Promise<any>
}
