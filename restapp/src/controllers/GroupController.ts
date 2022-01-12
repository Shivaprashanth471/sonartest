import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {IGroupController} from "./IGroupController";
import {IRouterRequest} from "../interfaces/IRouterRequest";

import Validator from "validatorjs";

import {GroupRecord} from "../records/GroupRecord";
import {IGroupMemberRecord} from "../records/IGroupMemberRecord";
import {ObjectId} from "mongodb";

@injectable()
class GroupController implements IGroupController {
    @inject(TYPES.IGroupRecord) GroupRecord: GroupRecord | undefined;
    @inject(TYPES.IGroupMemberRecord) GroupMemberRecord: IGroupMemberRecord | undefined;

    addGroup = (req: IRouterRequest): void => {

        let rules = {
            title: 'required'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

            try {
                const body = req.getBody();

                const group = {
                    "title": body.title,
                    "members_count": 0,
                    "created_at": new Date(),
                    "updated_at": new Date()
                }

                await this.GroupRecord?.addGroup(group);

                req.replyBack(200, {
                    msg: "Group Registered",
                    data: group
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

    listGroup = async (req: IRouterRequest): Promise<void> => {
        const queryArgs = req.getQueryArgs();
        const page = parseInt(queryArgs.page) || 1;
        const limit = parseInt(queryArgs.limit) || 20;
        const search = queryArgs.search;

        let filter: any = {};
        if (search) {
            filter["$or"] = [
                {title: {$regex: search, $options: 'si'}},
            ]
        }

        try {
            const groups = await this.GroupRecord?.paginate(filter, {}, page, limit, {created_at: -1});
            req.replyBack(200, {"msg": "group list", "data": groups});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    deleteGroup = async (req: IRouterRequest): Promise<void> => {
        const params = req.getParams();
        const facility_id = params.id;

        try {
            await this.GroupRecord?.deleteGroup({_id: new ObjectId(facility_id)});
            req.replyBack(200, {"msg": "group deleted"});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    editGroup = (req: IRouterRequest): void => {
        const params = req.getParams();
        const group_id = params.id;
        let body = req.getBody();
        body["group_id"] = group_id;

        let rules = {
            group_id: "required|exists:groups,_id",
            title: 'required'
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {

            try {
                const group = await this.GroupRecord?.getGroup({_id: new ObjectId(group_id)});
                const body: any = req.getBody();

                if (body.title) {
                    group.title = body.title;
                }

                group.updated_at = new Date()

                await this.GroupRecord?.editGroup({_id: new ObjectId(group_id)}, group);

                req.replyBack(200, {msg: 'group details updated', data: group});

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

    getGroup = async (req: IRouterRequest) => {

        const params = req.getParams();
        const group_id = params.id;
        let body = req.getBody();
        body["group_id"] = group_id;

        let rules = {
            group_id: "required|exists:groups,_id",
        };

        let validation = new Validator(body, rules);

        validation.passes(async () => {
            try {
                let group = await this.GroupRecord?.getGroup({_id: new ObjectId(group_id)});
                req.replyBack(200, {"msg": "group data", "data": group});
            } catch (err) {
                console.log(err, "error");
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

    getGroupMembers = async (req: IRouterRequest): Promise<void> => {
        const params = req.getParams();

        const filter: any = {
            group_id: new ObjectId(params.id)
        }

        try {
            const users = await this.GroupMemberRecord?.listGroupMember(filter);
            req.replyBack(200, {"msg": "group members list", "data": users});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    addGroupMember = (req: IRouterRequest): void => {

        const params = req.getParams();
        const group_id = params.id;
        const body = req.getBody();
        body["group_id"] = group_id;

        let rules = {
            group_id: 'required|exists:groups,_id',
            hcp_user_id: 'required',
            hcp_name: 'required',
            hcp_type: 'required'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

            try {
                const member = {
                    "group_id": new ObjectId(group_id),
                    "hcp_user_id": new ObjectId(body.hcp_user_id),
                    "hcp_name": body.hcp_name,
                    "hcp_type": body.hcp_type,
                    "created_at": new Date(),
                    "updated_at": new Date()
                }

                await this.GroupMemberRecord?.addGroupMember(member);
                // await this.GroupRecord?.addFacilityMember(member);

                await this.updateGroupCount(group_id);

                req.replyBack(200, {
                    msg: "Group member added",
                    data: member
                });

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

    updateGroupCount = async (group_id: string) => {
        return new Promise(async (resolve, reject) => {
            let group = await this.GroupRecord?.getGroup({_id: new ObjectId(group_id)});
            const group_members = await this.GroupMemberRecord?.listGroupMember({group_id: new ObjectId(group_id)});
            group.members_count = group_members.length;

            await this.GroupRecord?.editGroup({_id: new ObjectId(group_id)}, group);
            resolve({});
        });
    }

    deleteGroupMember = async (req: IRouterRequest): Promise<void> => {
        const params = req.getParams();
        const group_id = params.id;
        const member_id = params.member_id;
        let body = req.getBody();
        body["group_id"] = group_id;
        body["member_id"] = member_id;

        let rules = {
            "group_id": "required|exists:groups,_id",
            "member_id": "required|exists:group_members,_id",
        };

        let validation = new Validator(body, rules);

        validation.fails((errors: any) => {
            console.log("fails ... ")
            return req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                await this.GroupMemberRecord?.deleteGroupMember({_id: new ObjectId(member_id)});
                await this.updateGroupCount(group_id);

                return req.replyBack(200, {
                    msg: 'group member record deleted'
                });
            } catch (err: any) {
                console.log("err", err);
                return req.replyBack(500, {
                    msg: 'group member cannot be deleted',
                    error: err.toString()
                });
            }
        });


    }


}

export {GroupController};


