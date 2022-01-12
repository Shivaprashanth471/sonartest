import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IShiftRequirementController} from "./IShiftRequirementController";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import {IShiftRequirementRecord} from "../records/IShiftRequirementRecord";
import {ShiftRequirement} from "../models/ShiftRequirement";
import {IShiftApplicationRecord} from "../records/IShiftApplicationRecord";
import Validator from "validatorjs";

import {v4 as uuid} from 'uuid';
import {IShiftController} from "./IShiftController";
import {Shift} from "../models/Shift";
import {IShiftRecord} from "../records/IShiftRecord";
import AWS from "aws-sdk";
import {type} from "os";
import {ObjectId} from "mongodb";
import {IHCPRecord} from "../records/IHCPRecord";
import {IFacilityRecord} from "../records/IFacilityRecord";
import {IUserRecord} from "../records/IUserRecord";
import {sendSMS, sendTemplateMail, sendPushNotification} from "../utils/helpers"

import moment from 'moment';

const lambda = new AWS.Lambda({
    region: process.env.AWS_DEFAULT_REGION
});

const ses = new AWS.SES({
    region: "us-east-2"
})

const S3 = new AWS.S3({
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: process.env.REGION
});

const regionalNumbers: any = {
    "San Francisco": "4804152698011648",
    "San Diego": "5664509011099648",
    // "Los Angeles": "5832197005049856",
}

@injectable()
class ShiftController implements IShiftController {
    @inject(TYPES.IShiftRequirementRecord) ShiftRequirementRecord: IShiftRequirementRecord | undefined;
    @inject(TYPES.IShiftApplicationRecord) ShiftApplicationRecord: IShiftApplicationRecord | undefined;
    @inject(TYPES.IHCPRecord) HCPRecord: IHCPRecord | undefined;
    @inject(TYPES.IUserRecord) UserRecord: IUserRecord | undefined;
    @inject(TYPES.IFacilityRecord) FacilityRecord: IFacilityRecord | undefined;
    @inject(TYPES.IShiftRecord) ShiftRecord: IShiftRecord | undefined;
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

