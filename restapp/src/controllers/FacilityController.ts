import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IFacilityController} from "./IFacilityController";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import {IFacilityRecord} from "../records/IFacilityRecord";
import {ObjectId} from 'mongodb'
import Validator from "validatorjs";

import {IShiftRequirementRecord} from "../records/IShiftRequirementRecord";
import {IFacilityMemberRecord} from "../records/IFacilityMemberRecord";
import {IFacilityShiftRecord} from "../records/IFacilityShiftRecord";
import {type} from "os";

const AWS = require("aws-sdk");
const S3 = new AWS.S3({
    apiVersion: '2006-03-01',
    signatureVersion: 'v4',
    region: process.env.REGION
});

@injectable()
class FacilityController implements IFacilityController {
    @inject(TYPES.IShiftRequirementRecord) ShiftRequirementRecord: IShiftRequirementRecord | undefined;
    @inject(TYPES.IFacilityRecord) FacilityRecord: IFacilityRecord | undefined;
    @inject(TYPES.IFacilityMemberRecord) FacilityMemberRecord: IFacilityMemberRecord | undefined;
    @inject(TYPES.IFacilityShiftRecord) FacilityShiftRecord: IFacilityShiftRecord | undefined;
    @inject(TYPES.ControllerLogger) logger: any | undefined;

    milesToRadian = function (miles: any) {
        var earthRadiusInMiles = 3959;
        return miles / earthRadiusInMiles;
    };

