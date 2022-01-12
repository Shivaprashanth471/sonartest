import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IBlastsController} from "./IBlastsController";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import {IBlastRecord} from "../records/IBlastRecord";
import {Blast} from "../models/Blast";
import Validator from "validatorjs";
import AWS from "aws-sdk";
import {v4 as uuid} from 'uuid';
import {IBlastGroupRecord} from "../records/IBlastGroupRecord";
import {removeDuplicates, sendSMS} from "../utils/helpers";
import {ObjectId} from 'mongodb'
import {IHCPRecord} from "../records/IHCPRecord";
import {IGroupMemberRecord} from "../records/IGroupMemberRecord";

const lambda = new AWS.Lambda({
    region: process.env.AWS_DEFAULT_REGION
});

const sqs = new AWS.SQS({
    region: process.env.AWS_DEFAULT_REGION
});

const regionalNumbers: any = {
    "San Francisco": "4804152698011648",
    "San Diego": "5664509011099648",
    // "Los Angeles": "5832197005049856",
}

@injectable()
class BlastsController implements IBlastsController {
    @inject(TYPES.IHCPRecord) HCPRecord: IHCPRecord | undefined;
    @inject(TYPES.IGroupMemberRecord) GroupMemberRecord: IGroupMemberRecord | undefined;
    @inject(TYPES.IBlastRecord) BlastRecord: IBlastRecord | undefined;
    @inject(TYPES.IBlastGroupRecord) BlastGroupRecord: IBlastGroupRecord | undefined;
    @inject(TYPES.ControllerLogger) logger: any | undefined;

    scheduleSMS = async (phone: string, text: string, id: string,) => {
        const queueURL = process.env.SMS_QUEUE_URL || "";

        console.log(queueURL, " QueueURL");
        return sqs.sendMessage({
            QueueUrl: queueURL,
            MessageBody: JSON.stringify({
                phone, text: text + " " + uuid(), id
            })
        }).promise();
    }

