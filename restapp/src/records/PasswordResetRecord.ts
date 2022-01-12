import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IResetCodeRecord} from "./IPasswordResetRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class ResetCodeRecord implements IResetCodeRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getResetCodeCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('password_reset');
        return col
    }

    async addResetCode(record: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getResetCodeCollection()?.insertOne(record, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async getResetCode(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getResetCodeCollection()?.find(filter).sort({"created_at": -1}).limit(1).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editResetCode(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getResetCodeCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

}
