import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IShiftRequirementRecord} from "./IShiftRequirementRecord";
import {ShiftRequirement} from "../models/ShiftRequirement";
import {dbClient, tables} from '../../infrastructures/DynamoDB';
import _ from "lodash"
import {TYPES} from "../types";
import {MongoClient} from "mongodb";
import async from "async";

@injectable()
export class ShiftRequirementRecord implements IShiftRequirementRecord {

    table = ""

    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getShiftRequirementCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('shift_requirements');
        return col
    }

    async getRequirement(filter: { [name: string]: any }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftRequirementCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editRequirement(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftRequirementCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    bulkAddRequirements = (requirements: any): Promise<any> => {

        return new Promise((resolve, reject) => {
            this.getShiftRequirementCollection()?.insertMany(requirements, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });

    }

    addRequirement = (requirement: ShiftRequirement): Promise<any> => {
        const params = {
            Item: requirement,
            TableName: this.table
        };
        return dbClient.put(params).promise();
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
                task: this.getShiftRequirementCollection()?.find(filter, {projection: {_id: 1}}).count(),
                key: 'stats'
            }, {
                task: this.getShiftRequirementCollection()?.find(filter).limit(limit).skip((page - 1) * limit).sort(sort)
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


    getAllRequirements = (filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            this.getShiftRequirementCollection()?.find(filter).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editRequirements(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftRequirementCollection()?.updateMany(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    getFacilityRequirements = (filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            let records: any = []
            records = await this.getShiftRequirementCollection()?.distinct('facility_id', filter)
            resolve(records)
        })
    }


    getFacilityRequirementsCount = (filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            this.getShiftRequirementCollection()?.aggregate(filter).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        })
    }

}

