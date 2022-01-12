import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IBlastGroupRecord} from "./IBlastGroupRecord";
import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";
import {v4 as uuid} from 'uuid';


@injectable()
export class BlastGroupRecord implements IBlastGroupRecord {

    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getBlastGroupCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('blast_groups');
        return col
    }

    addGroupToBlast(blast_group: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getBlastGroupCollection()?.insertOne(blast_group, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    removeGroupFromBlast = async (filter: { [name: string]: any }): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.getBlastGroupCollection()?.deleteOne(filter).then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    listBlastGroups = (filter: { [name: string]: any }): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.getBlastGroupCollection()?.find(filter).toArray().then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }
}
