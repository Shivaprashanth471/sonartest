import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IHCPEducationRecord} from "./IHCPEducationRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class HCPEducationRecord implements IHCPEducationRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getHCPEducationCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('hcps_education');
        return col
    }

    addHCPEducation = (record: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.getHCPEducationCollection()?.insertOne(record, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }


    listHCPEducation = (filter: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.getHCPEducationCollection()?.find(filter).sort({created_at: -1}).toArray().then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async deleteHCPEducation(filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getHCPEducationCollection()?.deleteOne(filter).then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

}
