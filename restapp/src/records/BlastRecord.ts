import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IBlastRecord} from "./IBlastRecord";
import {Blast} from "../models/Blast";

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class BlastRecord implements IBlastRecord {

    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getBlastCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('blasts');
        return col
    }

    async addBlast(record: Blast): Promise<any> {
       return new Promise((resolve, reject) => {
            this.getBlastCollection()?.insertOne(record, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async getBlast(filter: { [name: string]: any }): Promise<any> {
         return new Promise((resolve, reject) => {
            this.getBlastCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async getAllBlasts(filter: { [name: string]: any }): Promise<any> {
         return new Promise((resolve, reject) => {
            this.getBlastCollection()?.find(filter).toArray().then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editBlast(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getBlastCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }
}
