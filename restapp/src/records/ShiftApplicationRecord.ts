import {inject, injectable} from "inversify";
import "reflect-metadata";
import {dbClient, tables} from '../../infrastructures/DynamoDB';
import {IShiftApplicationRecord} from "./IShiftApplicationRecord";
import {MongoClient} from "mongodb";
import {TYPES} from "../types";

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
