import {Container} from "inversify";
import "reflect-metadata";
import {IUserController} from "./controllers/IUserController";
import {IUserRecord} from "./records/IUserRecord";
import {UserController} from "./controllers/UserController";
import {UserRecord} from "./records/UserRecord";
import {TokenRecord} from "./records/TokenRecord";
import {ITokenRecord} from "./records/ITokenRecord";
import {IResetCodeRecord} from "./records/IPasswordResetRecord";
import {ResetCodeRecord} from "./records/PasswordResetRecord";
import {IVerificationCodeRecord} from "./records/IVerificationCodeRecord"
import {VerificationCodeRecord} from "./records/VerificationCodesRecord"
import {TYPES} from "./types";
import {MongoClient, ObjectId} from "mongodb"
import {FacilityController} from "./controllers/FacilityController";
import {IFacilityController} from "./controllers/IFacilityController";
import {FacilityRecord} from "./records/FacilityRecord";
import {IFacilityRecord} from "./records/IFacilityRecord";
import {IFacilityMemberRecord} from "./records/IFacilityMemberRecord";
import {FacilityMemberRecord} from "./records/FacilityMemberRecord";
import {IFacilityShiftRecord} from "./records/IFacilityShiftRecord";
import {FacilityShiftRecord} from "./records/FacilityShiftRecord";
import {ShiftRequirementController} from "./controllers/ShiftRequirementController";
import {IShiftRecord} from "./records/IShiftRecord";
import {IShiftRequirementController} from "./controllers/IShiftRequirementController";
import {ShiftController} from "./controllers/ShiftController";
import {IShiftApplicationController} from "./controllers/IShiftApplicationController";
import {ShiftRequirementRecord} from "./records/ShiftRequirementRecord";
import {ShiftRecord} from "./records/ShiftRecord";
import {ShiftApplicationController} from "./controllers/ShiftApplicationController";
import {IShiftRequirementRecord} from "./records/IShiftRequirementRecord";
import {ShiftApplicationRecord} from "./records/ShiftApplicationRecord";
import {IShiftApplicationRecord} from "./records/IShiftApplicationRecord";
import {IShiftController} from "./controllers/IShiftController";
import {HCPController} from "./controllers/HCPController";
import {IHCPController} from "./controllers/IHCPController";
import {HCPRecord} from "./records/HCPRecord";
import {IHCPRecord} from "./records/IHCPRecord";
import {IHCPEducationRecord} from "./records/IHCPEducationRecord";
import {HCPEducationRecord} from "./records/HCPEducationRecord";
import {IHCPExperienceRecord} from "./records/IHCPExperienceRecord";
import {HCPExperienceRecord} from "./records/HCPExperienceRecord";
import {IHCPReferenceRecord} from "./records/IHCPReferenceRecord";
import {HCPReferenceRecord} from "./records/HCPReferenceRecord";
import {IGroupController} from "./controllers/IGroupController";
import {GroupController} from "./controllers/GroupController";
import {IGroupRecord} from "./records/IGroupRecord";
import {IGroupMemberRecord} from "./records/IGroupMemberRecord";
import {GroupRecord} from "./records/GroupRecord";
import {GroupMemberRecord} from "./records/GroupMemberRecord";
import {MetaController} from "./controllers/MetaController";
import {IMetaController} from "./controllers/IMetaController";

import {IBlastsController} from "./controllers/IBlastsController";
import {IBlastRecord} from "./records/IBlastRecord";
import {BlastsController} from "./controllers/BlastsController";
import {BlastRecord} from "./records/BlastRecord";
import {IBlastGroupRecord} from "./records/IBlastGroupRecord";
import {BlastGroupRecord} from "./records/BlastGroupRecord";

import {IProcessController} from "./controllers/IProcessController";
import {ProcessController} from "./controllers/ProcessController";

import {IMiddleware} from "./IMiddleware";
import {Middleware} from "./Middleware"

let Validator = require('validatorjs');

