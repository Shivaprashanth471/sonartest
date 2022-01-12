import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IVerificationCodeRecord} from "./IVerificationCodeRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class VerificationCodeRecord implements IVerificationCodeRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getVerificationCodeCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('verification_codes');
        return col
    }

    async addVerificationCode(record: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getVerificationCodeCollection()?.insertOne(record, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async getVerificationCode(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getVerificationCodeCollection()?.find(filter).sort({"created_at": -1}).limit(1).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editVerificationCode(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getVerificationCodeCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

}
