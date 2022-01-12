import {DynamoDB} from 'aws-sdk';

let dbClient: DynamoDB.DocumentClient = new DynamoDB.DocumentClient({
    region: process.env.AWS_DEFAULT_REGION
});

const tables = {
    "shift_requirements_table": process.env.SHIFT_REQUIREMENTS_TABLE
}
export {tables, dbClient}