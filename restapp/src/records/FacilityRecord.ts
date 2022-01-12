import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IFacilityRecord} from "./IFacilityRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class FacilityRecord implements IFacilityRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getFacilityCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('facilities');
        return col
    }

    async addFacility(record: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityCollection()?.insertOne(record, (err, result) => {
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
                task: this.getFacilityCollection()?.find(filter, {projection: {_id: 1}}).count(),
                key: 'stats'
            }, {
                task: this.getFacilityCollection()?.find(filter).limit(limit).skip((page - 1) * limit).sort(sort)
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

    async getFacility(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }


    async getFacilities(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityCollection()?.find(filter).toArray().then((records: any) => {
                resolve(records)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editFacility(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getFacilityCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    aggregate = (filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            this.getFacilityCollection()?.aggregate(filter).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        })
    }
}
