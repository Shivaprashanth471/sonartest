import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IShiftApplicationController} from "./IShiftApplicationController";
import {IShiftRequirementRecord} from "../records/IShiftRequirementRecord";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import Validator from "validatorjs";
import {IShiftApplicationRecord} from "../records/IShiftApplicationRecord";

import {v4 as uuid} from 'uuid';
import AWS from "aws-sdk";
import {ObjectId} from "mongodb";
import {IHCPRecord} from "../records/IHCPRecord";
import {IUserRecord} from "../records/IUserRecord";
import {IFacilityRecord} from "../records/IFacilityRecord";
import {sendSMS, sendTemplateMail, sendPushNotification} from "../utils/helpers"

const lambda = new AWS.Lambda({
    region: process.env.AWS_DEFAULT_REGION
});

const ses = new AWS.SES({
    region: "us-east-2"
})
const regionalNumbers: any = {
    "San Francisco": "4804152698011648",
    "San Diego": "5664509011099648",
    // "Los Angeles": "5832197005049856",
}

@injectable()
class ShiftApplicationController implements IShiftApplicationController {
    @inject(TYPES.IShiftRequirementRecord) ShiftRequirementRecord: IShiftRequirementRecord | undefined;
    @inject(TYPES.IShiftApplicationRecord) ShiftApplicationRecord: IShiftApplicationRecord | undefined;
    @inject(TYPES.IHCPRecord) HCPRecord: IHCPRecord | undefined;
    @inject(TYPES.IUserRecord) UserRecord: IUserRecord | undefined;
    @inject(TYPES.IFacilityRecord) FacilityRecord: IFacilityRecord | undefined;
    @inject(TYPES.ControllerLogger) logger: any | undefined;

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
                            // console.log(JSON.parse(data.Payload.toString()).body);
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

    getAllFacilitiesList = async (): Promise<any> => {
        return new Promise((resolve, reject) => {
            try {
                const params = {
                    FunctionName: 'facility-service-' + process.env.APP_STAGE + '-restapp',
                    Payload: JSON.stringify({
                        "resource": "/facility/",
                        "path": "/facility/",
                        "httpMethod": "GET",
                        "requestContext": {
                            "resourcePath": "/facility/",
                            "httpMethod": "GET",
                            "path": "/dev/",
                        },
                        "headers": {
                            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                        }
                    })
                };
                lambda.invoke(params, (err, data) => {
                    if (err || !data) {
                        reject(err);
                    }
                    if (data && data.Payload) {
                        let facilities_map: any = {}
                        const facilities = JSON.parse(JSON.parse(data.Payload.toString()).body).data;
                        // console.log(facilities);
                        for (const facility of facilities) {
                            const {id, facility_name, facility_uid, address} = facility;
                            facilities_map[id] = {id, facility_name, facility_uid, address};
                        }
                        resolve(facilities_map);
                    }
                });
            } catch (err) {
                resolve({});
            }
        })
    }

