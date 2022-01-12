import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IGroupMemberRecord} from "./IGroupMemberRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class GroupMemberRecord implements IGroupMemberRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getGroupMemberCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('group_members');
        return col
    }

    async addGroupMember(record: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getGroupMemberCollection()?.insertOne(record, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async getFacilityMember(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getGroupMemberCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async listGroupMember(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getGroupMemberCollection()?.find(filter).sort({created_at: -1}).toArray().then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async deleteGroupMember(filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getGroupMemberCollection()?.deleteOne(filter).then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }
}
