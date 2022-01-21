import {inject, injectable} from "inversify";
import "reflect-metadata";
import {dbClient, tables} from '../../infrastructures/DynamoDB';
import {IShiftApplicationRecord} from "./IShiftApplicationRecord";
import {MongoClient} from "mongodb";
import {TYPES} from "../types";
import async from "async";

@injectable()
export class ShiftApplicationRecord implements IShiftApplicationRecord {

    // table = (tables.shift_applications_table || "")

    @inject(TYPES.MongoClient) dbClient: MongoClient | undefined;
    table = ""

    getShiftApplicationCollection() {
        const db = this.dbClient?.db(process.env.DB_NAME);
        const col = db?.collection('shift_applications');
        return col
    }


    addApplication = (data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.getShiftApplicationCollection()?.insertOne(data, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    getApplication = (filter: { [name: string]: any }): Promise<any> => {

        return new Promise((resolve, reject) => {
            this.getShiftApplicationCollection()?.findOne(filter).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });

    }


    getApplications = (filter: { [name: string]: any }): Promise<any> => {
        return new Promise((resolve, reject) => {
            this.getShiftApplicationCollection()?.find(filter).sort({shift_date: 1}).toArray().then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editApplication(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftApplicationCollection()?.replaceOne(filter, updateObj).then((record: any) => {
                resolve(record)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    async editApplications(filter: any, updateObj: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.getShiftApplicationCollection()?.updateMany(filter, updateObj).then((record: any) => {
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
                task: this.getShiftApplicationCollection()?.find(filter, {projection: {_id: 1}}).count(),
                key: 'stats'
            }, {
                task: this.getShiftApplicationCollection()?.find(filter).limit(limit).skip((page - 1) * limit).sort(sort)
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

    listHCPApplicationsByStatus = (hcp_user_id: string, filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            try {
                let params = {
                    KeyConditionExpression: "#hcp_user_id = :hcp_user_id",
                    IndexName: "hcpUserIndex",
                    ExpressionAttributeNames: {
                        "#hcp_user_id": "hcp_user_id"
                    },
                    ExpressionAttributeValues: {
                        ":hcp_user_id": hcp_user_id
                    },
                    TableName: this.table
                };

                if (filter.status) {
                    // @ts-ignore
                    params["FilterExpression"] = "#status = :status"
                    // @ts-ignore
                    params["ExpressionAttributeValues"][":status"] = filter.status
                    // @ts-ignore
                    params["ExpressionAttributeNames"]["#status"] = "status"
                }

                const result = await dbClient.query(params).promise();

                if (result && result.Items && result.Items.length > 0) {
                    resolve(result.Items);
                } else {
                    resolve([]);
                }
            } catch (err) {
                reject(err);
            }

        });

    }

    getHCPApplication = (requirement_id: string, hcp_user_id: string, filter: any): Promise<any> => {
        return new Promise(async (resolve, reject) => {
            let params = {
                KeyConditionExpression: "#requirement_id = :requirement_id",
                IndexName: "requirementIndex",
                ExpressionAttributeNames: {
                    "#requirement_id": "requirement_id",
                    "#hcp_user_id": "hcp_user_id"
                },
                ExpressionAttributeValues: {
                    ":requirement_id": requirement_id,
                    ":hcp_user_id": hcp_user_id,
                },
                FilterExpression: '#hcp_user_id = :hcp_user_id AND #status = :status',
                TableName: this.table
            };

            if (filter.status) {
                // @ts-ignore
                params["ExpressionAttributeValues"][":status"] = filter.status
                // @ts-ignore
                params["ExpressionAttributeNames"]["#status"] = "status"
            }

            const result = await dbClient.query(params).promise();
            let data: any = []

            if (result && result.Items && result.Items.length > 0) {
                resolve(result.Items);
            } else {
                resolve(data)
            }
        });
    }


}
