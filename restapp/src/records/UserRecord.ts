import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IUserRecord} from "./IUserRecord";
import async from 'async';

import {MongoClient, ObjectId} from 'mongodb'
import {TYPES} from "../types";

@injectable()
export class UserRecord implements IUserRecord {
    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;

    getUserCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('users');
        return col
    }

    async addUser(record: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getUserCollection()?.insertOne(record, (err, result) => {
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
                task: this.getUserCollection()?.find(filter, {projection: {_id: 1}}).count(),
                key: 'stats'
            }, {
                task: this.getUserCollection()?.find(filter).limit(limit).skip((page - 1) * limit).sort(sort)
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

    async getUser(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getUserCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async getUsers(filter: { [name: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getUserCollection()?.find(filter).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }


    async editUser(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getUserCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

}