    list = async (req: IRouterRequest) => {

        const body = req.getBody();
        const page = parseInt(body.page) || 1;
        const limit = parseInt(body.limit) || 20;
        const search = body.search;

        let filter: any = {};
        if (search) {
            filter["$or"] = [
                {facility_name: {$regex: search, $options: 'si'}},
                {business_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}},
                {phone_number: {$regex: search, $options: 'si'}}
            ]
        }
        if (typeof body.regions !== "undefined") {
            filter["address.region_name"] = {$in: body.regions}
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
            const facilities = await this.FacilityRecord?.paginate(filter, {}, page, limit, {created_at: -1});
            req.replyBack(200, {"msg": "facility list", "data": facilities});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    facilityDistanceList = async (req: IRouterRequest) => {

        const body = req.getBody();
        const search = body.search;

        let filter: any = {};
        if (search) {
            filter["$or"] = [
                {facility_name: {$regex: search, $options: 'si'}},
                {business_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}},
                {phone_number: {$regex: search, $options: 'si'}}
            ]
        }
        if (typeof body.regions !== "undefined") {
            filter["address.region_name"] = {$in: body.regions}
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
            if (typeof body.shift_requirements != "undefined" && JSON.parse(body.shift_requirements)) {
                let shift_req_filter: any = {}
                if (typeof body.hcp_type != "undefined") {
                    shift_req_filter["hcp_type"] = body.hcp_type
                }
                if (typeof body.new_shifts != "undefined") {
                    let date = new Date(body.new_shifts)
                    shift_req_filter["shift_date"] = {"$gte": date}
                }
                shift_req_filter["status"] = "open"

                let facility_ids: Array<any> = []
                facility_ids = await this.ShiftRequirementRecord?.getFacilityRequirements(shift_req_filter)
                filter["_id"] = {"$in": facility_ids}
            }

            let aggregateFilter: any = []
            if (typeof body.coordinates != "undefined") {
                aggregateFilter = [
                    {
                        $geoNear: {
                            near: {type: "Point", coordinates: body.coordinates},
                            distanceField: "distance",
                            distanceMultiplier: 0.035604569315199,
                            spherical: true
                        }
                    },
                    {$match: filter},
                    {$sort: {created_at: -1}}
                ]
            } else {
                aggregateFilter = [
                    {$match: filter},
                    {$sort: {created_at: -1}}
                ]
            }

            const facilities = await this.FacilityRecord?.aggregate(aggregateFilter);
            req.replyBack(200, {"msg": "facility list", "data": facilities});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    mapBasedList = async (req: IRouterRequest) => {

        const body = req.getBody();
        const search = body.search;

        let filter: any = {};
        if (search) {
            filter["$or"] = [
                {facility_name: {$regex: search, $options: 'si'}},
                {business_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}},
                {phone_number: {$regex: search, $options: 'si'}}
            ]
        }
        if (typeof body.is_active !== "undefined") {
            filter["is_active"] = JSON.parse(body.is_active)
        }
        if (typeof body.coordinates !== "undefined" && typeof body.radius !== "undefined") {
            let radius = this.milesToRadian(body.radius)
            filter["location"] = {
                $geoWithin: {
                    $centerSphere: [body.coordinates, radius]
                }
            }
        }

        try {
            let shift_req_filter: any = {}
            if (typeof body.hcp_type != "undefined") {
                shift_req_filter["hcp_type"] = body.hcp_type
            }
            if (typeof body.shift_type != "undefined") {
                shift_req_filter["shift_type"] = body.shift_type
            }
            if (typeof body.warning_type != "undefined") {
                shift_req_filter["warning_type"] = body.warning_type
            }
            if (typeof body.new_shifts != "undefined") {
                let date = new Date(body.new_shifts)
                shift_req_filter["shift_date"] = {"$gte": date}
            }
            if (typeof body.shift_start_date !== "undefined") {
                let shift_start_date = new Date(body.shift_start_date)
                if (typeof body.shift_end_date !== "undefined") {
                    let shift_end_date = new Date(body.shift_end_date)
                    shift_req_filter["shift_date"] = {"$gte": shift_start_date, "$lte": shift_end_date}
                } else {
                    shift_req_filter["shift_date"] = {"$eq": shift_start_date}
                }
            }
            shift_req_filter["status"] = "open"

            let facility_ids: Array<any> = []
            facility_ids = await this.ShiftRequirementRecord?.getFacilityRequirements(shift_req_filter)
            filter["_id"] = {"$in": facility_ids}

            shift_req_filter["facility_id"] = {"$in": facility_ids}
            let aggregateFilter = [
                {"$match": shift_req_filter},
                {"$group": {"_id": '$facility_id', "count": {"$sum": 1}}}
            ]

            let facility_requirements: any = {}
            let facility_requirements_count = await this.ShiftRequirementRecord?.getFacilityRequirementsCount(aggregateFilter)

            for (let facility_requirement of facility_requirements_count) {
                facility_requirements[facility_requirement._id] = facility_requirement.count
            }

            const facilities = await this.FacilityRecord?.getFacilities(filter);
            for (let facility of facilities) {
                facility["requirements_count"] = facility_requirements[facility._id] || 0
            }

            req.replyBack(200, {"msg": "facility list", "data": facilities});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    getFacility = async (req: IRouterRequest) => {

        const params = req.getParams();
        const facility_id = params.id;

        try {
            let facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(facility_id)});

            const s3Objects = await this.listObjects({
                Bucket: process.env.HCP_BUCKET_NAME,
                Prefix: "facility_images/" + facility_id
            })

            if (s3Objects.Contents.length > 0) {
                for (let object of s3Objects.Contents) {
                    let objData: any = {}

                    let url = await this.getObject({
                        "Bucket": process.env.HCP_BUCKET_NAME,
                        "Key": object.Key,
                        Expires: 60 * 15
                    })
                    facility.image_url = url
                }
            }
            req.replyBack(200, {"msg": "facility data", "data": facility});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    addFacility = async (req: IRouterRequest): Promise<any> => {

        let rules = {
            facility_uid: 'required|unique:facilities,facility_uid',
            facility_name: 'required|min:2',
            facility_short_name: 'min:2',
            coordinates: 'required|array',
            business_name: 'min:2',
            email: 'email',
            phone_number: 'required',
            extension_number: 'min:1',
            website_url: 'is_url',
            address: {
                street: 'min: 3',
                city: 'min:2',
                state: 'min:1',
                region_name: 'min:2',
                country: 'min:2',
                zip_code: 'min:2'
            },
            hourly_base_rates: {
                cna: 'numeric|min:0',
                lvn: 'numeric|min:0',
                rn: 'numeric|min:0',
                care_giver: 'numeric|min:0',
                med_tech: 'numeric|min:0',
                holiday: 'numeric|min:0',
                hazard: 'numeric|min:0',
            },
            diff_rates: {
                pm: 'numeric|min:0',
                noc: 'numeric|min:0',
                weekend: 'numeric|min:0',
            },
            conditional_rates: {
                overtime: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                },
                rush: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                },
                cancellation_before: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                },
                shift_early_completion: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                }
            },
            about: 'min:2',
            timezone: 'required'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

            try {
                const body = req.getBody();

                let facility = {
                    "facility_uid": body.facility_uid,
                    "facility_name": body.facility_name,
                    "facility_short_name": body.facility_short_name,
                    "business_name": body.business_name,
                    "email": body.email,
                    "phone_number": body.phone_number,
                    "extension_number": body.extension_number,
                    "website_url": body.website_url,
                    "address": {
                        "street": body.address.street,
                        "city": body.address.city,
                        "state": body.address.state,
                        "country": body.address.country,
                        "zip_code": body.address.zip_code,
                        "region_name": body.address.region_name
                    },
                    "hourly_base_rates": {
                        "cna": body.hourly_base_rates.cna,
                        "lvn": body.hourly_base_rates.lvn,
                        "rn": body.hourly_base_rates.rn,
                        "care_giver": body.hourly_base_rates.care_giver,
                        "med_tech": body.hourly_base_rates.med_tech,
                        "holiday": body.hourly_base_rates.holiday,
                        "hazard": body.hourly_base_rates.hazard,
                    },
                    "diff_rates": {
                        "pm": body.diff_rates.pm,
                        "noc": body.diff_rates.noc,
                        "weekend": body.diff_rates.weekend,
                    },
                    "conditional_rates": {
                        "overtime": {
                            "hours": body.conditional_rates.overtime.hours,
                            "rate": body.conditional_rates.overtime.rate,
                        },
                        "rush": {
                            "hours": body.conditional_rates.rush.hours,
                            "rate": body.conditional_rates.rush.rate,
                        },
                        "cancellation_before": {
                            "hours": body.conditional_rates.cancellation_before.hours,
                            "rate": body.conditional_rates.cancellation_before.rate,
                        },
                        "shift_early_completion": {
                            "hours": body.conditional_rates.shift_early_completion.hours,
                            "rate": body.conditional_rates.shift_early_completion.rate,
                        }
                    },
                    "is_active": true,
                    "about": body.about,
                    "timezone": body.timezone,
                    "location": {
                        type: "Point",
                        coordinates: body.coordinates
                    },
                    "created_at": new Date(),
                    "updated_at": new Date()
                }

                await this.FacilityRecord?.addFacility(facility);

                req.replyBack(200, {
                    msg: "Facility Registered",
                    data: facility
                });

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
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

    editFacility = async (req: IRouterRequest): Promise<any> => {

        const params = req.getParams();
        const facility_id = params.id;
        let body = req.getBody();
        body["facility_id"] = facility_id;

        let rules = {
            facility_id: 'required|exists:facilities,_id',
            facility_uid: 'unique:facilities,facility_uid,' + facility_id,
            facility_name: 'min:2',
            facility_short_name: 'min:2',
            business_name: 'min:2',
            extension_number: 'min:1',
            coordinates: 'array',
            email: 'email',
            is_active: 'boolean',
            website_url: 'is_url',
            address: {
                street: 'min:2',
                city: 'min:2',
                state: 'min:2',
                region_name: 'min:2',
                country: 'min:2',
                zip_code: 'min:2'
            },
            hourly_base_rates: {
                cna: 'numeric|min:0',
                lvn: 'numeric|min:0',
                rn: 'numeric|min:0',
                care_giver: 'numeric|min:0',
                med_tech: 'numeric|min:0',
                holiday: 'numeric|min:0',
                hazard: 'numeric|min:0',
            },
            diff_rates: {
                pm: 'numeric|min:0',
                noc: 'numeric|min:0',
                weekend: 'numeric|min:0',
            },
            conditional_rates: {
                overtime: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                },
                rush: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                },
                cancellation_before: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                },
                shift_early_completion: {
                    hours: 'numeric|min:0',
                    rate: 'numeric|min:0',
                }
            },
            about: 'min:2'
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {

            try {
                const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(facility_id)});
                const body: any = req.getBody();

                if (typeof body.facility_name != "undefined") {
                    facility.facility_name = body.facility_name;
                }
                if (typeof body.coordinates != "undefined") {
                    facility.location = {
                        type: "Point",
                        coordinates: body.coordinates
                    }
                }
                if (typeof body.facility_short_name != "undefined") {
                    facility.facility_short_name = body.facility_short_name;
                }
                if (typeof body.business_name != "undefined") {
                    facility.business_name = body.business_name;
                }
                if (typeof body.facility_uid != "undefined") {
                    facility.facility_uid = body.facility_uid;
                }
                if (typeof body.email != "undefined") {
                    facility.email = body.email;
                }
                if (typeof body.phone_number != "undefined") {
                    facility.phone_number = body.phone_number;
                }
                if (typeof body.extension_number != "undefined") {
                    facility.extension_number = body.extension_number;
                }
                if (typeof body.website_url != "undefined") {
                    facility.website_url = body.website_url;
                }
                if (typeof body.is_active != undefined) {
                    facility.is_active = body.is_active;
                }

                if (typeof body.address != "undefined") {
                    facility.address = body.address;
                }

                if (typeof body.email != "undefined") {
                    facility.about = body.about;
                }

                if (typeof body.hourly_base_rates != "undefined" && typeof body.hourly_base_rates.cna != "undefined") {
                    facility.hourly_base_rates.cna = body.hourly_base_rates.cna;
                }
                if (typeof body.hourly_base_rates != "undefined" && typeof body.hourly_base_rates.lvn != "undefined") {
                    facility.hourly_base_rates.lvn = body.hourly_base_rates.lvn;
                }
                if (typeof body.hourly_base_rates != "undefined" && typeof body.hourly_base_rates.rn != "undefined") {
                    facility.hourly_base_rates.rn = body.hourly_base_rates.rn;
                }
                if (typeof body.hourly_base_rates != "undefined" && typeof body.hourly_base_rates.care_giver != "undefined") {
                    facility.hourly_base_rates.care_giver = body.hourly_base_rates.care_giver;
                }
                if (typeof body.hourly_base_rates != "undefined" && typeof body.hourly_base_rates.med_tech != "undefined") {
                    facility.hourly_base_rates.med_tech = body.hourly_base_rates.med_tech;
                }
                if (typeof body.hourly_base_rates != "undefined" && typeof body.hourly_base_rates.holiday != "undefined") {
                    facility.hourly_base_rates.holiday = body.hourly_base_rates.holiday;
                }
                if (typeof body.hourly_base_rates != "undefined" && typeof body.hourly_base_rates.hazard != "undefined") {
                    facility.hourly_base_rates.hazard = body.hourly_base_rates.hazard;
                }

                if (typeof body.diff_rates != "undefined" && typeof body.diff_rates.pm != "undefined") {
                    facility.diff_rates.pm = body.diff_rates.pm;
                }
                if (typeof body.diff_rates != "undefined" && typeof body.diff_rates.noc != "undefined") {
                    facility.diff_rates.noc = body.diff_rates.noc;
                }
                if (typeof body.diff_rates != "undefined" && typeof body.diff_rates.weekend != "undefined") {
                    facility.diff_rates.weekend = body.diff_rates.weekend;
                }

                if (typeof body.conditional_rates != "undefined" && typeof body.conditional_rates.overtime != "undefined") {
                    facility.conditional_rates.overtime = body.conditional_rates.overtime;
                }
                if (typeof body.conditional_rates != "undefined" && typeof body.conditional_rates.rush != "undefined") {
                    facility.conditional_rates.rush = body.conditional_rates.rush;
                }
                if (typeof body.conditional_rates != "undefined" && typeof body.conditional_rates.cancellation_before != "undefined") {
                    facility.conditional_rates.cancellation_before = body.conditional_rates.cancellation_before;
                }
                if (typeof body.conditional_rates != "undefined" && typeof body.conditional_rates.shift_early_completion != "undefined") {
                    facility.conditional_rates.shift_early_completion = body.conditional_rates.shift_early_completion;
                }
                if (typeof body.timezone != "undefined") {
                    facility.timezone = body.timezone;
                }

                facility.updated_at = new Date()

                await this.FacilityRecord?.editFacility({_id: new ObjectId(facility_id)}, facility);

                req.replyBack(200, {msg: 'updated facility details', data: facility});

            } catch (err) {
                console.log("err", err);
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

    addFacilityMember = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        const facility_id = params.id;
        let body = req.getBody();
        body["facility_id"] = facility_id;

        let rules = {
            facility_id: 'required|exists:facilities,_id',
            name: 'required|min:2',
            extension_number: 'min:1',
            phone_number: 'min:2',
            email: 'email',
            designation: 'min:2',
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
                const body = req.getBody();
                const params = req.getParams();
                const facility_id = params.id;

                const member = {
                    "facility_id": new ObjectId(facility_id),
                    "name": body.name,
                    "phone_number": body.phone_number,
                    "extension_number": body.extension_number,
                    "email": body.email,
                    "designation": body.designation,
                    "created_at": new Date(),
                    "updated_at": new Date(),
                }

                await this.FacilityMemberRecord?.addFacilityMember(member);

                req.replyBack(200, {
                    msg: "Facility member added",
                    data: member
                });

            } catch (err) {
                console.log(err, "error");
                req.replyBack(500, {
                    error: err
                });
            }
        });
    }

    deleteFacilityMember = async (req: IRouterRequest): Promise<void> => {
        try {
            const params = req.getParams();
            // const facility_id = params.id;
            const member_id = params.member_id;

            // const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(facility_id)});
            // const facility_member = await this.FacilityMemberRecord?.getFacilityMember({_id: new ObjectId(member_id)});

            await this.FacilityMemberRecord?.deleteFacilityMember({_id: new ObjectId(member_id)});

            req.replyBack(200, {
                msg: 'facility member record deleted'
            });
        } catch (err: any) {
            console.log("err", err);
            req.replyBack(500, {
                msg: 'facility member cannot be deleted',
                error: err.toString()
            });
        }
    }

    getFacilityMembers = async (req: IRouterRequest): Promise<void> => {
        const params = req.getParams();

        const filter: any = {
            facility_id: new ObjectId(params.id)
        }

        try {
            const users = await this.FacilityMemberRecord?.getAllFacilityMembers(filter);
            req.replyBack(200, {"msg": "facility member list", "data": users});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    addFacilityShift = async (req: IRouterRequest): Promise<void> => {

        const params = req.getParams();
        const facility_id = params.id;
        let body = req.getBody();
        body["facility_id"] = facility_id;

        let rules = {
            facility_id: 'required|exists:facilities,_id',
            shift_start_time: 'required|numeric|min:0|max:1440',
            shift_end_time: 'required|numeric|min:0|max:1440',
            shift_type: 'required|min:2',
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                // const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(facility_id)});
                // let date = new Date()
                // let today = new Date(date.getFullYear(), date.getMonth(), date.getDay())
                //
                // // let utcStart = moment(today).utc(false).add(body.shift_start_time, 'minutes')
                // // let startTime = (utcStart.hour() * 60) + utcStart.minute()
                // // let utcEnd = moment(today).utc(false).add(body.shift_end_time, 'minutes')
                // // let endTime = (utcEnd.hour() * 60) + utcEnd.minute()
                //
                // let start_time = moment(today).add(body.shift_start_time, 'minutes')
                // let end_time = moment(today).add(body.shift_end_time, 'minutes')
                //
                // let startTime = moment(start_time).add(facility.timezone, 'minutes')
                // let endTime = moment(end_time).add(facility.timezone, 'minutes')
                //
                // let shift_start_time = (startTime.hour() * 60) + startTime.minute()
                // let shift_end_time = (endTime.hour() * 60) + endTime.minute()
                //
                // console.log("==========>", start_time, end_time, startTime, endTime, shift_start_time, shift_end_time)

                const shift = {
                    "facility_id": new ObjectId(facility_id),
                    "shift_start_time": body.shift_start_time,
                    "shift_end_time": body.shift_end_time,
                    "shift_type": body.shift_type,
                    "created_at": new Date()
                }

                await this.FacilityShiftRecord?.addFacilityShift(shift);

                return req.replyBack(200, {
                    msg: "Facility shift added",
                    data: shift
                });

            } catch (err) {
                console.log(err, "error");
                return req.replyBack(500, {
                    error: err
                });
            }
        });

        validation.fails((errors: any) => {
            console.log("fails ... ")
            return req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });
    }

    deleteFacilityShift = async (req: IRouterRequest): Promise<void> => {
        try {
            const params = req.getParams();
            // const facility_id = params.id;
            const shift_id = params.shift_id;

            // const facility = await this.FacilityRecord?.getFacility({_id: new ObjectId(facility_id)});
            // const facility_member = await this.FacilityMemberRecord?.getFacilityMember({_id: new ObjectId(shift_id)});

            await this.FacilityShiftRecord?.deleteFacilityShift({_id: new ObjectId(shift_id)});

            req.replyBack(200, {
                msg: 'facility member record deleted'
            });
        } catch (err: any) {
            console.log("err", err);
            req.replyBack(500, {
                msg: 'facility member cannot be deleted',
                error: err.toString()
            });
        }
    }

    getFacilityShifts = async (req: IRouterRequest): Promise<void> => {
        const params = req.getParams();

        const filter: any = {
            facility_id: new ObjectId(params.id)
        }

        try {
            const users = await this.FacilityShiftRecord?.getAllFacilityShifts(filter);
            req.replyBack(200, {
                "msg": "facility shifts list",
                "data": users
            });
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    listLite = async (req: IRouterRequest) => {

        const body = req.getBody();
        const search = body.search;

        let filter: any = {};
        if (search) {
            filter["$or"] = [
                {facility_name: {$regex: search, $options: 'si'}},
                {business_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}},
                {phone_number: {$regex: search, $options: 'si'}}
            ]
        }
        if (typeof body.regions !== "undefined" && body.regions.length > 0) {
            filter["address.region_name"] = {$in: body.regions}
        }

        try {
            const facilities = await this.FacilityRecord?.getFacilities(filter);
            req.replyBack(200, {"msg": "facilities list", "data": facilities});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

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

    uploadProfile = (req: IRouterRequest): void => {

        const params = req.getParams();
        const facility_id = params.id;
        let body = req.getBody();
        body["facility_id"] = facility_id;

        let rules = {
            file_name: 'required',
            file_type: 'required',
        };
        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                const filKey = "facility_images/" + facility_id + "/" + facility_id

                const response = await this.uploadFile({
                    "Bucket": process.env.HCP_BUCKET_NAME,
                    "Key": filKey,
                    "ContentType": body.file_type,
                });

                req.replyBack(200, {
                    msg: 'facility image uploaded',
                    data: response
                });

            } catch (err: any) {
                console.log("err", err);
                req.replyBack(500, {
                    msg: 'facility image upload error',
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

    deleteProfile = async (req: IRouterRequest) => {
        try {
            const params = req.getParams();
            const facility_id = params.id;
            let body = req.getBody();
            body["facility_id"] = facility_id;

            let rules = {
                facility_id: 'required',
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
                    let file_key = "facility_images/" + facility_id + "/" + facility_id
                    await this.deleteObject({
                        "Bucket": process.env.HCP_BUCKET_NAME,
                        "Key": file_key,
                    });

                    req.replyBack(200, {msg: "profile removed"})

                } catch (err: any) {
                    console.log("err", err);
                    req.replyBack(500, {
                        msg: 'facility image delete error',
                        error: err.toString()
                    });
                }
            });

        } catch (err) {
            console.log(err, "err");
            req.replyBack(500, {error: err});
        }
    }

}

export {FacilityController};


