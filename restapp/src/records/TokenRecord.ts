import {inject, injectable} from "inversify";
import "reflect-metadata";
import {ITokenRecord} from "./ITokenRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class TokenRecord implements ITokenRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getTokenCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('tokens');
        return col
    }

    async addToken(record: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getTokenCollection()?.insertOne(record, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async getToken(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getTokenCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }


    async editToken(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getTokenCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

}
