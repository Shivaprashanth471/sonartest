import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IFacilityMemberRecord} from "./IFacilityMemberRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class FacilityMemberRecord implements IFacilityMemberRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getFacilityMemberCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('facility_members');
        return col
    }

    async addFacilityMember(record: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityMemberCollection()?.insertOne(record, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async paginate(filter: any, select: any, page: number = 1, limit: number = 20, sort: any): Promise<any> {

        return new Promise((resolve, reject) => {
            let response_data = {
                docs: [],
                page: page,
                limit: limit,
                pages: 1,
                total: 1
            };
            let async_tasks = [{
                task: this.getFacilityMemberCollection()?.find(filter, {projection: {_id: 1}}).count(),
                key: 'stats'
            }, {
                task: this.getFacilityMemberCollection()?.find(filter).limit(limit).skip((page - 1) * limit).sort(sort)
                    .project(select).toArray(),
                key: 'docs'
            }];
            async.each(async_tasks, (item: any, cb: any) => {
                item.task.then((data: any) => {
                    if (data !== undefined) {
                        if (item.key === 'stats') {
                            response_data['total'] = data;
                            response_data['pages'] = Math.ceil(data / limit)
                        } else if (item.key === 'docs') {
                            response_data['docs'] = data
                        }
                    }
                    cb();
                })
            }, (err2: any) => {
                if (err2) {
                    reject(err2);
                }
                resolve(response_data);
            });
        });
    }

    async getFacilityMember(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityMemberCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async getAllFacilityMembers(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityMemberCollection()?.find(filter).sort({created_at: -1}).toArray().then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editFacilityMember(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityMemberCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async deleteFacilityMember(filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityMemberCollection()?.deleteOne(filter).then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }
}