const registerCustomValidators = (client: any) => {

    Validator.registerAsync('exists', async (value: any, requirement: string, attribute: any, passes: (arg0: boolean | undefined, arg1: string | undefined) => void) => {

        try {
            let table: string = "";
            let column: string = "";

            if (requirement.indexOf(",") > -1) {
                const bits = requirement.split(",");
                if (bits.length === 1) {
                    table = bits[0];
                    column = attribute;
                } else {
                    table = bits[0];
                    column = bits[1];
                }
            }

            let filter: { [name: string]: any } = {};

            if (column.indexOf("_id") > -1) {
                filter[column] = new ObjectId(value);
            } else {
                filter[column] = value
            }

            client.db(process.env.DB_NAME).collection(table).countDocuments(filter).then((results: any) => {
                if (results > 0) {
                    passes(true, "");
                } else {
                    passes(false, 'The ' + column + ' does not exist in table'); // if username is not available
                }
            })
        } catch (err: any) {
            passes(false, 'Error connecting to DB in validation');
        }

    });

    Validator.registerAsync('unique', async (value: any, requirement: string, attribute: any, passes: (arg0: boolean | undefined, arg1: string | undefined) => void) => {

        try {
            let table: string = "";
            let column: string = "";
            let ignore_value: string = ""

            if (requirement.indexOf(",") > -1) {
                const bits = requirement.split(",");
                if (bits.length === 1) {
                    table = bits[0];
                    column = attribute;
                } else {
                    table = bits[0];
                    column = bits[1];
                }

                if (bits.length === 3) {
                    ignore_value = bits[2];
                    // there is a ignore field
                }
            }

            let filter: { [name: string]: any } = {};

            if (column.indexOf("_id") > -1) {
                filter[column] = new ObjectId(value);
            } else {
                filter[column] = value
            }

            if (ignore_value != "") {
                filter["_id"] = {$ne: new ObjectId(ignore_value)}
            }

            client.db(process.env.DB_NAME).collection(table).countDocuments(filter).then((results: any) => {
                if (results > 0) {
                    passes(false, 'The ' + column + ' already exists in the table');
                } else {
                    passes(true, "");
                }
            })

        } catch (err: any) {
            passes(false, 'Error connecting to DB in validation');
        }
    });

    Validator.registerAsync('is_url', async (value: any, requirement: string, attribute: string, passes: (arg0: boolean | undefined, arg1: string | undefined) => void) => {
        const regex = /^(https?:\/\/)?(www\.)[a-z0-9]+\.[a-z0-9]{2,3}$/
        const found = value.match(regex);

        if (found) {
            passes(true, "");
        } else {
            passes(false, 'Given ' + attribute + ' must be in URL format');
        }
    });

}

const createContainer = (): Promise<Container> => {

    return new Promise((resolve, reject) => {
        const container = new Container();

        container.bind<IUserController>(TYPES.IUserController).to(UserController);
        container.bind<IUserRecord>(TYPES.IUserRecord).to(UserRecord);
        container.bind<ITokenRecord>(TYPES.ITokenRecord).to(TokenRecord);
        container.bind<IResetCodeRecord>(TYPES.IResetCodeRecord).to(ResetCodeRecord);
        container.bind<IVerificationCodeRecord>(TYPES.IVerificationCodeRecord).to(VerificationCodeRecord)

        container.bind<IMiddleware>(TYPES.IMiddleware).to(Middleware);

        container.bind<IFacilityController>(TYPES.IFacilityController).to(FacilityController);
        container.bind<IFacilityRecord>(TYPES.IFacilityRecord).to(FacilityRecord);
        container.bind<IFacilityMemberRecord>(TYPES.IFacilityMemberRecord).to(FacilityMemberRecord);
        container.bind<IFacilityShiftRecord>(TYPES.IFacilityShiftRecord).to(FacilityShiftRecord);

        container.bind<IShiftRequirementController>(TYPES.IShiftRequirementController).to(ShiftRequirementController);
        container.bind<IShiftApplicationController>(TYPES.IShiftApplicationController).to(ShiftApplicationController);
        container.bind<IHCPController>(TYPES.IHCPController).to(HCPController);
        container.bind<IGroupController>(TYPES.IGroupController).to(GroupController);
        container.bind<IMetaController>(TYPES.IMetaController).to(MetaController);

        container.bind<IShiftRequirementRecord>(TYPES.IShiftRequirementRecord).to(ShiftRequirementRecord);
        container.bind<IShiftApplicationRecord>(TYPES.IShiftApplicationRecord).to(ShiftApplicationRecord);

        container.bind<IShiftController>(TYPES.IShiftController).to(ShiftController);
        container.bind<IShiftRecord>(TYPES.IShiftRecord).to(ShiftRecord);
        container.bind<IHCPRecord>(TYPES.IHCPRecord).to(HCPRecord);
        container.bind<IHCPEducationRecord>(TYPES.IHCPEducationRecord).to(HCPEducationRecord);
        container.bind<IHCPExperienceRecord>(TYPES.IHCPExperienceRecord).to(HCPExperienceRecord);
        container.bind<IHCPReferenceRecord>(TYPES.IHCPReferenceRecord).to(HCPReferenceRecord);
        container.bind<IGroupRecord>(TYPES.IGroupRecord).to(GroupRecord);
        container.bind<IGroupMemberRecord>(TYPES.IGroupMemberRecord).to(GroupMemberRecord);

        container.bind<IBlastsController>(TYPES.IBlastController).to(BlastsController);
        container.bind<IBlastRecord>(TYPES.IBlastRecord).to(BlastRecord);
        container.bind<IBlastGroupRecord>(TYPES.IBlastGroupRecord).to(BlastGroupRecord);

        container.bind<any>(TYPES.IProcessController).to(ProcessController);

        container.bind<any>(TYPES.ControllerLogger).toConstantValue(require("debug")("controller"));
        container.bind<any>(TYPES.initLogger).toConstantValue(require("debug")("init"));

        let db_uri = 'mongodb://3.138.245.87:27020'

        MongoClient.connect(
            db_uri,
            (err, client) => {
                if (client) {
                    registerCustomValidators(client);
                    container.bind<any>(TYPES.MongoClient).toConstantValue(client);
                } else {
                    console.log("Error connecting to DB .. ")
                    reject(err)
                }
                resolve(container);
            });
    });
}

export {createContainer};
