import {inject, injectable} from "inversify";
import "reflect-metadata";
import {dbClient, tables} from '../../infrastructures/DynamoDB';
import {IShiftApplicationRecord} from "./IShiftApplicationRecord";
import {IShiftRecord} from "./IShiftRecord";
import {Shift} from "../models/Shift";
import {MongoClient} from "mongodb";
import {TYPES} from "../types";
import async from 'async';


@injectable()
export class ShiftRecord implements IShiftRecord {

    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getShiftCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('shifts');
        return col
    }

    addShift = (data: Shift): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.getShiftCollection()?.insertOne(data, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }


    async editShift(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editShifts(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftCollection()?.updateMany(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
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
                task: this.getShiftCollection()?.find(filter, {projection: {_id: 1}}).count(),
                key: 'stats'
            }, {
                task: this.getShiftCollection()?.find(filter).limit(limit).skip((page - 1) * limit).sort(sort)
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


    getShiftByStatus(config: any): Promise<any> {
        return Promise.resolve(undefined);
    }

    getShiftsOfHCP(config: any): Promise<any> {
        return Promise.resolve(undefined);
    }

    getShifts(filter: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftCollection()?.find(filter).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    getHCPUserIds = (filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            let records: any = []
            records = await this.getShiftCollection()?.distinct('hcp_user_id', filter)
            resolve(records)
        })
    }

    getFacilityIds = (filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            let records: any = []
            records = await this.getShiftCollection()?.distinct('facility_id', filter)
            resolve(records)
        })
    }


    viewShift(filter: { [name: string]: any }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

}
