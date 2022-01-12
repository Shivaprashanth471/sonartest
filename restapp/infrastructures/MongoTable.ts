import {ITable} from "./ITable";
import {injectable} from "inversify";

@injectable()
export class MongoTable implements ITable {

    insertOne = (data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            resolve("working")
        })
    }

    findOne = (query: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            resolve("working")
        })
    }

    findAll = (query: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            resolve("working")
        })
    }

    insertMany = (condition: any, updateObj: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            resolve("working")
        })
    }

    delete = (data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            resolve("working")
        })
    }

    paginate = (data: any): Promise<any> => {
        return new Promise((resolve, reject) => {
            resolve("working")
        })
    }
}