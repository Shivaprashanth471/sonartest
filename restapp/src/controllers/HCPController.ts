import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IHCPController} from "./IHCPController";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import {IHCPRecord} from "../records/IHCPRecord";
import Validator from "validatorjs";
import {ObjectId} from "mongodb";
import bcrypt from "bcryptjs";
import {IUserRecord} from "../records/IUserRecord";
import {IHCPEducationRecord} from "../records/IHCPEducationRecord";
import {IHCPExperienceRecord} from "../records/IHCPExperienceRecord";
import {IHCPReferenceRecord} from "../records/IHCPReferenceRecord";
import axios, {AxiosRequestConfig} from "axios";
import {v4 as uuid} from 'uuid';
import {type} from "os";
import _ from 'lodash'
import {sendMail, sendSMS, sendTemplateMail} from "../utils/helpers"
import {WelcomeTemplate} from "../utils/template"
import {query} from "express";


const AWS = require("aws-sdk");
const S3 = new AWS.S3({
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: process.env.REGION
});
const ses = new AWS.SES({
    region: "us-east-2"
})

// TODO role based access --> Swetha pls work on it later. Restrict API endpints based on Login user role

const regionalNumbers: any = {
    "San Francisco": "4804152698011648",
    "San Diego": "5664509011099648",
    // "Los Angeles": "5832197005049856",
}

@injectable()
class HCPController implements IHCPController {

    @inject(TYPES.IHCPRecord) HCPRecord: IHCPRecord | undefined;
    @inject(TYPES.IHCPEducationRecord) HCPEducationRecord: IHCPEducationRecord | undefined;
    @inject(TYPES.IHCPExperienceRecord) HCPExperianceRecord: IHCPExperienceRecord | undefined;
    @inject(TYPES.IUserRecord) UserRecord: IUserRecord | undefined;
    @inject(TYPES.IHCPReferenceRecord) HCPReferenceRecord: IHCPReferenceRecord | undefined;