    approveApplication = (req: IRouterRequest): void => {

        let body = req.getBody();
        const application_id = req.getParams().a_id;
        body["application_id"] = application_id;

        let rules = {
            approved_by: 'required|exists:users,_id',
            application_id: 'required|exists:shift_applications,_id'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {

                const application = await this.ShiftApplicationRecord?.getApplication({_id: new ObjectId(application_id)});
                const hcp_user = await this.UserRecord?.getUser({_id: new ObjectId(application.hcp_user_id)});

                const approved_by = await this.UserRecord?.getUser({_id: new ObjectId(body.approved_by)});

                if (hcp_user.is_active == "false") {
                    return req.replyBack(500, {error: "Cannot approve application HCP is deactivated"})
                }

                application.status = "approved";
                application.approved_by_id = body.approved_by;
                application.updated_at = new Date();

                application.approved_by = {
                    first_name: approved_by.first_name,
                    last_name: approved_by.last_name,
                    email: approved_by.email,
                    role: approved_by.role
                }

                await this.ShiftApplicationRecord?.editApplication({_id: new ObjectId(application_id)}, application);
                req.replyBack(200, {msg: 'Application has been approved'})

                const applications = await this.ShiftApplicationRecord?.getApplications({
                    requirement_id: new ObjectId(application.requirement_id),
                    status: "approved"
                });
                let requirement = await this.ShiftRequirementRecord?.getRequirement({_id: new ObjectId(application.requirement_id)});
                if (applications.length > 0) {
                    if (applications.length == requirement.hcp_count) {
                        requirement.got_required_hcps = true
                        await this.ShiftRequirementRecord?.editRequirement({_id: new ObjectId(application.requirement_id)}, requirement);
                    }
                }


                const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(requirement.facility_id)})
                const hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(application.hcp_user_id)});

                let shift_date = new Date(requirement.shift_date).toDateString()
                let message = "Hi " + application.hcp_data.first_name + " Your " + requirement.shift_type + " shift(s) in " + facility.facility_name + " on " + shift_date + " have been APPROVED! ~ VitaWerks"

                await sendPushNotification(hcp.user_id, message, "Shift Approved")

                await sendTemplateMail(ses, "Shift Approved", "<html><body>" + message + "</html></body>", hcp.email);

                const cleaned_phone_number = hcp.contact_number.replace(/\s/g, "");
                let phoneUsrId = regionalNumbers[hcp.address.region]
                if (typeof phoneUsrId === "undefined") {
                    phoneUsrId = process.env.MAINLINE_USER_ID
                }
                await sendSMS(phoneUsrId, message, cleaned_phone_number);

            } catch (err: any) {
                console.log("err", err)
                req.replyBack(500, {error: err.toString()})
            }

        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    newApplication = (req: IRouterRequest): void => {

        let body = req.getBody();
        const params = req.getParams();
        const requirement_id = params.id;
        body["requirement_id"] = requirement_id;

        let rules = {
            hcp_user_id: 'required|exists:users,_id',
            requirement_id: 'required|exists:shift_requirements,_id',
            applied_by: 'required',
            differential_amount: 'numeric|min:0'
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {

            try {
                const requirement = await this.ShiftRequirementRecord?.getRequirement({_id: new ObjectId(requirement_id)});
                const hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(body.hcp_user_id)});
                const hcp_user = await this.UserRecord?.getUser({_id: new ObjectId(body.hcp_user_id)});

                if (!hcp_user.is_active) {
                    return req.replyBack(500, {error: "Cannot apply HCP is deactivated"})
                }

                const applied_by_user = await this.UserRecord?.getUser({_id: new ObjectId(body.applied_by)});

                if (requirement) {
                    if (requirement.hcp_type != hcp.hcp_type) {
                        return req.replyBack(500, {error: "can only apply to requirement of the HCP type"})
                    }
                    if (requirement.status == "cancelled") {
                        return req.replyBack(500, {error: "cannot apply to a cancelled requirement"})
                    }

                    let applications: Array<object> = []
                    applications = await this.ShiftApplicationRecord?.getApplications({
                        requirement_id: new ObjectId(params.id),
                        hcp_user_id: new ObjectId(body.hcp_user_id)
                    });
                    console.log("pending application count", applications.length)
                    if (applications.length > 0) {
                        return req.replyBack(500, {error: "You have already applied to this requirement"})
                    }

                    // TODO did not understand
                    // applications = await this.ShiftApplicationRecord?.getHCPApplication(params.id, body.hcp_user_id, {status: "approved"});
                    // console.log("approved applications count =====", applications.length)
                    // if (applications.length > 0) {
                    //     return req.replyBack(500, {error: "Shift has already been approved"})
                    // }

                    const application_data = {
                        requirement_id: new ObjectId(params.id), // URL ID
                        facility_id: new ObjectId(requirement.facility_id),
                        shift_type: requirement.shift_type,
                        hcp_user_id: new ObjectId(body.hcp_user_id),
                        added_by_id: new ObjectId(body.applied_by),
                        shift_date: new Date(requirement.shift_date),
                        hcp_data: {
                            first_name: hcp.first_name,
                            last_name: hcp.last_name,
                            email: hcp.email,
                            gender: hcp.gender,
                            hcp_type: hcp.hcp_type,
                            rate: 10 // TODO accept rate in hcp registration and use that here ..
                        },
                        applied_by: {
                            first_name: applied_by_user.first_name,
                            last_name: applied_by_user.last_name,
                            email: applied_by_user.email,
                            role: applied_by_user.role
                        },
                        status: "pending",
                        is_shift_created: false,
                        created_at: new Date(),
                        updated_at: new Date()
                    }

                    await this.ShiftApplicationRecord?.addApplication(application_data);

                    req.replyBack(201, {
                        msg: "The application request has been submitted Successfully",
                        application_date: application_data
                    });

                    // const nc_user_details = await this.UserRecord?.getUser({_id: new ObjectId(hcp.nurse_champion_id)});
                    const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(requirement.facility_id)})
                    console.log("NC details and facility =========>")

                    let url = process.env.HOST_URL + "shiftsRequirements/view/" + requirement._id
                    console.log("Shift application URL ======>", url)
                    let shift_date = new Date(requirement.shift_date).toDateString()
                    let message = "<html> <body>Shift application received from " + hcp.first_name + " " + hcp.hcp_type + " - " + facility.facility_name + " - " + shift_date + "<br> Find the application here : <a href=" + url + ">" + url + "</body></html>"

                    // await sendTemplateMail(ses, "New Shift Application", message, "pranitha@tericsoft.com");

                    // await sendTemplateMail(ses, "New Shift Application", message, "account9@vitawerks.com");
                    // await sendTemplateMail(ses, "New Shift Application", message, "account7@vitawerks.com");
                    // await sendTemplateMail(ses, "New Shift Application", message, "account14@vitawerks.com");
                    // await sendTemplateMail(ses, "New Shift Application", message, "account2@vitawerks.com");

                } else {
                    req.replyBack(500, {error: "invalid requirement id"})
                }

            } catch (err: any) {
                console.log(err, "error")
                req.replyBack(500, {error: err.toString()})
            }

        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    rejectApplication = (req: IRouterRequest): void => {
        let body = req.getBody();
        const application_id = req.getParams().a_id;
        body["application_id"] = application_id;

        let rules = {
            rejected_by: 'required|exists:users,_id',
            reason: 'required|min:5',
            application_id: 'required|exists:shift_applications,_id'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const application = await this.ShiftApplicationRecord?.getApplication({_id: new ObjectId(application_id)});
                const hcp_user = await this.UserRecord?.getUser({_id: new ObjectId(application.hcp_user_id)});

                const rejected_by = await this.UserRecord?.getUser({_id: new ObjectId(body.rejected_by)});

                if (hcp_user.is_active == "false") {
                    return req.replyBack(500, {error: "Cannot reject application HCP is deactivated"})
                }

                application.status = "rejected";
                application.rejected_by_id = body.rejected_by;
                application.updated_at = new Date();

                application.rejected_by = {
                    first_name: rejected_by.first_name,
                    last_name: rejected_by.last_name,
                    email: rejected_by.email,
                    role: rejected_by.role
                }
                application.rejected_reason = body["reason"]

                await this.ShiftApplicationRecord?.editApplication({_id: new ObjectId(application_id)}, application);
                // TODO send email

                req.replyBack(200, {msg: 'Application has been rejected'})

            } catch (err: any) {
                console.log("err", err)
                req.replyBack(500, {error: err.toString()})
            }

        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        })
    }

    withdrawApplication = (req: IRouterRequest): void => {
    }

    listApplications = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        const queryArgs = req.getQueryArgs();

        const requirement_id = params.id;
        const body = req.getBody();
        body["requirement_id"] = requirement_id;

        let rules = {
            requirement_id: 'required|exists:shift_requirements,_id',

        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                let filter: any = {
                    requirement_id: new ObjectId(requirement_id)
                }
                if (queryArgs.status) {
                    filter["status"] = queryArgs.status;
                }
                const applications = await this.ShiftApplicationRecord?.getApplications(filter);
                req.replyBack(200, {data: applications})

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    error: err.toString()
                });
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

    listHCPApplications = async (req: IRouterRequest): Promise<void> => {
        const params = req.getParams();
        const queryArgs = req.getQueryArgs();

        const user_id = params.id;
        const body = req.getBody();
        body["user_id"] = user_id;

        let rules = {
            user_id: 'required|exists:users,_id',

        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                let filter: any = {
                    hcp_user_id: new ObjectId(user_id)
                }
                if (queryArgs.status) {
                    filter["status"] = queryArgs.status;
                }
                const applications = await this.ShiftApplicationRecord?.getApplications(filter);

                let requirementMappings: any = {}
                const requirements = await this.ShiftRequirementRecord?.getAllRequirements({})
                for (let req of requirements) {
                    let start_date = new Date(req.shift_timings.start_time)
                    let end_date = new Date(req.shift_timings.end_time)
                    const milliSeconds: any = (end_date.getTime() - start_date.getTime());
                    const expected_duration = Math.floor(milliSeconds / 60000);

                    let expected = {
                        shift_duration_minutes: expected_duration,
                        shift_start_time: req.shift_timings.start_time,
                        shift_end_time: req.shift_timings.end_time
                    }
                    requirementMappings[req._id] = {
                        facility_id: req.facility_id,
                        warning_type: req.warning_type,
                        shift_date: req.shift_date,
                        shift_type: req.shift_type,
                        expected
                    }
                }

                for (let application of applications) {
                    application["requirement_details"] = requirementMappings[application.requirement_id]
                }
                req.replyBack(200, {data: applications})

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    error: err.toString()
                });
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

    listAllApplications = async (req: IRouterRequest): Promise<void> => {

        const queryArgs = req.getQueryArgs();
        const page = parseInt(queryArgs.page) || 1;
        const limit = parseInt(queryArgs.limit) || 20;

        let rules = {
            page: 'numeric',
            limit: 'numeric'
        };

        let validation = new Validator(req.getQueryArgs(), rules);

        validation.fails((errors: any) => {
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                let filter: any = {}
                if (queryArgs.new_shifts != undefined) {
                    let date = new Date(queryArgs.new_shifts)
                    filter["shift_date"] = {"$gte": date}
                }
                if (typeof queryArgs.start_date !== "undefined") {
                    let start_date = new Date(queryArgs.start_date)
                    if (typeof queryArgs.end_date !== "undefined") {
                        let end_date = new Date(queryArgs.end_date)
                        filter["shift_date"] = {"$gte": start_date, "$lte": end_date}
                    } else {
                        filter["shift_date"] = {"$eq": start_date}
                    }
                }
                if (queryArgs.status) {
                    filter["status"] = queryArgs.status;
                }

                const applications = await this.ShiftApplicationRecord?.paginate(filter, {}, page, limit, {created_at: -1});

                let facility_ids: any = []
                let facility_mapping: any = {}
                for (let application of applications.docs) {
                    facility_ids.push(new ObjectId(application.facility_id))
                }
                const facilities = await this.FacilityRecord?.getFacilities({_id: {$in: facility_ids}})
                for (let facility of facilities) {
                    facility_mapping[facility._id] = facility.facility_name
                }

                for (let application of applications.docs) {
                    application["facility_name"] = facility_mapping[application.facility_id]
                }

                return req.replyBack(200, {data: applications})
            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    error: err.toString()
                });
            }
        });

    }

}

export {ShiftApplicationController};