    addBlast = async (req: IRouterRequest) => {

        let rules = {
            blast_owner_id: 'required',
            title: 'required|min:3',
            text_msg: 'min:10',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const body = req.getBody();
                let blast: Blast = {
                    title: body.title,
                    blast_owner_id: body.blast_owner_id,
                    text_msg: body.text_msg,
                    is_blasted: false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                const response = await this.BlastRecord?.addBlast(blast);
                req.replyBack(201, {
                    "msg": "new blast created",
                    "data": blast
                });

            } catch (err) {
                console.log(err);
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    listBlasts = async (req: IRouterRequest) => {
        try {
            const queryArgs = req.getQueryArgs()
            let filter: any = {}
            if (typeof queryArgs["search"] != "undefined") {
                filter["$or"] = [
                    {title: {$regex: queryArgs["search"], $options: 'si'}}
                ]
            }

            const blasts = await this.BlastRecord?.getAllBlasts(filter);
            req.replyBack(200, {
                "msg": "blast list",
                "data": blasts
            });
        } catch (err) {
            req.replyBack(500, {
                "error": err
            });
        }
    }

    editBlast = async (req: IRouterRequest) => {
        let rules = {
            blast_owner_id: 'required',
            text_msg: 'min:10',
            title: 'min:3'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const body = req.getBody();
                let blast = await this.BlastRecord?.getBlast({_id: new ObjectId(req.getParams().id)});
                if (blast) {
                    if (typeof body.blast_owner_id != "undefined") {
                        // @ts-ignore
                        blast.blast_owner_id = new ObjectId(body.blast_owner_id);
                    }
                    if (typeof body.text_msg != "undefined") {
                        blast.text_msg = body.text_msg;
                    }
                    if (typeof body.title != "undefined") {
                        blast.title = body.title;
                    }
                    blast.updated_at = new Date().toISOString();

                    await this.BlastRecord?.editBlast({_id: new ObjectId(req.getParams().id)}, blast);
                    req.replyBack(201, {
                        "msg": "blast updated",
                        "data": blast
                    });
                } else {
                    req.replyBack(500, {error: "Cannot get blast details"});
                }
            } catch (err) {
                console.log(err);
                req.replyBack(500, {error: err});
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });
    }

    getGroupMembers = async (group_id: string) => {
        return new Promise((resolve, reject) => {
            let user_ids: Array<any> = []
            this.GroupMemberRecord?.listGroupMember({group_id: new ObjectId(group_id)}).then((members: any) => {
                for (let member of members) {
                    const user_id = member.hcp_user_id;
                    user_ids.push(user_id);
                }
                resolve(user_ids)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    getBulkUserPhones = async (user_ids: any): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            let mobile_mapping: any = {}
            let mobiles_array: Array<any> = []
            let mobile_region: any = {}

            this.HCPRecord?.getHCPs({user_id: {$in: user_ids}}).then((users: any) => {
                for (let user of users) {
                    let contact = user.contact_number.replace(/\s/g, "")
                    mobiles_array.push(contact);
                    mobile_region[contact] = user.address.region
                }
                mobile_mapping["contact_numbers"] = mobiles_array
                mobile_mapping["contact_region_map"] = mobile_region
                resolve(mobile_mapping)
            }).catch((err: any) => {
                reject(err);
            })
        });
    }

    execute = async (req: IRouterRequest) => {
        let rules = {
            id: "required"
        };

        let validation = new Validator(req.getParams(), rules);

        validation.passes(async () => {
            try {
                const blast_id = req.getParams().id;
                let blast = await this.BlastRecord?.getBlast({_id: new ObjectId(blast_id)});

                // schedule all SMS for the people in the current blast
                if (blast && blast.text_msg) {
                    let total_groups = [];
                    let total_user_ids: any[] = [];

                    const groups = await this.BlastGroupRecord?.listBlastGroups({blast_id: new ObjectId(blast_id)});
                    for (const group of groups) {
                        total_groups.push(group.group_id);
                        const members = await this.getGroupMembers(group.group_id);
                        total_user_ids = total_user_ids.concat(members)
                    }
                    const unique_user_ids = removeDuplicates(total_user_ids);
                    const mobile_mappings = await this.getBulkUserPhones(unique_user_ids);
                    // @ts-ignore
                    const unique_mobile_numbers = removeDuplicates(mobile_mappings["contact_numbers"]);
                    // @ts-ignore
                    const region_mappings = mobile_mappings["contact_region_map"]

                    req.replyBack(200, {
                        msg: "SMS blast to people",
                        body: {
                            total_groups,
                            total_user_ids,
                            unique_user_ids,
                            unique_mobile_numbers
                        }
                    });

                    for (const phone of unique_mobile_numbers) {
                        let region = region_mappings[phone]
                        let phoneUsrId = regionalNumbers[region]
                        if (typeof phoneUsrId === "undefined") {
                            phoneUsrId = process.env.MAINLINE_USER_ID
                        }

                        await sendSMS(phoneUsrId, blast.text_msg, phone);
                    }

                } else {
                    req.replyBack(500, {
                        error: "Blast should have a text message"
                    });
                }

            } catch (err) {
                console.log(err);
                req.replyBack(500, {
                    error: err
                });
            }
        });

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

    }

    addGroupToBlast = async (req: IRouterRequest) => {
        let rules = {
            group_id: 'required',
            group_name: 'required',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.fails((errors: any) => {
            req.replyBack(500, {errors: validation.errors.errors})
        });

        validation.passes(async () => {
            try {
                const body = req.getBody();
                const blast_group = {
                    _id: new ObjectId(),
                    blast_id: new ObjectId(req.getParams().id),
                    group_id: new ObjectId(body.group_id),
                    group_name: body.group_name
                }
                const response = await this.BlastGroupRecord?.addGroupToBlast(blast_group);
                req.replyBack(201, {
                    "msg": "new group added to blast",
                    "data": blast_group
                });
            } catch (err) {
                console.log(err);
                req.replyBack(500, {error: err});
            }
        });
    }

    listBlastGroups = async (req: IRouterRequest) => {
        try {
            const response = await this.BlastGroupRecord?.listBlastGroups({blast_id: new ObjectId(req.getParams().id)});
            req.replyBack(201, {
                "msg": "list of groups in blast",
                "data": response
            });

        } catch (err) {
            console.log(err);
            req.replyBack(500, {error: err});
        }
    }

    removeGroupFromBlast = async (req: IRouterRequest) => {
        try {
            let body = req.getBody()
            let filter = {
                blast_id: new ObjectId(req.getParams().id),
                group_id: new ObjectId(body.group_id)
            }
            await this.BlastGroupRecord?.removeGroupFromBlast(filter);
            req.replyBack(200, {
                "msg": "removed group from blast",
            });

        } catch (err) {
            console.log(err);
            req.replyBack(500, {error: err});
        }
    }
}

export {BlastsController};