    getHcpByUserID = async (user_id: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            try {
                const params = {
                    FunctionName: 'hcp-service-' + process.env.APP_STAGE + '-restapp',
                    Payload: JSON.stringify({
                        "resource": "/hcp/user/" + user_id,
                        "path": "/hcp/user/" + user_id,
                        "httpMethod": "GET",
                        "requestContext": {
                            "resourcePath": "/hcp/user/" + user_id,
                            "httpMethod": "GET",
                            "path": "/dev/",
                        },
                        "headers": {
                            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                        }
                    })
                };
                lambda.invoke(params, (err, data) => {
                    try {
                        if (err || !data) {
                            reject(err);
                        }
                        if (data && data.Payload) {
                            console.log(JSON.parse(data.Payload.toString()).body);
                            const hcpDetails = JSON.parse(JSON.parse(data.Payload.toString()).body).data;
                            resolve(hcpDetails);
                        }
                    } catch (err) {
                        reject("Cannot get hcp details");
                    }
                });
            } catch (err) {
                reject(err);
            }
        })
    }

    getUserByID = async (user_id: string): Promise<any> => {
        return new Promise((resolve, reject) => {
            try {
                const params = {
                    FunctionName: 'user-service-' + process.env.APP_STAGE + '-restapp',
                    Payload: JSON.stringify({
                        "resource": "/user/" + user_id,
                        "path": "/user/" + user_id,
                        "httpMethod": "GET",
                        "requestContext": {
                            "resourcePath": "/user/" + user_id,
                            "httpMethod": "GET",
                            "path": "/dev/",
                        },
                        "headers": {
                            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                        }
                    })
                };
                lambda.invoke(params, (err, data) => {
                    try {
                        if (err || !data) {
                            reject(err);
                        }
                        if (data && data.Payload) {
                            // console.log(JSON.parse(data.Payload.toString()).body);
                            const userDetails = JSON.parse(JSON.parse(data.Payload.toString()).body).data;
                            resolve(userDetails);
                        }
                    } catch (err) {
                        reject("Cannot get user details");
                    }
                });
            } catch (err) {
                reject(err);
            }
        })
    }

    uploadFile = (params: any) => {
        return new Promise(function (resolve, reject) {
            S3.getSignedUrl('putObject', params, function (err: any, url: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve(url);
                }
            });
        });
    }

    getObject = (params: any) => {
        return new Promise(function (resolve, reject) {
            S3.getSignedUrl('getObject', params, function (err: any, url: any) {
                if (err) {
                    console.log("error in getObj", err)
                    reject(err);
                } else {
                    resolve(url);
                }
            });
        });
    }

    listObjects = (params: any) => {
        return new Promise(function (resolve, reject) {
            S3.listObjectsV2(params, function (err: any, data: any) {
                if (err) {
                    console.log("error in lists3", err)
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    getMetaData = (params: any) => {
        return new Promise(function (resolve, reject) {
            S3.headObject(params, function (err: any, url: any) {
                if (err) {
                    console.log("error in headObj", err)
                    reject(err);
                } else {
                    resolve(url);
                }
            });
        });
    }

    deleteObject = (params: any) => {
        return new Promise(function (resolve, reject) {
            S3.deleteObject(params, function (err: any, data: any) {
                if (err) {
                    console.log("error in deleteObject", err)
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    add = async (req: IRouterRequest) => {

        let body = req.getBody();
        const params = req.getParams();
        const requirement_id = params.id;
        body["requirement_id"] = requirement_id;

        let rules = {
            requirement_id: 'required|exists:shift_requirements,_id',
            application_id: 'required|exists:shift_applications,_id',
            hcp_user_id: 'required',
            differential_amount: 'numeric|min:0',
            created_by: 'required' // login user_id
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                const body = req.getBody();

                const requirement = await this.ShiftRequirementRecord?.getRequirement({_id: new ObjectId(requirement_id)});


                let start_date, end_date
                if (typeof body.start_time !== "undefined") {
                    let date = new Date(body.start_date)
                    let start_time = body.start_time
                    start_date = new Date(date.getTime() + start_time * 60000);
                } else {
                    start_date = new Date(requirement.shift_timings.start_time);
                }

                if (typeof body.end_time !== "undefined") {
                    let date = new Date(body.end_date)
                    let end_time = body.end_time
                    end_date = new Date(date.getTime() + end_time * 60000);
                } else {
                    end_date = new Date(requirement.shift_timings.end_time);
                }

                const milliSeconds: any = (end_date.getTime() - start_date.getTime());

                const expected_duration = Math.floor(milliSeconds / 60000);

                const hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(body.hcp_user_id)});

                const application = await this.ShiftApplicationRecord?.getApplication({_id: new ObjectId(body.application_id)});
                if (application.status !== "approved") {
                    req.replyBack(500, {error: "Application needs to be approved"});
                    return;
                }

                console.log(application.approved_by, " application.approved_by");

                if (requirement) {
                    const shift: Shift = {
                        title: requirement.title,
                        shift_details: requirement.shift_details,
                        requirement_id: new ObjectId(requirement_id),
                        application_id: new ObjectId(body.application_id),
                        facility_id: new ObjectId(requirement.facility_id),
                        hcp_user_id: new ObjectId(body.hcp_user_id),
                        approved_by: application.approved_by,
                        hcp_user: {
                            first_name: hcp.first_name,
                            last_name: hcp.last_name,
                            email: hcp.email,
                            gender: hcp.gender,
                            hcp_type: hcp.hcp_type,
                            rate: 10 // TODO accept rate in hcp registration and use that here ..
                        },
                        expected: {
                            shift_duration_minutes: expected_duration,
                            shift_end_time: end_date,
                            shift_start_time: start_date
                        },
                        is_cdhp_valid: false,
                        is_shift_acknowledged_by_facility: false,
                        inbound_payment_status: "pending",
                        outbound_payment_status: "pending",
                        payment_breakup_details: {},
                        payments: {
                            differential: body.differential_amount,
                            hourly_hcp: 0,
                            hourly_ot: 0
                        },
                        shift_approved_by: requirement.approved_by,
                        time_breakup: {
                            break_timings: [],
                            check_in_time: "",
                            check_out_time: ""
                        },
                        actuals: {
                            shift_end_time: null,
                            shift_start_time: null
                        },
                        hcp_type: requirement.hcp_type,
                        shift_type: requirement.shift_type,
                        shift_date: requirement.shift_date,
                        warning_details: requirement.warning_details,
                        warning_type: requirement.warning_type,
                        shift_status: "pending",
                        is_in_break: false,
                        cdhp_form_attachment: "",
                        total_inbound_payment: 0,
                        total_outbound_payment: 0,
                        created_by: new ObjectId(body.created_by),
                        created_at: new Date(),
                        updated_at: new Date(),
                    }
                    await this.ShiftRecord?.addShift(shift);

                    application.is_shift_created = true;
                    await this.ShiftApplicationRecord?.editApplication({_id: new ObjectId(body.application_id)}, application);

                    req.replyBack(200, {
                        msg: "shift added",
                        data: shift
                    })


                } else {
                    req.replyBack(500, {error: "Requirement ID is invalid"})
                }


            } catch (err: any) {
                console.log(err, "error");
                req.replyBack(500, {error: err.toString()});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    listRequirementShifts = async (req: IRouterRequest) => {

        const queryArgs = req.getQueryArgs();
        const page = parseInt(queryArgs.page) || 1;
        const limit = parseInt(queryArgs.limit) || 20;
        const search = queryArgs.search;

        let body = req.getBody();
        body["shift_status"] = queryArgs.shift_status;

        let rules = {
            shift_status: 'in:pending,in_progress,complete,cancelled,closed',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            let filter: any = {
                requirement_id: new ObjectId(req.getParams().id),
            };
            if (queryArgs.shift_status) {
                filter["shift_status"] = queryArgs.shift_status
            }
            if (search) {
                filter["$or"] = [
                    // TODO add shift filter
                    // {facility_name: {$regex: search, $options: 'si'}},
                    // {business_name: {$regex: search, $options: 'si'}},
                    // {email: {$regex: search, $options: 'si'}},
                    // {phone_number: {$regex: search, $options: 'si'}}
                ]
            }

            try {
                const shifts = await this.ShiftRecord?.paginate(filter, {password: 0}, page, limit, {created_at: -1});
                // TODO add facility details for each shift

                req.replyBack(200, {
                    "msg": "shifts list",
                    "data": shifts
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });


    }

    listAllShifts = async (req: IRouterRequest) => {

        const body = req.getBody();
        const page = parseInt(body.page) || 1;
        const limit = parseInt(body.limit) || 10;
        const search = body.search;

        body["shift_status"] = body.shift_status;

        let rules = {
            shift_status: 'in:pending,in_progress,complete,cancelled,closed',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            let filter: any = {};
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
            if (body.shift_status) {
                filter["shift_status"] = body.shift_status
            }
            if (body.status != undefined && body.status.length > 0) {
                filter["shift_status"] = {$in: body.status};
            }
            if (body.hcp_type != undefined) {
                filter["hcp_type"] = body.hcp_type;
            }
            if (body.hcp_types != undefined && body.hcp_types.length > 0) {
                filter["hcp_type"] = {$in: body.hcp_types};
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
            if (typeof body.shift_complete_start_date !== "undefined") {
                let shift_complete_start_date = new Date(body.shift_complete_start_date)
                if (typeof body.shift_complete_end_date !== "undefined") {
                    let shift_complete_end_date = new Date(body.shift_complete_end_date)
                    shift_complete_end_date.setDate(shift_complete_end_date.getDate() + 1)
                    filter["actuals.shift_end_time"] = {
                        "$gte": shift_complete_start_date,
                        "$lt": shift_complete_end_date
                    }
                } else {
                    let end_date = new Date(shift_complete_start_date)
                    end_date.setDate(shift_complete_start_date.getDate() + 1)
                    filter["actuals.shift_end_time"] = {"$gte": shift_complete_start_date, "$lt": end_date}
                }
            }
            if (body.shift_type != undefined) {
                filter["shift_type"] = body.shift_type;
            }
            if (body.shift_types != undefined && body.shift_types.length > 0) {
                filter["shift_type"] = {$in: body.shift_types};
            }
            if (body.warning_type != undefined) {
                filter["warning_type"] = body.warning_type;
            }
            if (search) {
                filter["$or"] = [
                    {title: {$regex: search, $options: 'si'}},
                ]
            }

            try {
                const shifts = await this.ShiftRecord?.paginate(filter, {}, page, limit, {shift_date: -1});
                const facilities_map = await this.getAllFacilitiesList();

                for (let i = 0; i < shifts.docs.length; i++) {
                    let shift = shifts.docs[i];
                    shift.facility = facilities_map[shift.facility_id]
                    shifts.docs[i] = shift
                }

                req.replyBack(200, {
                    "msg": "shifts list",
                    "data": shifts
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    listHCPShifts = async (req: IRouterRequest) => {

        const params = req.getParams();

        let body = req.getBody();
        const page = parseInt(body.page) || 1;
        const limit = parseInt(body.limit) || 20;
        const search = body.search;
        body["hcp_user_id"] = params.id;

        let rules = {
            shift_status: 'in:pending,in_progress,complete,cancelled,closed',
            hcp_user_id: 'required|exists:users,_id'
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            let filter: any = {
                hcp_user_id: new ObjectId(body.hcp_user_id)
            };
            if (body.shift_status) {
                filter["shift_status"] = body.shift_status
            }
            if (typeof body.status != "undefined") {
                if (body.status.length > 0) {
                    filter["shift_status"] = {"$in": body.status}
                }
            }
            if (body.new_shifts != undefined) {
                let date = new Date(body.new_shifts)
                filter["shift_date"] = {"$gte": date}
            }
            if (search) {
                filter["$or"] = [
                    // TODO add shift filter
                    // {facility_name: {$regex: search, $options: 'si'}},
                    // {business_name: {$regex: search, $options: 'si'}},
                    // {email: {$regex: search, $options: 'si'}},
                    // {phone_number: {$regex: search, $options: 'si'}}
                ]
            }

            try {
                const shifts = await this.ShiftRecord?.paginate(filter, {password: 0}, page, limit, {shift_date: 1});
                // TODO add facility details for each shift

                req.replyBack(200, {
                    "msg": "shifts list",
                    "data": shifts
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    viewShift = async (req: IRouterRequest) => {

        const params = req.getParams();
        const shift_id = params.id;
        const body = req.getBody();
        body["shift_id"] = shift_id;

        let rules = {
            shift_id: 'required|exists:shifts,_id',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                const shift_id = req.getParams().id;
                const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});

                if (shift) {
                    const hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(shift.hcp_user_id)});

                    hcp.facility = await this.FacilityRecord?.getFacility({_id: hcp.facility_id});
                    shift.facility = await this.FacilityRecord?.getFacility({_id: shift.facility_id});
                    shift.hcp_user.address = hcp.address
                    shift.hcp_user.experience = hcp.professional_details.experience
                    shift.hcp_user.contact_number = hcp.contact_number

                    if (shift.shift_status == "cancelled") {
                        if (typeof shift.cancelled_details != "undefined") {
                            shift.cancelled_details.cancelled_by = await this.UserRecord?.getUser({_id: new ObjectId(shift.cancelled_details.cancelled_by)});
                        }
                    }

                    req.replyBack(200, {"msg": "shift details", "data": shift});
                } else {
                    req.replyBack(500, {error: "invalid shift ID"});
                }
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });


    }

    cancel = async (req: IRouterRequest) => {

        const body = req.getBody();
        body["shift_id"] = req.getParams().id

        let rules = {
            shift_id: 'required',
            reason: 'required',
            cancelled_by: 'required|exists:users,_id'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const shift_id = req.getParams().id;

                const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});
                shift.cancelled_details = {
                    reason: body["reason"],
                    cancelled_by: new ObjectId(body["cancelled_by"])
                }
                shift.shift_status = "cancelled";
                shift.updated_at = new Date();

                this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                req.replyBack(200, {
                    "msg": "shift cancelled",
                });

                const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(shift.facility_id)})
                const hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(shift.hcp_user_id)});

                let shift_date = new Date(shift.shift_date).toDateString()
                let message = "Hi " + hcp.first_name + " Your " + shift.shift_type + " shift(s) in " + facility.facility_name + " on " + shift_date + " have been cancelled due to " + body["reason"] + ". Kindly check the app for open shifts or contact us. ~ VitaWerks"

                await sendPushNotification(hcp.user_id, message, "Shift Cancelled")

                await sendTemplateMail(ses, "Shift Cancelled", "<html><body>" + message + "</html></body>", hcp.email);

                const cleaned_phone_number = hcp.contact_number.replace(/\s/g, "");
                let phoneUsrId = regionalNumbers[hcp.address.region]
                if (typeof phoneUsrId === "undefined") {
                    phoneUsrId = process.env.MAINLINE_USER_ID
                }
                await sendSMS(phoneUsrId, message, cleaned_phone_number);

            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    closed = async (req: IRouterRequest) => {

        const body = req.getBody();
        body["shift_id"] = req.getParams().id

        let rules = {
            shift_id: 'required',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const shift_id = req.getParams().id;

                const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});
                if (shift.shift_status != "complete") {
                    return req.replyBack(500, {error: "cannot close a shift that is not completed"});
                }

                const s3Objects: any = await this.listObjects({
                    Bucket: process.env.HCP_BUCKET_NAME,
                    Prefix: "shift/" + shift_id + "/attachments"
                })

                if (s3Objects.Contents.length == 1) {

                    shift.shift_status = "closed";
                    shift.updated_at = new Date();

                    this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                    req.replyBack(200, {
                        "msg": "shift closed",
                    });

                    const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(shift.facility_id)})
                    const hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(shift.hcp_user_id)});

                    let shift_date = new Date(shift.shift_date).toDateString()
                    let url = process.env.HOST_URL + "closedShifts/view/" + shift_id
                    let message = "<html><body> New timesheet uploaded by " + hcp.first_name + " for the shift worked on " + shift_date + " at " + facility.facility_name + "<br><br> Find the application here : <a href=" + url + ">" + url + "</body></html>"
                    // await sendTemplateMail(ses, "Shift Closed", message, "account@vitawerks.com");

                } else {
                    return req.replyBack(500, {error: "please upload CDHP 530 form to complete the shift"});
                }

            } catch (err) {
                console.log(err, "err");
                return req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    checkIn = async (req: IRouterRequest) => {

        let rules = {
            hcp_user_id: 'required',
            time: 'required'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const shift_id = req.getParams().id;
                const body = req.getBody();

                const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});

                if (shift.hcp_user_id != body.hcp_user_id) {
                    req.replyBack(403, {error: "Current user not authorised to checkin"});
                    return;
                }

                if (shift.shift_status != "pending") {
                    req.replyBack(403, {error: "Shift status not ready for checkIN"});
                    return;
                }

                let shift_date = new Date(shift.shift_date)
                let time = body.time

                shift.actuals.shift_start_time = new Date(shift_date.getTime() + time * 60000);
                shift.time_breakup.check_in_time = new Date(shift_date.getTime() + time * 60000);
                shift.shift_status = "in_progress";
                shift.updated_at = new Date();

                this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                req.replyBack(200, {
                    "msg": "checkIN successful",
                    "data": shift
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    breakIn = async (req: IRouterRequest) => {

        let rules = {
            hcp_user_id: 'required',
            date: 'required|date',
            time: 'required'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

            try {
                const shift_id = req.getParams().id;
                const body = req.getBody();

                const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});

                if (shift.hcp_user_id != body.hcp_user_id) {
                    req.replyBack(403, {error: "Current user not authorised to BreakIn "});
                    return;
                }

                if (shift.shift_status != "in_progress") {
                    req.replyBack(403, {error: "Shift status not ready for BreakIn"});
                    return;
                }

                let shift_date = new Date(body.date)
                let time = body.time
                let break_in_time = new Date(shift_date.getTime() + time * 60000);

                let break_in = {
                    _id: new ObjectId(),
                    break_in_time: break_in_time
                }

                let break_timings = shift.time_breakup.break_timings
                break_timings.push(break_in)

                shift.time_breakup.break_timings = break_timings;
                shift.is_in_break = true
                shift.updated_at = new Date();

                this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                req.replyBack(200, {
                    "msg": "BreakIn successful",
                    "data": shift
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }

        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });


    }

    breakOut = async (req: IRouterRequest) => {
        let rules = {
            hcp_user_id: 'required',
            date: 'required',
            time: 'required'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

            try {
                const shift_id = req.getParams().id;
                const body = req.getBody();

                const shift = await this.ShiftRecord?.viewShift({"_id": new ObjectId(shift_id)});

                if (shift.hcp_user_id != body.hcp_user_id) {
                    req.replyBack(403, {error: "Current user not authorised to Breakout "});
                    return;
                }

                if (shift.shift_status != "in_progress") {
                    req.replyBack(403, {error: "Shift status not ready for Breakout"});
                    return;
                }

                let shift_date = new Date(body.date)
                let time = body.time
                let break_out_time = new Date(shift_date.getTime() + time * 60000);

                let break_timings: Array<object> = shift.time_breakup.break_timings

                // @ts-ignore
                for (let i in break_timings) {
                    if (!break_timings[i].hasOwnProperty("break_out_time")) {
                        // @ts-ignore
                        break_timings[i]["break_out_time"] = break_out_time
                        break;
                    }
                }

                shift.time_breakup.break_timings = break_timings;
                shift.is_in_break = false
                shift.updated_at = new Date();

                this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                req.replyBack(200, {
                    "msg": "BreakOut successful",
                    "data": shift
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    checkOut = async (req: IRouterRequest) => {
        try {
            let rules = {
                hcp_user_id: 'required',
            };

            let validation = new Validator(req.getBody(), rules);

            validation.passes(async () => {
                try {
                    const shift_id = req.getParams().id;
                    const body = req.getBody();

                    const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});

                    if (shift.hcp_user_id != body.hcp_user_id) {
                        req.replyBack(403, {error: "Current user not authorised to checkin "});
                        return;
                    }

                    if (!shift.actuals.shift_start_time) {
                        req.replyBack(403, {error: "Cannot checkOut if not checkedIN"});
                        return;
                    }

                    if (shift.shift_status != "in_progress") {
                        req.replyBack(403, {error: "Shift status not ready for checkOUT"});
                        return;
                    }

                    let shift_date = new Date(body.date)
                    let time = body.time
                    let check_out_time = new Date(shift_date.getTime() + time * 60000);

                    shift.actuals.shift_end_time = check_out_time;
                    shift.time_breakup.check_out_time = check_out_time;
                    shift.shift_status = "complete";

                    shift.updated_at = new Date();
                    this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                    const shift_start_date = new Date(shift.actuals.shift_start_time);
                    const shift_end_date = new Date(shift.actuals.shift_end_time);

                    let break_duration = 0

                    let break_timings: Array<object> = shift.time_breakup.break_timings
                    for (let i in break_timings) {
                        if (break_timings[i].hasOwnProperty("break_in_time") && break_timings[i].hasOwnProperty("break_out_time")) {
                            // @ts-ignore
                            let break_start_time = break_timings[i]["break_in_time"]
                            // @ts-ignore
                            let break_end_time = break_timings[i]["break_out_time"]
                            break_duration = break_duration + Math.floor((break_end_time.getTime() - break_start_time.getTime()) / 60000);
                        }
                    }

                    shift.actuals.shift_duration_minutes = Math.floor((shift_end_date.getTime() - shift_start_date.getTime()) / 60000);
                    shift.actuals.break_duration_minutes = break_duration;


                    req.replyBack(200, {
                        "msg": "checkOut successful",
                        "data": shift
                    });
                } catch (err) {
                    console.log(err, "err");
                    req.replyBack(500, {error: err});
                }
            });

            validation.fails((errors: any) => {
                req.replyBack(500, {errors: validation.errors.errors})
            });

        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }
    }

    webCheckInOut = async (req: IRouterRequest) => {

        let rules = {
            hcp_user_id: 'required',
            type: "required|in:check_in,check_out",
            time: "required",
            date: "required|date"
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const shift_id = req.getParams().id;
                const body = req.getBody();

                const shift = await this.ShiftRecord?.viewShift({
                    _id: new ObjectId(shift_id),
                    hcp_user_id: new ObjectId(body.hcp_user_id)
                });
                let shift_date = new Date(body.date)
                let time = body.time

                if (body.type == "check_in") {
                    if (shift.shift_status != "pending") {
                        req.replyBack(403, {error: "Shift status not ready for checkIN"});
                        return;
                    }

                    shift.actuals.shift_start_time = new Date(shift_date.getTime() + time * 60000);
                    shift.time_breakup.check_in_time = new Date(shift_date.getTime() + time * 60000);
                    shift.shift_status = "in_progress";

                } else if (body.type == "check_out") {
                    if (shift.shift_status != "in_progress") {
                        req.replyBack(403, {error: "Shift status not ready for checkOUT"});
                        return;
                    }

                    shift.actuals.shift_end_time = new Date(shift_date.getTime() + time * 60000);
                    shift.time_breakup.check_out_time = new Date(shift_date.getTime() + time * 60000);
                    shift.shift_status = "complete";
                }

                shift.updated_at = new Date();
                this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                req.replyBack(200, {
                    "msg": "shift status changed successfully",
                    "data": shift
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    webBreak = async (req: IRouterRequest) => {

        let rules = {
            hcp_user_id: 'required',
            break_timings: "required|array",
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const shift_id = req.getParams().id;
                const body = req.getBody();

                const shift = await this.ShiftRecord?.viewShift({
                    _id: new ObjectId(shift_id),
                    hcp_user_id: new ObjectId(body.hcp_user_id)
                });

                let break_timings: any = []
                for (let i in body.break_timings) {
                    let break_timing: any = {}

                    if (!body.break_timings[i].hasOwnProperty("_id")) {
                        break_timing["_id"] = new ObjectId()
                    } else {
                        break_timing["_id"] = body.break_timings[i]["_id"]
                    }
                    if (body.break_timings[i].hasOwnProperty("break_in_time")) {
                        let break_in_date = new Date(body.break_timings[i]["break_in_date"])
                        let time = body.break_timings[i]["break_in_time"]

                        break_timing["break_in_time"] = new Date(break_in_date.getTime() + time * 60000);
                    }
                    if (body.break_timings[i].hasOwnProperty("break_out_time")) {
                        let break_out_date = new Date(body.break_timings[i]["break_out_date"])
                        let time = body.break_timings[i]["break_out_time"]

                        break_timing["break_out_time"] = new Date(break_out_date.getTime() + time * 60000);
                    }

                    break_timings.push(break_timing)
                }
                shift.time_breakup.break_timings = break_timings
                shift.updated_at = new Date();
                this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                req.replyBack(200, {
                    "msg": "shift break timings updated",
                    "data": shift
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    editWebCheckInOut = async (req: IRouterRequest) => {

        let rules = {
            hcp_user_id: 'required',
            type: "required|in:check_in,check_out",
            time: "required",
            date: "required"
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const shift_id = req.getParams().id;
                const body = req.getBody();

                const shift = await this.ShiftRecord?.viewShift({
                    _id: new ObjectId(shift_id),
                    hcp_user_id: new ObjectId(body.hcp_user_id)
                });
                let shift_date = new Date(body.date)
                let time = body.time

                if (body.type == "check_in") {
                    shift.actuals.shift_start_time = new Date(shift_date.getTime() + time * 60000);
                    shift.time_breakup.check_in_time = new Date(shift_date.getTime() + time * 60000);
                } else if (body.type == "check_out") {
                    shift.actuals.shift_end_time = new Date(shift_date.getTime() + time * 60000);
                    shift.time_breakup.check_out_time = new Date(shift_date.getTime() + time * 60000);
                }

                shift.updated_at = new Date();
                this.ShiftRecord?.editShift({_id: new ObjectId(shift_id)}, shift);

                req.replyBack(200, {
                    "msg": "shift timings changed successfully",
                    "data": shift
                });
            } catch (err) {
                console.log(err, "err");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    uploadAttachment = async (req: IRouterRequest) => {
        try {
            let rules = {
                file_name: 'required',
                file_type: 'required',
                attachment_type: 'required',
                expiry_date: 'date',
            };
            let validation = new Validator(req.getBody(), rules);

            validation.fails(function (errors: any) {
                req.replyBack(400, {
                    success: false,
                    errors: validation.errors.errors
                })

            });

            validation.passes(async () => {
                try {

                    const shift_id = req.getParams().id;
                    const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});

                    if (shift && shift.shift_status === "complete") {

                        let body = req.getBody()
                        let ext = body.file_name.split(".")[1]
                        const filKey = "shift/" + shift_id + "/attachments/" + uuid() + "." + ext

                        let metaData = {
                            attachment_type: body.attachment_type,
                            file_name: body.file_name
                        }
                        if (typeof body.expiry_date != "undefined") {
                            // @ts-ignore
                            metaData["expiry_date"] = body.expiry_date
                        }
                        const response = await this.uploadFile({
                            "Bucket": process.env.HCP_BUCKET_NAME,
                            "Key": filKey,
                            "ContentType": body.file_type,
                            "Metadata": metaData
                        });

                        req.replyBack(200, {"msg": "attachment uploaded", "data": response});
                    } else {
                        req.replyBack(500, {error: "shift must be completed to upload the attachments"});
                    }

                } catch (err) {
                    console.log("err", err);
                    req.replyBack(500, {error: err});
                }

            })
        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }
    }

    listAttachments = async (req: IRouterRequest) => {
        try {
            const shift_id = req.getParams().id;
            const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});

            if (shift) {
                try {
                    const s3Objects: any = await this.listObjects({
                        Bucket: process.env.HCP_BUCKET_NAME,
                        Prefix: "shift/" + shift_id + "/attachments"
                    })

                    let attachments = []
                    if (s3Objects.Contents.length > 0) {
                        for (let object of s3Objects.Contents) {
                            let objData: any = {}

                            let url = await this.getObject({
                                "Bucket": process.env.HCP_BUCKET_NAME,
                                "Key": object.Key,
                                "Expires": 60 * 15
                            })

                            const metaData: any = await this.getMetaData({
                                Bucket: process.env.HCP_BUCKET_NAME,
                                Key: object.Key
                            })
                            if (metaData.Metadata) {
                                objData.attachment_type = metaData.Metadata.attachment_type
                                objData.expiry_date = metaData.Metadata.expiry_date
                                objData.file_name = metaData.Metadata.file_name
                                objData.ContentType = metaData.ContentType;
                                objData.file_key = object.Key
                            }
                            objData.url = url

                            attachments.push(objData)
                        }
                    }

                    req.replyBack(200, {msg: "list of attachments", data: attachments})
                } catch (err) {
                    console.log("error", err)
                    req.replyBack(500, {error: err});
                }
            }

        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }
    }

    deleteAttachment = async (req: IRouterRequest) => {
        try {
            const shift_id = req.getParams().id;
            const shift = await this.ShiftRecord?.viewShift({_id: new ObjectId(shift_id)});

            if (shift) {
                try {
                    await this.deleteObject({
                        "Bucket": process.env.HCP_BUCKET_NAME,
                        "Key": req.getBody().file_key,
                    });

                    req.replyBack(200, {msg: "attachment deleted"})
                } catch (err) {
                    console.log("error", err)
                    req.replyBack(500, {error: err});
                }
            }

        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }
    }

    statusStats = async (req: IRouterRequest) => {
        try {
            const queryArgs = req.getQueryArgs();

            let rules = {
                hcp_user_id: 'required',
            };

            let validation = new Validator(queryArgs, rules);

            validation.fails((errors: any) => {
                req.replyBack(500, {errors: validation.errors.errors})
            });

            validation.passes(async () => {
                try {
                    let hcp_user_id = new ObjectId(queryArgs.hcp_user_id)
                    let date = new Date().toJSON().slice(0, 10);
                    let today = new Date(date)

                    const pending = await this.ShiftRecord?.getShifts({
                        "shift_status": "pending",
                        "hcp_user_id": hcp_user_id,
                        "shift_date": {"$gte": today}
                    })
                    const in_progress = await this.ShiftRecord?.getShifts({
                        "shift_status": "in_progress",
                        "hcp_user_id": hcp_user_id
                    })
                    const complete = await this.ShiftRecord?.getShifts({
                        "shift_status": "complete",
                        "hcp_user_id": hcp_user_id
                    })
                    const closed = await this.ShiftRecord?.getShifts({
                        "shift_status": "closed",
                        "hcp_user_id": hcp_user_id
                    })

                    let data = {
                        pending: pending.length,
                        in_progress: in_progress.length,
                        complete: complete.length,
                        closed: closed.length,
                    }


                    req.replyBack(200, {
                        "msg": "shift status stats",
                        data
                    });
                } catch (err) {
                    req.replyBack(500, {error: err});
                }
            })

        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }


    }
}


export {ShiftController};


