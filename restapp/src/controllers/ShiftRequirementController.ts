import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IShiftRequirementController} from "./IShiftRequirementController";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import {IShiftRequirementRecord} from "../records/IShiftRequirementRecord";
import {IShiftRecord} from "../records/IShiftRecord";
import {IShiftApplicationRecord} from "../records/IShiftApplicationRecord";
import {ShiftRequirement} from "../models/ShiftRequirement";
import Validator from "validatorjs";

import axios from 'axios';
import {ObjectId} from "mongodb";
import {IFacilityRecord} from "../records/IFacilityRecord";
import AWS from "aws-sdk";

import 'moment-timezone';
import moment from 'moment';
import {IUserRecord} from "../records/IUserRecord";
import {IHCPRecord} from "../records/IHCPRecord";
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
class ShiftRequirementController implements IShiftRequirementController {
    @inject(TYPES.IShiftRequirementRecord) ShiftRequirementRecord: IShiftRequirementRecord | undefined;
    @inject(TYPES.IShiftApplicationRecord) ShiftApplicationRecord: IShiftApplicationRecord | undefined;
    @inject(TYPES.IShiftRecord) ShiftRecord: IShiftRecord | undefined;
    @inject(TYPES.IHCPRecord) HCPRecord: IHCPRecord | undefined;
    @inject(TYPES.IFacilityRecord) FacilityRecord: IFacilityRecord | undefined;
    @inject(TYPES.IUserRecord) UserRecord: IUserRecord | undefined;
    @inject(TYPES.ControllerLogger) logger: any | undefined;

    getAllFacilitiesList = async (): Promise<any> => {
        let mapFacilities: { [name: string]: any } = {};
        return new Promise(async (resolve, reject) => {
            const facilities = await this.FacilityRecord?.getFacilities({});
            for (let i = 0; i < facilities.length; i++) {
                const facility = facilities[i];
                const facility_id = facility._id;
                mapFacilities[facility_id] = facility;
            }
            resolve(mapFacilities);
        });
    }

