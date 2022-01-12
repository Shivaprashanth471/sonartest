import {Blast} from "../models/Blast";

export interface IBlastRecord {
    addBlast(data: Blast): Promise<any>

    getAllBlasts(data: any): Promise<Blast[]>

    getBlast(data: any): Promise<Blast>

    editBlast(condition: any, updateObj: any): Promise<any>
}