    addHCP = (req: IRouterRequest): void => {
        let rules = {
            first_name: 'required',
            last_name: 'required',
            gender: 'required|in:male,female,other',
            hcp_type: 'required|in:RN,LVN,CNA,MedTech,CareGiver',
            email: 'email|unique:hcps,email|unique:users,email',
            contact_number: 'min:8',
            movable_radius_miles: "numeric|min:1",
            address: {
                "street": "min:2",
                "city": "required|min:2",
                "region": "required|min:2",
                "state": "min:1",
                "country": "min:2",
                "zip_code": "required|min:5",
                "geoCode": "NA"
            },
            nc_details: {
                dnr: 'min:2',
                shift_type_preference: 'min:2',
                location_preference: 'min:2',
                more_important_preference: 'min:2',
                family_consideration: 'min:2',
                zone_assignment: 'min:2',
                vaccine: 'min:2|in:full,half,exempted',
                covid_facility_preference: 'min:2|in:covid,non_covid,both',
                is_fulltime_job: 'boolean',
                is_supplement_to_income: 'boolean',
                is_studying: 'boolean',
                is_gusto_invited: 'boolean',
                is_gusto_onboarded: 'boolean',
                gusto_type: 'in:direct_deposit,paycheck',
                last_call_date: 'date',
                contact_type: 'in:email,text_message,voicemail,chat',
                other_information: 'min:2',
            },
            professional_details: {
                experience: "numeric|min:0",
                // speciality: "required"
            },
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

            try {

                const body = req.getBody();

                const hcp = {
                    "first_name": body.first_name,
                    "last_name": body.last_name,
                    "gender": body.gender,
                    "contact_number": body.contact_number,
                    "email": body.email,
                    "about": body.about,
                    "movable_radius_miles": body.movable_radius_miles,
                    "hcp_type": body.hcp_type,
                    "address": {
                        "street": body.address.street,
                        "city": body.address.city,
                        "region": body.address.region,
                        "state": body.address.state,
                        "country": body.address.country,
                        "zip_code": body.address.zip_code,
                        "geoCode": "NA"
                    },
                    "professional_details": {
                        "experience": body.professional_details.experience,
                        "summary": body.professional_details.summary,
                        "speciality": body.professional_details.speciality
                    },
                    "nc_details": {
                        "dnr": body.nc_details.dnr,
                        "shift_type_preference": body.nc_details.shift_type_preference,
                        "location_preference": body.nc_details.location_preference,
                        "more_important_preference": body.nc_details.more_important_preference,
                        "family_consideration": body.nc_details.family_consideration,
                        "zone_assignment": body.nc_details.zone_assignment,
                        "vaccine": body.nc_details.vaccine,
                        "covid_facility_preference": body.nc_details.covid_facility_preference,
                        "is_fulltime_job": body.nc_details.is_fulltime_job,
                        "is_supplement_to_income": body.nc_details.is_supplement_to_income,
                        "is_studying": body.nc_details.is_studying,
                        "is_gusto_invited": body.nc_details.is_gusto_invited,
                        "is_gusto_onboarded": body.nc_details.is_gusto_onboarded,
                        "gusto_type": body.nc_details.gusto_type,
                        "last_call_date": body.nc_details.last_call_date,
                        "contact_type": body.nc_details.contact_type,
                        "other_information": body.nc_details.other_information,
                    },
                    "is_approved": false,
                    "status": "pending",
                    "is_active": false,
                    "created_at": new Date(),
                    "updated_at": new Date()
                }

                await this.HCPRecord?.addHCP(hcp);

                req.replyBack(200, {
                    msg: "HCP registered successfully !",
                    data: hcp
                })

            } catch (err) {
                console.log("err", err);
                req.replyBack(500, {
                    error: err
                })
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    listHCP = async (req: IRouterRequest): Promise<void> => {
        const body = req.getBody();
        const page = parseInt(body.page) || 1;
        const limit = parseInt(body.limit) || 20;
        const search = body.search;

        const hcp_type = body.hcp_type;

        let filter: any = {};
        if (hcp_type) {
            filter["hcp_type"] = {$in: hcp_type}
        }
        if (body.is_approved != undefined) {
            if (body.is_approved == '0') {
                filter["is_approved"] = false
            } else {
                filter["is_approved"] = true
            }
        }
        if (search) {
            filter["$or"] = [
                {first_name: {$regex: search, $options: 'si'}},
                {last_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}},
                {contact_number: {$regex: search, $options: 'si'}}
            ]
        }
        if (typeof body.is_active !== "undefined") {
            filter["is_active"] = JSON.parse(body.is_active)
        }
        if (typeof body.start_date !== "undefined") {
            let start_date = new Date(body.start_date)
            if (typeof body.end_date !== "undefined") {
                let end_date = new Date(body.end_date)
                end_date.setDate(end_date.getDate() + 1)
                filter["created_at"] = {"$gte": start_date, "$lt": end_date}
            } else {
                let end_date = new Date(start_date)
                end_date.setDate(start_date.getDate() + 1)
                filter["created_at"] = {"$gte": start_date, "$lt": end_date}
            }
        }

        try {
            const users = await this.HCPRecord?.paginate(filter, {password: 0}, page, limit, {created_at: -1});
            req.replyBack(200, {"msg": "hcp list", "data": users});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    listLiteHCP = async (req: IRouterRequest): Promise<void> => {
        const queryArgs = req.getQueryArgs();
        const search = queryArgs.search;

        const hcp_type = queryArgs.hcp_type;

        let filter: any = {};
        if (hcp_type) {
            filter["hcp_type"] = hcp_type
        }
        if (queryArgs.is_approved != undefined) {
            if (queryArgs.is_approved == '0') {
                filter["is_approved"] = false
            } else {
                filter["is_approved"] = true
            }
        }
        if (search) {
            filter["$or"] = [
                {first_name: {$regex: search, $options: 'si'}},
                {last_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}},
                {contact_number: {$regex: search, $options: 'si'}}
            ]
        }

        try {
            const hcps = await this.HCPRecord?.getHCPs(filter);
            req.replyBack(200, {"msg": "hcp list", "data": hcps});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    getHCP = async (req: IRouterRequest): Promise<void> => {

        let body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                let user = await this.HCPRecord?.getHCP({_id: new ObjectId(hcp_id)});
                req.replyBack(200, {"msg": "hcp data", "data": user});
            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });


    }

    getHCPByUserID = async (req: IRouterRequest): Promise<void> => {

        const body = req.getBody();
        const params = req.getParams();
        const user_id = params.id;
        body["user_id"] = user_id

        let rules = {
            user_id: 'required|exists:users,_id',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                let user = await this.HCPRecord?.getHCP({user_id: new ObjectId(user_id)});
                req.replyBack(200, {"msg": "hcp data", "data": user});

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }
        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

    }

    approveHCP = (req: IRouterRequest): void => {
        const body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                // const hcp_types = await getHCPTypes()

                let hcp = await this.HCPRecord?.getHCP({_id: new ObjectId(hcp_id)});
                let phoneUsrId = regionalNumbers[hcp.address.region]
                if (typeof phoneUsrId === "undefined") {
                    phoneUsrId = process.env.MAINLINE_USER_ID
                }

                if (hcp.is_approved) {
                    req.replyBack(500, {
                        success: false,
                        error: "HCP account is already approved"
                    });
                    return;
                }

                const rawPassword = "123456";
                let hashPassword = bcrypt.hashSync(rawPassword, 5);
                let new_user: any = {};
                new_user = {
                    "first_name": hcp.first_name,
                    "last_name": hcp.last_name,
                    "contact_number": hcp.contact_number,
                    "email": hcp.email,
                    "password": hashPassword,                    //randomPassword(5),
                    "role": "hcp",
                    "is_active": true,
                    "created_at": new Date(),
                    "updated_at": new Date(),
                    "is_new_user": true,
                }

                await this.UserRecord?.addUser(new_user);

                hcp.user_id = new ObjectId(new_user._id);
                hcp.is_approved = true;
                hcp.status = "approved"
                hcp.is_active = true
                hcp.updated_at = new Date()

                await this.HCPRecord?.editHCP({_id: new ObjectId(hcp_id)}, hcp);

                // const cleaned_phone_number = hcp.contact_number.replace(/\s/g, "");
                // await sendSMS(phoneUsrId, "Hello " + new_user.first_name + ", Welcome to Vitawerks, Your email is " + new_user.email + ". Your password is " + rawPassword, cleaned_phone_number);
                // await sendMail(ses, "Welcome to VitaWerks", "Welcome to Vitawerks. You can login with below details on Mobile App.\nUsername : " + new_user.email + "\n Password : " + rawPassword, hcp.email);

                // let nc = await this.UserRecord?.getUser({_id: new ObjectId(hcp.nurse_champion_id)})
                // const emailContent = WelcomeTemplate(hcp.first_name, nc.first_name, nc.first_name + " " + nc.last_name, nc.email)
                // await sendTemplateMail(ses, "Welcome to VitaWerks", emailContent, hcp.email);

                req.replyBack(200, {
                    msg: "HCP approved",
                    data: hcp
                });

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    editHCP = (req: IRouterRequest): void => {

        const body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            gender: 'in:male,female,other',
            is_active: 'boolean',
            hcp_type: 'in:RN,LVN,CNA,MedTech,CareGiver',
            email: 'email|unique:hcps,email,' + hcp_id,
            contact_number: 'min:8',
            movable_radius_miles: "numeric|min:1",
            nc_details: {
                dnr: 'min:2',
                shift_type_preference: 'min:2',
                location_preference: 'min:2',
                more_important_preference: 'min:2',
                family_consideration: 'min:2',
                zone_assignment: 'min:2',
                vaccine: 'min:2|in:full,half,exempted',
                covid_facility_preference: 'min:2|in:covid,non_covid,both',
                is_fulltime_job: 'boolean',
                is_supplement_to_income: 'boolean',
                is_studying: 'boolean',
                is_gusto_invited: 'boolean',
                is_gusto_onboarded: 'boolean',
                gusto_type: 'in:direct_deposit,paycheck',
                last_call_date: 'date',
                contact_type: 'in:email,text_message,voicemail,chat',
                other_information: 'min:2',
            },
            address: {
                "street": "min:2",
                "city": "min:2",
                "region": "min:2",
                "state": "min:1",
                "country": "min:2",
                "zip_code": "min:5",
                "geoCode": "NA"
            },
            professional_details: {
                experience: "numeric|min:0",
            }
        };


        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                let hcp = await this.HCPRecord?.getHCP({_id: new ObjectId(hcp_id)});

                let user: any, is_user: boolean = false
                if (hcp.user_id) {
                    user = await this.UserRecord?.getUser({_id: new ObjectId(hcp.user_id)});
                    is_user = true
                }

                if (body.first_name) {
                    hcp.first_name = body.first_name;
                }
                if (body.last_name) {
                    hcp.last_name = body.last_name;
                }
                if (body.gender) {
                    hcp.gender = body.gender;
                }
                if (body.contact_number) {
                    hcp.contact_number = body.contact_number;
                    if (is_user) {
                        user.contact_number = body.contact_number;
                    }
                }
                if (body.email) {
                    hcp.email = body.email;
                    if (is_user) {
                        user.email = body.email;
                    }
                }
                if (body.hcp_type) {
                    hcp.hcp_type = body.hcp_type;
                }
                if (body.about) {
                    hcp.about = body.about;
                }
                if (body.movable_radius_miles) {
                    hcp.movable_radius_miles = body.movable_radius_miles;
                }
                if (body.address) {
                    hcp.address = body.address;
                }
                if (body.professional_details) {
                    hcp.professional_details = body.professional_details;
                }
                if (body.nc_details) {
                    hcp.nc_details = body.nc_details;
                }
                if (body.nurse_champion_id) {
                    hcp.nurse_champion_id = new ObjectId(body.nurse_champion_id)
                }

                if (body.is_active != undefined) {
                    hcp.is_active = body.is_active
                    if (is_user) {
                        user.is_active = hcp.is_active;
                    }
                }

                hcp.updated_at = new Date()

                await this.HCPRecord?.editHCP({_id: new ObjectId(hcp_id)}, hcp)

                if (!_.isEmpty(user)) {
                    user.updated_at = new Date();

                    await this.UserRecord?.editUser({_id: new ObjectId(hcp.user_id)}, user)
                }

                req.replyBack(200, {
                    msg: "HCP updated",
                    data: hcp
                });

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

    }

    rejectHCP = (req: IRouterRequest): void => {
        const body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            reason: 'required',
            rejected_by: 'required'
        };


        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                // const hcp_types = await getHCPTypes()

                let hcp = await this.HCPRecord?.getHCP({_id: new ObjectId(hcp_id)});

                if (hcp.is_approved) {
                    req.replyBack(500, {
                        success: false,
                        error: "HCP account is already approved"
                    });
                    return;
                }

                hcp.is_approved = false;
                hcp.status = "rejected"
                hcp.rejected_details = {
                    reason: body["reason"],
                    rejected_by: body["rejected_by"]
                }
                hcp.updated_at = new Date()

                await this.HCPRecord?.editHCP({_id: new ObjectId(hcp_id)}, hcp);

                req.replyBack(200, {
                    msg: "HCP rejected",
                    data: hcp
                });

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    // Education related handlers
    addHCPEducation = (req: IRouterRequest): void => {
        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            institute_name: 'required|min:2',
            location: 'min:2',
            degree: 'required',
            start_date: 'date',
            graduation_date: 'date'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

                try {

                    const body = req.getBody();

                    const hcp_education = {
                        "hcp_id": new ObjectId(hcp_id),
                        "institute_name": body.institute_name,
                        "location": body.location,
                        "degree": body.degree,
                        "start_date": body.start_date,
                        "graduation_date": body.graduation_date,
                        "created_at": new Date(),
                        "updated_at": new Date()
                    }

                    await this.HCPEducationRecord?.addHCPEducation(hcp_education);

                    req.replyBack(200, {
                        msg: "HCP education added successfully !",
                        data: hcp_education
                    })

                } catch
                    (err) {
                    console.log("err", err);
                    req.replyBack(500, {
                        error: err
                    })
                }

            }
        );

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    listHCPEducation = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                const filter = {
                    hcp_id: new ObjectId(hcp_id)
                }

                const users = await this.HCPEducationRecord?.listHCPEducation(filter);
                req.replyBack(200, {"msg": "facility education list", "data": users});

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    removeHCPEducation = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        const education_id = params.education_id
        body["hcp_id"] = hcp_id;
        body["education_id"] = education_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            education_id: 'required|exists:hcps_education,_id',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

                try {

                    await this.HCPEducationRecord?.deleteHCPEducation({_id: new ObjectId(education_id)});

                    req.replyBack(200, {
                        msg: 'hcp education record deleted'
                    });
                } catch (err: any) {
                    console.log("err", err);
                    req.replyBack(500, {
                        msg: 'hcp education cannot be deleted',
                        error: err.toString()
                    });
                }

            }
        );

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    // experiences
    addHCPExperiance = (req: IRouterRequest): void => {
        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            facility_name: 'required',
            location: 'required',
            start_date: 'date',
            end_date: 'date',
            position_title: 'required',
            specialisation: 'required',
            exp_type: 'required|in:fulltime,volunteer',
            skills: 'min:2',
            still_working_here: 'boolean'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

                try {

                    const body = req.getBody();
                    let item: any = {};

                    item = {
                        "hcp_id": new ObjectId(hcp_id),
                        "facility_name": body.facility_name,
                        "location": body.location,
                        "start_date": body.start_date,
                        "end_date": body.end_date,
                        "position_title": body.position_title,
                        "specialisation": body.specialisation,
                        "exp_type": body.exp_type,
                        "still_working_here": body.still_working_here,
                        "created_at": new Date(),
                        "updated_at": new Date()
                    }

                    if (body.skills) {
                        item.skills_string = body.skills;
                        const skills = item.skills_string.split(",");
                        let cleaned_skills: any[] = [];
                        skills.forEach((skill: any) => {
                            skill = skill.trim();
                            if (skill != "") {
                                cleaned_skills.push(skill);
                            }
                        });
                        item.skills = cleaned_skills
                    }

                    await this.HCPExperianceRecord?.addHCPExperience(item);

                    req.replyBack(200, {
                        msg: "HCP experience added successfully !",
                        data: item
                    })

                } catch
                    (err) {
                    console.log("err", err);
                    req.replyBack(500, {
                        error: err
                    })
                }

            }
        );

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    listHCPExperiance = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        let body = req.getBody();
        let queryArgs = req.getQueryArgs()

        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;
        // @ts-ignore
        body["exp_type"] = queryArgs["exp_type"]


        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            exp_type: 'in:fulltime,volunteer',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                const filter = {
                    hcp_id: new ObjectId(hcp_id)
                }
                if (typeof body["exp_type"] != "undefined") {
                    // @ts-ignore
                    filter["exp_type"] = body["exp_type"]
                }

                const users = await this.HCPExperianceRecord?.listHCPExperience(filter);
                req.replyBack(200, {"msg": "hcp experience list", "data": users});

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    removeHCPExperiance = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        const experience_id = params.experience_id
        body["hcp_id"] = hcp_id;
        body["experience_id"] = experience_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            experience_id: 'required|exists:hcps_experience,_id',
        };


        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

                try {
                    await this.HCPExperianceRecord?.deleteHCPExperience({_id: new ObjectId(experience_id)});

                    req.replyBack(200, {
                        msg: 'hcp experience record deleted'
                    });
                } catch (err: any) {
                    console.log("err", err);
                    req.replyBack(500, {
                        msg: 'hcp experience cannot be deleted',
                        error: err.toString()
                    });
                }

            }
        );

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

    }

    // references
    addHCPReference = (req: IRouterRequest): void => {
        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            reference_name: 'required',
            job_title: 'required',
            contact_method: 'required',
            phone: 'min:2',
            email: 'email'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

                try {

                    const body = req.getBody();
                    let item: any = {};

                    item = {
                        "hcp_id": new ObjectId(hcp_id),
                        "reference_name": body.reference_name,
                        "job_title": body.job_title,
                        "contact_method": body.contact_method,
                        "phone": body.phone,
                        "email": body.email,
                        "created_at": new Date(),
                        "updated_at": new Date()
                    }

                    await this.HCPReferenceRecord?.addHCPReference(item);

                    req.replyBack(200, {
                        msg: "HCP reference added successfully !",
                        data: item
                    })

                } catch
                    (err) {
                    console.log("err", err);
                    req.replyBack(500, {
                        error: err
                    })
                }

            }
        );

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    listHCPReference = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                const filter = {
                    hcp_id: new ObjectId(hcp_id)
                }

                const users = await this.HCPReferenceRecord?.listHCPReference(filter);
                req.replyBack(200, {"msg": "hcp reference list", "data": users});

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }

        });

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    removeHCPReference = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        let body = req.getBody();
        const hcp_id = params.id;
        const reference_id = params.reference_id
        body["hcp_id"] = hcp_id;
        body["reference_id"] = reference_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            reference_id: 'required|exists:hcps_reference,_id',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

                try {
                    await this.HCPReferenceRecord?.deleteHCPReference({_id: new ObjectId(reference_id)});

                    req.replyBack(200, {
                        msg: 'hcp reference record deleted'
                    });
                } catch (err: any) {
                    console.log("err", err);
                    req.replyBack(500, {
                        msg: 'hcp reference cannot be deleted',
                        error: err.toString()
                    });
                }

            }
        );

        validation.fails((errors: any) => {
            console.log("fails ... ")
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });


    }

    // attachments
    uploadFile = (params: any) => {
        return new Promise(function (resolve, reject) {
            S3.getSignedUrl('putObject', params, function (err: any, url: string) {
                if (err) {
                    reject(err);
                } else {
                    resolve(url);
                }
            });
        });
    }

    addHCPAttachment = (req: IRouterRequest): void => {
        const params = req.getParams();
        const hcp_id = params.id;
        let body = req.getBody();
        body["hcp_id"] = hcp_id

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            file_name: 'required',
            file_type: 'required',
            attachment_type: 'required',
            expiry_date: 'date'
        };
        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                let ext = body.file_name.split(".")[1]
                const filKey = "hcp/" + hcp_id + "/attachments/" + uuid() + "." + ext

                let metaData: any = {
                    attachment_type: body.attachment_type,
                    file_type: body.file_type,
                }

                if (body.expiry_date) {
                    metaData["expiry_date"] = body.expiry_date
                }

                const response = await this.uploadFile({
                    "Bucket": process.env.HCP_BUCKET_NAME,
                    "Key": filKey,
                    "ContentType": body.file_type,
                    "Metadata": metaData
                });

                req.replyBack(200, {
                    msg: 'hcp attachment added ' + process.env.REGION + " region adde",
                    data: response
                });

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    msg: 'cannot add hcp attachment',
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

    listObjects = (params: any): any => {
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

    getMetaData = (params: any): any => {
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

    listHCPAttachment = (req: IRouterRequest): void => {
        const params = req.getParams();
        const hcp_id = params.id;
        let body = req.getBody();
        body["hcp_id"] = hcp_id

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
        };
        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                const s3Objects = await this.listObjects({
                    Bucket: process.env.HCP_BUCKET_NAME,
                    Prefix: "hcp/" + hcp_id + "/attachments"
                })

                let attachments = []
                if (s3Objects.Contents.length > 0) {
                    for (let object of s3Objects.Contents) {
                        let objData: { [name: string]: any } = {}


                        let url = await this.getObject({
                            "Bucket": process.env.HCP_BUCKET_NAME,
                            "Key": object.Key,
                            "Expires": 60 * 15
                        })

                        const metaData = await this.getMetaData({
                            Bucket: process.env.HCP_BUCKET_NAME,
                            Key: object.Key
                        })

                        if (metaData.Metadata) {
                            objData.attachment_type = metaData.Metadata.attachment_type
                            objData.expiry_date = metaData.Metadata.expiry_date
                            objData.file_name = metaData.Metadata.file_name
                            objData.file_key = object.Key
                            objData.ContentType = metaData.ContentType;
                        }
                        objData.url = url

                        attachments.push(objData)
                    }
                }

                req.replyBack(200, {
                    msg: 'hcp attachments list',
                    data: attachments
                });

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    msg: 'hcp attachment list error',
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

    removeHCPAttachment = (req: IRouterRequest): void => {

        const params = req.getParams();
        const hcp_id = params.id;
        let body = req.getBody();
        body["hcp_id"] = hcp_id

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            file_key: 'required',
        };
        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                await this.deleteObject({
                    "Bucket": process.env.HCP_BUCKET_NAME,
                    "Key": body.file_key,
                });

                req.replyBack(200, {
                    msg: 'hcp attachments removed',
                });

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    msg: 'hcp attachment delete error',
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

    // contract
    addHCPContract = (req: IRouterRequest): void => {

        let body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            file_name: 'required',
            file_type: 'required',
            attachment_type: 'required',
            expiry_date: 'date',
            hcp_id: 'required|exists:hcps,_id',
            rate_per_hour: 'required|min:0',
            signed_on: 'required|date',
            salary_credit_date: 'required|max:2',
        };
        let validation = new Validator(body, rules);

        validation.fails((errors: any) => {
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                let ext = body.file_name.split(".")[1]
                const filKey = "hcp/" + hcp_id + "/contract/" + uuid() + "." + ext

                let metaData: any = {
                    attachment_type: body.attachment_type,
                    file_name: body.file_name,
                    file_type: body.file_type,
                    rate_per_hour: body.rate_per_hour,
                    signed_on: body.signed_on,
                    salary_credit_date: body.salary_credit_date
                }

                if (body.expiry_date) {
                    metaData["expiry_data"] = body.expiry_date
                }

                // TODO --> Swetha we should store the contract details in DB since they are financial related.

                const response = await this.uploadFile({
                    "Bucket": process.env.HCP_BUCKET_NAME,
                    "Key": filKey,
                    "ContentType": body.file_type,
                    "Metadata": metaData
                });

                req.replyBack(200, {
                    msg: 'contract updated',
                    data: response
                });

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    msg: 'hcp contract add error',
                    error: err.toString()
                });
            }
        });

    }

    getHCPContract = (req: IRouterRequest): void => {
        let body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
        };
        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                const s3Objects = await this.listObjects({
                    Bucket: process.env.HCP_BUCKET_NAME,
                    Prefix: "hcp/" + hcp_id + "/contract"
                })

                let attachments = []
                if (s3Objects.Contents.length > 0) {
                    for (let object of s3Objects.Contents) {
                        let objData: any = {}

                        let url = await this.getObject({
                            "Bucket": process.env.HCP_BUCKET_NAME,
                            "Key": object.Key,
                            Expires: 60 * 15
                        })

                        const metaData = await this.getMetaData({
                            Bucket: process.env.HCP_BUCKET_NAME,
                            Key: object.Key
                        })

                        console.log("Contract Metadata ===========>", metaData)
                        if (metaData.Metadata) {
                            objData.attachment_type = metaData.Metadata.attachment_type
                            objData.expiry_date = metaData.Metadata.expiry_date
                            objData.file_name = metaData.Metadata.file_name
                            objData.rate_per_hour = metaData.Metadata.rate_per_hour
                            objData.signed_on = metaData.Metadata.signed_on
                            objData.salary_credit_date = metaData.Metadata.salary_credit_date
                            objData.ContentType = metaData.ContentType;
                            objData.file_key = object.Key
                        }
                        objData.url = url

                        attachments.push(objData)
                    }
                }


                req.replyBack(200, {
                    msg: 'contract details',
                    data: attachments
                });


            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    msg: 'hcp contract get error',
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

    removeHCPContract = (req: IRouterRequest): void => {

        let body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            file_key: 'required',
            hcp_id: 'required|exists:hcps,_id'
        };
        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                await this.deleteObject({
                    "Bucket": process.env.HCP_BUCKET_NAME,
                    "Key": body.file_key,
                });

                req.replyBack(200, {
                    msg: 'hcp contract deleted '
                });

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    msg: 'hcp contract delete error',
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

    editHCPProfile = (req: IRouterRequest): void => {

        const body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
            hcp_type: 'in:RN,LVN,CNA,MedTech,CareGiver',
            shift_type_preference: 'min:2',
            region: "min:2",
        };

        let validation = new Validator(body, rules);

        validation.fails((errors: any) => {
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                let hcp = await this.HCPRecord?.getHCP({_id: new ObjectId(hcp_id)});

                if (body.hcp_type) {
                    hcp.hcp_type = body.hcp_type;
                }
                if (body.region) {
                    hcp.address.region = body.region;
                }
                if (body.shift_type_preference) {
                    hcp.nc_details.shift_type_preference = body.shift_type_preference;
                }
                hcp.updated_at = new Date()

                await this.HCPRecord?.editHCP({_id: new ObjectId(hcp_id)}, hcp)

                req.replyBack(200, {
                    msg: "HCP profile updated",
                    data: hcp
                });

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }

        });

    }

    getHCProfile = async (req: IRouterRequest): Promise<void> => {

        let body = req.getBody();
        const params = req.getParams();
        const hcp_id = params.id;
        body["hcp_id"] = hcp_id;

        let rules = {
            hcp_id: 'required|exists:hcps,_id',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.fails((errors: any) => {
            console.log("fails valid ... ", errors)
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                let data: any = {}
                let specializations: any = []
                let total_exp = 0
                let hcp = await this.HCPRecord?.getHCP({_id: new ObjectId(hcp_id)});
                let work_experiences = await this.HCPExperianceRecord?.listHCPExperience({hcp_id: new ObjectId(hcp_id)});
                for (let experience of work_experiences) {
                    if (experience.still_working_here == "0" && experience.exp_type == "fulltime") {
                        let start_date = new Date(experience.start_date)
                        let end_date = new Date(experience.end_date)

                        var diffYear = (end_date.getTime() - start_date.getTime()) / 1000;
                        diffYear /= (60 * 60 * 24);
                        total_exp = total_exp + Math.abs(Math.round(diffYear / 365.25))

                        specializations.push(experience.specialisation)
                    }
                }

                data = {
                    hcp_type: hcp.hcp_type,
                    region: hcp.address.region,
                    shift_type_preference: hcp.nc_details.shift_type_preference,
                    specializations,
                    total_exp
                }
                req.replyBack(200, {"msg": "hcp data", data});
            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {error: err});
            }
        });

    }

}

export {HCPController};