    add = async (req: IRouterRequest) => {

        let rules = {
            facility_id: 'required|exists:facilities,_id',
            requirement_owner_id: 'required|exists:users,_id',
            title: 'required|min:6',
            description: 'min:6',
            start_date: 'date',
            end_date: 'date',
            shift_dates: 'array',
            hcp_count: 'required|numeric|min:1',
            hcp_type: 'required|in:' + process.env.HCP_TYPES,
            warning_details: 'min:2',
            warning_type: 'min:2',
            start_time: 'required|numeric|min:0|max:1440',
            end_time: 'required|numeric|min:0|max:1440',
            shift_type: 'required',
            mode: 'required|in:multiple,range',
            price: {
                inbound_price: 'required|numeric|min:0',
                outbound_price: 'required|numeric|min:0'
            }
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const body = req.getBody();

                if (body["mode"] === "range") {
                    if (typeof body.start_date === "undefined" || typeof body.end_date === "undefined") {
                        return req.replyBack(400, {errors: {date_range: ["The start_date and end_date are required"]}})
                    }
                } else if (body["mode"] === "multiple") {
                    if (typeof body.shift_dates === "undefined") {
                        return req.replyBack(400, {errors: {shift_dates: ["The shift_dates is required"]}})
                    }
                }

                let days: any = []
                if (body["mode"] === "range") {
                    const start_date = new Date(body.start_date);
                    const end_date = new Date(body.end_date);
                    days = this.dateRange(start_date, end_date)
                } else if (body["mode"] === "multiple") {
                    days = body.shift_dates
                }

                const hcp_type = body.hcp_type;

                let requirements = []
                if (days && days.length > 0) {
                    for (let day of days) {
                        let shift_date = new Date(day)
                        let next_date = new Date(day)
                        if (body.start_time > body.end_time) {
                            next_date.setDate(next_date.getDate() + 1)
                        }

                        const shift_start_date_time = moment(shift_date).utcOffset(-8 * 60, false).add(body.start_time, 'minutes');
                        const shift_end_date_time = moment(next_date).utcOffset(-8 * 60, false).add(body.end_time, 'minutes');

                        let requirement: ShiftRequirement = {
                            facility_id: new ObjectId(body.facility_id),
                            requirement_owner_id: new ObjectId(body.requirement_owner_id),
                            title: body.title,
                            description: body.description,
                            shift_date: shift_date,
                            shift_details: body.shift_details,
                            shift_timings: {
                                start_time: shift_start_date_time.toDate(),
                                end_time: shift_end_date_time.toDate()
                            },
                            hcp_count: body.hcp_count,
                            hcp_type: hcp_type,
                            shift_type: body.shift_type,
                            status: "open",
                            is_active: true,
                            is_published: true,
                            got_required_hcps: false,
                            price: {
                                inbound_price: body.inbound_price,
                                outbound_price: body.outbound_price
                            },
                            warning_details: body.warning_details,
                            warning_type: body.warning_type,
                            created_at: new Date(),
                            updated_at: new Date()
                        };

                        requirements.push(requirement)
                    }
                }

                await this.ShiftRequirementRecord?.bulkAddRequirements(requirements);
                req.replyBack(201, {
                    "msg": "shift requirements created",
                });

            } catch (err) {
                console.log(err);
                return req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            return req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    list = async (req: IRouterRequest) => {

        const body = req.getBody();
        const page = parseInt(body.page) || 1;
        const limit = parseInt(body.limit) || 10;

        let rules = {
            facility_id: 'exists:facilities,_id',
            hcp_type: 'in:RN,LVN,CNA,MedTech,CareGiver'
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {

                const facilities_map = await this.getAllFacilitiesList();

                let filter: any = {}
                if (body.facility_id != undefined) {
                    filter["facility_id"] = new ObjectId(body.facility_id);
                }
                if (body.facilities != undefined && body.facilities.length > 0) {
                    let facilities: Array<any> = []
                    for (let i in body.facilities) {
                        facilities.push(new ObjectId(body.facilities[i]))
                    }
                    filter["facility_id"] = {$in: facilities};
                }
                if (body.hcp_type != undefined) {
                    filter["hcp_type"] = body.hcp_type;
                }
                if (body.hcp_types != undefined && body.hcp_types.length > 0) {
                    filter["hcp_type"] = {$in: body.hcp_types};
                }
                if (body.status != undefined) {
                    filter["status"] = body.status;
                }
                if (body.search != undefined) {
                    filter["$or"] = [
                        {title: {$regex: body.search, $options: 'si'}},
                    ]
                }
                if (body.new_shifts != undefined) {
                    let date = new Date(body.new_shifts)
                    filter["shift_date"] = {"$gte": date}
                }
                if (typeof body.start_date !== "undefined") {
                    let start_date = new Date(body.start_date)
                    if (typeof body.end_date !== "undefined") {
                        let end_date = new Date(body.end_date)
                        filter["shift_date"] = {"$gte": start_date, "$lte": end_date}
                    } else {
                        filter["shift_date"] = {"$eq": start_date}
                    }
                }
                if (body.shift_type != undefined) {
                    filter["shift_type"] = body.shift_type;
                }
                if (body.shift_types != undefined && body.shift_types.length > 0) {
                    filter["shift_type"] = {$in: body.shift_types};
                }

                if (body.hcp_user_id != undefined) {
                    let shift_filter = {
                        hcp_user_id: new ObjectId(body.hcp_user_id),
                        shift_status: {$in: ["closed", "complete"]}
                    }
                    const shifts = await this.ShiftRecord?.getShifts(shift_filter)
                    let requirementIds: Array<any> = []
                    if (shifts.length > 0) {
                        for (let shift of shifts) {
                            let requirementId = new ObjectId(shift.requirement_id)
                            // @ts-ignore
                            requirementIds.push(requirementId)
                        }
                    }

                    let shift_application_filter = {
                        hcp_user_id: new ObjectId(body.hcp_user_id),
                        status: {$in: ["cancelled", "approved", "pending"]}
                    }
                    const shift_applications = await this.ShiftApplicationRecord?.getApplications(shift_application_filter)
                    if (shift_applications.length > 0) {
                        for (let application of shift_applications) {
                            let requirementId = new ObjectId(application.requirement_id)
                            // @ts-ignore
                            requirementIds.push(requirementId)
                        }
                    }

                    filter["_id"] = {$nin: requirementIds}
                    filter["got_required_hcps"] = false
                }

                const requirements = await this.ShiftRequirementRecord?.paginate(filter, {}, page, limit, {shift_date: 1});

                for (const i in requirements.docs) {
                    let requirement = requirements.docs[i];
                    if (facilities_map[requirement.facility_id]) {
                        requirement.facility = facilities_map[requirement.facility_id];
                    }
                    requirements.docs[i] = requirement;
                }

                req.replyBack(200, {"msg": "requirement list", "data": requirements});
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    view = async (req: IRouterRequest) => {
        try {


            let rules = {
                id: 'required|exists:shift_requirements,_id',
            };

            let validation = new Validator(req.getParams(), rules);

            validation.fails((errors: any) => {
                return req.replyBack(500, {errors: validation.errors.errors})
            });

            validation.passes(async () => {
                try {
                    const requirement_id = req.getParams().id;
                    let requirement = await this.ShiftRequirementRecord?.getRequirement({_id: new ObjectId(requirement_id)});

                    if (requirement) {
                        const facility = await this.FacilityRecord?.getFacility({_id: requirement.facility_id});
                        requirement.facility = facility;

                        if (requirement.cancelled_details) {
                            const cancalled_user_id = requirement.cancelled_details.cancelled_by;
                            const user = await this.UserRecord?.getUser({_id: new ObjectId(cancalled_user_id)});
                            if (user) {
                                delete user["password"]
                                requirement.cancelled_details.user_info = user;
                            }
                        }

                        req.replyBack(200, {
                            "msg": "requirement details",
                            "data": requirement
                        });
                    }
                } catch (err) {
                    console.log(err);
                    return req.replyBack(500, {error: err});
                }
            })


        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }
    }

    cancel = async (req: IRouterRequest) => {
        try {
            const requirement_id = req.getParams().id;
            const body = req.getBody();
            body["requirement_id"] = requirement_id

            const rules = {
                requirement_id: "required|exists:shift_requirements,_id"
            }
            let validation = new Validator(body, rules);

            validation.fails((errors: any) => {
                req.replyBack(400, {
                    "success": false,
                    errors: validation.errors.errors
                })
            });

            validation.passes(async () => {
                try {
                    let requirement = await this.ShiftRequirementRecord?.getRequirement({_id: new ObjectId(requirement_id)});
                    if (requirement) {
                        requirement.status = "cancelled";
                        requirement.cancelled_details = {
                            reason: body["reason"],
                            cancelled_by: new ObjectId(body["cancelled_by"])
                        }
                        requirement.updated_at = new Date();

                        await this.ShiftRequirementRecord?.editRequirement({_id: new ObjectId(requirement_id)}, requirement);
                        await this.ShiftApplicationRecord?.editApplications({requirement_id: new ObjectId(requirement_id)}, {$set: {status: "cancelled"}});
                        await this.ShiftRecord?.editShifts({requirement_id: new ObjectId(requirement_id)}, {
                            $set: {
                                shift_status: "cancelled",
                                cancelled_details: {
                                    reason: body["reason"],
                                    cancelled_by: new ObjectId(body["cancelled_by"])
                                }
                            }
                        });

                        req.replyBack(200, {
                            "msg": "requirement cancelled",
                        });

                        let cancelledShifts = await this.ShiftRecord?.getShifts({requirement_id: new ObjectId(requirement_id)})
                        if (cancelledShifts.length > 0) {
                            const facilities_map = await this.getAllFacilitiesList();
                            for (let shift of cancelledShifts) {
                                const hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(shift.hcp_user_id)});

                                let shift_date = new Date(shift.shift_date).toDateString()
                                let message = "Hi " + hcp.first_name + " Your " + shift.shift_type + " shift(s) in " + facilities_map[shift.facility_id]["facility_name"] + " on " + shift_date + " have been cancelled due to " + body["reason"] + ". Kindly check the app for open shifts or contact us. ~ VitaWerks"

                                await sendPushNotification(hcp.user_id, message, "Shift Cancelled")

                                await sendTemplateMail(ses, "Shift Cancelled", "<html><body>" + message + "</html></body>", hcp.email);

                                const cleaned_phone_number = hcp.contact_number.replace(/\s/g, "");
                                let phoneUsrId = regionalNumbers[hcp.address.region]
                                if (typeof phoneUsrId === "undefined") {
                                    phoneUsrId = process.env.MAINLINE_USER_ID
                                }
                                await sendSMS(phoneUsrId, message, cleaned_phone_number);
                            }

                        }

                    }
                } catch (err) {
                    console.log(err, "err");
                    req.replyBack(500, {error: err});
                }

            })


        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }
    }

    addDays = (date: any, days = 1) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    // @ts-ignore
    dateRange = (start: any, end: any, range: any = []) => {
        if (start > end) return range;
        const next = this.addDays(start, 1);
        return this.dateRange(next, end, [...range, start]);
    };
}

export {ShiftRequirementController};


