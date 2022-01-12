import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IProcessController} from "./IProcessController";
import {IShiftRequirementRecord} from "../records/IShiftRequirementRecord";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import Validator from "validatorjs";
import {IShiftRecord} from "../records/IShiftRecord";

import AWS from "aws-sdk";
import {ObjectId} from "mongodb";
import {IHCPRecord} from "../records/IHCPRecord";
import {IUserRecord} from "../records/IUserRecord";
import {IFacilityRecord} from "../records/IFacilityRecord";
import {sendSMS, sendTemplateMail, sendPushNotification} from "../utils/helpers"

const ses = new AWS.SES({
    region: "us-east-2"
})

const regionalNumbers: any = {
    "San Francisco": "4804152698011648",
    "San Diego": "5664509011099648",
    // "Los Angeles": "5832197005049856",
}

@injectable()
class ProcessController implements IProcessController {
    @inject(TYPES.IShiftRequirementRecord) ShiftRequirementRecord: IShiftRequirementRecord | undefined;
    @inject(TYPES.IShiftRecord) ShiftRecord: IShiftRecord | undefined;
    @inject(TYPES.IHCPRecord) HCPRecord: IHCPRecord | undefined;
    @inject(TYPES.IUserRecord) UserRecord: IUserRecord | undefined;
    @inject(TYPES.IFacilityRecord) FacilityRecord: IFacilityRecord | undefined;
    @inject(TYPES.ControllerLogger) logger: any | undefined;

    shiftReminder = async (req: IRouterRequest) => {
        try {
            console.log("i am in shift reminder")
            let date = new Date().toJSON().slice(0, 10);
            let today = new Date(date)
            today.setDate(today.getDate() + 1)

            let nextDay = new Date(today)
            nextDay.setDate(nextDay.getDate() + 1)

            let hcpMappings: any = {}
            let facilityMappings: any = {}
            let filter = {
                shift_date: {"$gte": today, "$lt": nextDay},
                shift_status: "pending"
            }

            let hcpUsers = await this.ShiftRecord?.getHCPUserIds(filter)
            if (hcpUsers.length > 0) {
                let hcps = await this.HCPRecord?.getHCPs({user_id: {$in: hcpUsers}})
                for (let hcp of hcps) {
                    hcpMappings[hcp.user_id] = {
                        email: hcp.email,
                        contact_number: hcp.contact_number,
                        region: hcp.address.region
                    }
                }

                let facilityIds = await this.ShiftRecord?.getFacilityIds(filter)
                let facilities = await this.FacilityRecord?.getFacilities({_id: {$in: facilityIds}})
                for (let facility of facilities) {
                    facilityMappings[facility._id] = facility.facility_name
                }

                let shifts = await this.ShiftRecord?.getShifts(filter)
                for (let shift of shifts) {
                    let user_id = shift.hcp_user_id.toString()
                    let hcp = hcpMappings[user_id]
                    const cleaned_phone_number = hcp.contact_number.replace(/\s/g, "");

                    let shift_date = new Date(shift.shift_date).toDateString()
                    let message = "Hi " + shift.hcp_user.first_name + "! Sending a reminder for your upcoming " + shift.shift_type + " shift on " + shift_date + " in " + facilityMappings[shift.facility_id.toString()] + ". Thank you, and stay safe! ~ VitaWerks"

                    // await sendPushNotification(shift.hcp_user_id, message, "Shift Reminder")
                    //
                    await sendTemplateMail(ses, "Shift Reminder", "<html><body>" + message + "</html></body>", hcp.email);
                    // let phoneUsrId = regionalNumbers[hcp.region]
                    // if (typeof phoneUsrId === "undefined") {
                    //     phoneUsrId = process.env.MAINLINE_USER_ID
                    // }
                    // console.log("i am going to sms")
                    // await sendSMS(phoneUsrId, message, cleaned_phone_number);

                }

            }
        } catch (err: any) {
            console.log("err", err)
        }

    }

}

export {
    ProcessController
};
