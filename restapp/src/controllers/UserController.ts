import {inject, injectable} from "inversify";
import "reflect-metadata";
import {TYPES} from "../types";
import {getOTPCode, sendMail, sendSMS, sendTemplateMail} from "../utils/helpers"
import {IUserController} from "./IUserController";
import {IRouterRequest} from "../interfaces/IRouterRequest";
import {IUserRecord} from "../records/IUserRecord";
import {ITokenRecord} from "../records/ITokenRecord";
import {IResetCodeRecord} from "../records/IPasswordResetRecord";
import {IVerificationCodeRecord} from "../records/IVerificationCodeRecord"
import {IHCPRecord} from "../records/IHCPRecord";
import {DateTime, Duration} from "luxon";
import {isBefore} from "date-fns";
import {ObjectId} from 'mongodb'
import bcrypt from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken';

import Validator from "validatorjs";

const AWS = require("aws-sdk");
const ses = new AWS.SES({
    region: "us-east-2"
})

@injectable()
class UserController implements IUserController {
    @inject(TYPES.IUserRecord) UserRecord: IUserRecord | undefined;
    @inject(TYPES.ITokenRecord) TokenRecord: ITokenRecord | undefined;
    @inject(TYPES.IResetCodeRecord) ResetCodeRecord: IResetCodeRecord | undefined
    @inject(TYPES.IVerificationCodeRecord) VerificationCodeRecord: IVerificationCodeRecord | undefined
    @inject(TYPES.IHCPRecord) HCPRecord: IHCPRecord | undefined;
    @inject(TYPES.ControllerLogger) logger: any | undefined;

    list = async (req: IRouterRequest) => {
        const queryArgs = req.getQueryArgs();
        const page = parseInt(queryArgs.page) || 1;
        const limit = parseInt(queryArgs.limit) || 20;
        const role = queryArgs.role;
        const search = queryArgs.search;

        let filter: any = {};
        if (role) {
            filter["role"] = role;
        }
        if (search) {
            filter["$or"] = [
                {first_name: {$regex: search, $options: 'si'}},
                {last_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}}
            ]
        }

        try {
            const users = await this.UserRecord?.paginate(filter, {password: 0}, page, limit, {created_at: -1});
            req.replyBack(200, {"msg": "user list", "data": users});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    getUser = async (req: IRouterRequest) => {

        const params = req.getParams();
        const user_id = params.id;

        try {
            let user = await this.UserRecord?.getUser({_id: new ObjectId(user_id)});
            delete user["password"];
            req.replyBack(200, {"msg": "user data", "data": user});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    addUser = async (req: IRouterRequest): Promise<any> => {

        let rules = {
            first_name: 'required',
            last_name: 'required',
            email: 'email|unique:users,email',
            password: 'required|min:2',
            role: 'in:hcp,hr,nurse_champion,account_manager,super_admin',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {

            try {
                const body = req.getBody();
                const password = bcrypt.hashSync(body.password, 5);
                let user: any = {}
                user = {
                    "first_name": body.first_name,
                    "last_name": body.last_name,
                    "email": body.email,
                    "password": password,
                    "role": body.role,
                    "is_active": true,
                    "created_at": new Date(),
                    "updated_at": new Date()
                }

                await this.UserRecord?.addUser(user);
                delete user["password"];


                req.replyBack(200, {
                    msg: "User Registered",
                    data: user
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

    login = async (req: IRouterRequest): Promise<any> => {

        const JWT_SECRET = process.env.JWT_SECRET || "default";

        let rules = {
            password: 'required|min:2',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.fails((errors: any) => {
            return req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {

            try {
                const body = req.getBody();
                const user = await this.UserRecord?.getUser({email: {$regex: new RegExp(body.email, "i")}});

                if (!user) {
                    return req.replyBack(400, {
                        "success": false,
                        errors: {
                            "email": [
                                "The email does not exist in table"
                            ]
                        }
                    })
                }

                if (bcrypt.compareSync(body.password, user.password)) {

                    if (user.role === "hcp") {
                        if (user.is_new_user) {
                            user.is_new_user = false
                            await this.UserRecord?.editUser({_id: new ObjectId(user._id)}, user);
                            user["is_first_login"] = true
                        } else {
                            user["is_first_login"] = false
                        }
                        let hcp = await this.HCPRecord?.getHCP({user_id: new ObjectId(user._id)})
                        user.hcp_id = hcp._id
                    }
                    delete user.password

                    let token = jsonwebtoken.sign(user, JWT_SECRET, {
                        // expiresIn: "365 days"
                    });

                    let tokenObj = {
                        user_id: user._id,
                        token,
                        is_active: true,
                        created_at: new Date(),
                        updated_at: new Date()
                    }

                    await this.TokenRecord?.addToken(tokenObj);

                    return req.replyBack(200, {
                        msg: 'Login successful',
                        data: {
                            token,
                            user: user
                        }
                    });

                } else {
                    return req.replyBack(403, {error: "Invalid login credentials"});
                }

            } catch (err) {
                console.log("err", err);
                return req.replyBack(500, {error: err});
            }
        });

    }

    checkLogin = async (req: IRouterRequest) => {

        const JWT_SECRET = process.env.JWT_SECRET || "default";

        try {
            const headers = req.getHeaders();
            const authHeader = headers["authorization"];

            if (!authHeader) {
                req.replyBack(403, {
                    error: "User not logged in"
                });
            } else if (authHeader == "") {
                req.replyBack(403, {
                    error: "User not logged in"
                });
            } else {
                const bearer_bits = authHeader.split(' ');
                if (bearer_bits.length <= 1) {
                    req.replyBack(403, {
                        error: "Invalid Token"
                    });
                } else {
                    let token = bearer_bits[1];
                    const jsonPayload = jsonwebtoken.verify(token, JWT_SECRET);
                    if (jsonPayload) {
                        // @ts-ignore
                        const user = await this.UserRecord?.getUser({_id: new ObjectId(jsonPayload._id)});

                        const tokenData = await this.TokenRecord?.getToken({
                            token,
                            is_active: true,
                            user_id: new ObjectId(user._id)
                        })
                        if (tokenData == null) {
                            return req.replyBack(403, {error: "User not logged in"});
                        }

                        if (user) {
                            delete user.password
                            return req.replyBack(200, {msg: 'user is logged in', data: {"user": user}});
                        } else {
                            return req.replyBack(403, {error: "User not logged in"});
                        }

                    } else {
                        return req.replyBack(403, {error: "Not logged in"});
                    }

                }

            }


        } catch (err) {
            console.log("err", err);
            req.replyBack(500, {error: "User not logged in"});
        }

    }

    logout = async (req: IRouterRequest) => {

        const JWT_SECRET = process.env.JWT_SECRET || "default";

        try {
            const headers = req.getHeaders();
            const authHeader = headers["authorization"];

            if (!authHeader) {
                req.replyBack(403, {
                    error: "User not logged in"
                });
            } else if (authHeader == "") {
                req.replyBack(403, {
                    error: "User not logged in"
                });
            } else {
                const bearer_bits = authHeader.split(' ');
                if (bearer_bits.length <= 1) {
                    req.replyBack(403, {
                        error: "Invalid Token"
                    });
                } else {
                    let token = bearer_bits[1];
                    const jsonPayload = jsonwebtoken.verify(token, JWT_SECRET);
                    if (jsonPayload) {
                        // @ts-ignore
                        let user_id = new ObjectId(jsonPayload._id)
                        await this.TokenRecord?.deleteToken({
                            token,
                            is_active: true,
                            user_id
                        })

                        req.replyBack(200, {"msg": "Logout successful"});
                    } else {
                        return req.replyBack(403, {error: "Not logged in"});
                    }

                }

            }


        } catch (err) {
            req.replyBack(500, {error: "User not logged in"});
        }

    }

    forgotPassword = async (req: IRouterRequest): Promise<any> => {
        let rules = {
            email: 'required|email|exists:users,email',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.fails((errors: any) => {
            console.log("fails ... ", errors)
            return req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                const body = req.getBody();
                const user = await this.UserRecord?.getUser({email: body.email});

                const code = await getOTPCode();
                let time_limit = DateTime.utc().plus(Duration.fromMillis(10 * 60 * 1000));

                let password_reset = {
                    "user_id": user._id,
                    "code": code,
                    "code_expires_at": time_limit,
                    "is_active": true,
                    "created_at": new Date(),
                    "updated_at": new Date()
                }
                const cleaned_phone_number = user.contact_number.replace(/\s/g, "");

                await this.ResetCodeRecord?.addResetCode(password_reset);

                let emailStatus: any = 200, smsStatus: any = 200
                let message = code + " is your OTP to reset the password. DO NOT SHARE OTP WITH ANYONE, Vitawerks."
                let email = await sendMail(ses, "Password Reset", message, user.email);
                console.log("email result =======>", user.email, email)
                // @ts-ignore
                if (typeof email["statusCode"] != "undefined") {
                    // @ts-ignore
                    emailStatus = email["statusCode"]
                }

                let sms = await sendSMS(process.env.MAINLINE_USER_ID, message, cleaned_phone_number)
                // @ts-ignore
                if (typeof sms["response"] != "undefined") {
                    // @ts-ignore
                    if (typeof sms["response"]["status"] != "undefined") {
                        // @ts-ignore
                        smsStatus = sms["response"]["status"]
                    }
                }

                console.log("email and sms status in forgorPassword", emailStatus, smsStatus)

                if (emailStatus == 400 && smsStatus == 400) {
                    return req.replyBack(500, {
                        msg: "unable to send password reset code to either mobile or email",
                    });
                }

                return req.replyBack(200, {
                    msg: "password reset code has been sent to your registered mobile and email",
                });

            } catch (err) {
                console.log("error in forgor password", err)
                return req.replyBack(500, {
                    error: err
                });
            }
        });

    }

    resetPassword = async (req: IRouterRequest): Promise<any> => {
        let rules = {
            email: 'required|email|exists:users,email',
            code: 'required',
            password: 'required|min:2'
        };

        let validation = new Validator(req.getBody(), rules);

        validation.passes(async () => {
            try {
                const body = req.getBody();
                const user = await this.UserRecord?.getUser({email: body.email});

                const latestCode = await this.ResetCodeRecord?.getResetCode({user_id: user._id, is_active: true});
                if (latestCode.length > 0) {
                    const resetCode = latestCode[0]
                    if (resetCode.code == body.code) {
                        if (isBefore(new Date(), resetCode.code_expires_at)) {
                            user.password = bcrypt.hashSync(body.password, 5)
                            await this.UserRecord?.editUser({_id: user._id}, user);
                            resetCode.code_used_at = new Date()
                            resetCode.is_active = false
                            await this.ResetCodeRecord?.editResetCode({_id: resetCode._id}, resetCode)
                            return req.replyBack(200, {
                                http_code: 200,
                                msg: 'password reset successful'
                            })
                        } else {
                            return req.replyBack(500, {
                                error: 'entered code has already expired. please request new code'
                            })
                        }
                    } else {
                        return req.replyBack(500, {
                            error: "Entered OTP is invalid"
                        });
                    }
                } else {
                    return req.replyBack(500, {
                        error: "Unable to get OTP"
                    });
                }

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

    listLite = async (req: IRouterRequest) => {
        const queryArgs = req.getQueryArgs();
        const role = queryArgs.role;
        const search = queryArgs.search;

        let filter: any = {};
        if (role) {
            filter["role"] = role;
        }
        if (search) {
            filter["$or"] = [
                {first_name: {$regex: search, $options: 'si'}},
                {last_name: {$regex: search, $options: 'si'}},
                {email: {$regex: search, $options: 'si'}}
            ]
        }

        try {
            const users = await this.UserRecord?.getUsers(filter);
            req.replyBack(200, {"msg": "user list", "data": users});
        } catch (err) {
            console.log(err, "error");
            req.replyBack(500, {error: err});
        }
    }

    sendOTP = async (req: IRouterRequest): Promise<any> => {
        let rules = {
            contact_number: 'required|min:8',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.fails((errors: any) => {
            return req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                const body = req.getBody();
                const code = await getOTPCode();
                let time_limit = DateTime.utc().plus(Duration.fromMillis(10 * 60 * 1000));

                let verificationCode = {
                    "contact_number": body.contact_number,
                    "code": code,
                    "code_expires_at": time_limit,
                    "is_active": true,
                    "created_at": new Date(),
                    "updated_at": new Date()
                }
                await this.VerificationCodeRecord?.addVerificationCode(verificationCode);

                let smsStatus: any = 200
                let message = "Hi, \nYour verification code is " + code + ". \nEnter this code in the Vitawerks app to register your customer account. \nIf you have any questions, send us an email account9@vitawerks.com. \nWe are glad you are here! \n\nThe Vitawerks team"
                const cleaned_phone_number = body.contact_number.replace(/\s/g, "");
                let sms = await sendSMS(process.env.MAINLINE_USER_ID, message, cleaned_phone_number)
                // @ts-ignore
                if (typeof sms["response"] != "undefined") {
                    // @ts-ignore
                    if (typeof sms["response"]["status"] != "undefined") {
                        // @ts-ignore
                        smsStatus = sms["response"]["status"]
                    }
                }

                console.log("sms status in signup verification", smsStatus)
                if (smsStatus == 400) {
                    return req.replyBack(500, {
                        msg: "unable to send password reset code to either mobile or email",
                    });
                }
                return req.replyBack(200, {
                    msg: "verification code has been sent to your phone",
                });

            } catch (err) {
                return req.replyBack(500, {
                    error: err
                });
            }
        });

    }

    otpVerification = async (req: IRouterRequest): Promise<any> => {
        let rules = {
            contact_number: 'required|min:8',
            code: 'required',
        };

        let validation = new Validator(req.getBody(), rules);

        validation.fails((errors: any) => {
            req.replyBack(400, {
                "success": false,
                errors: validation.errors.errors
            })
        });

        validation.passes(async () => {
            try {
                const body = req.getBody();
                const latestCode = await this.VerificationCodeRecord?.getVerificationCode({
                    contact_number: body.contact_number,
                    is_active: true
                });

                if (latestCode.length > 0) {
                    const verificationCode = latestCode[0]
                    if (verificationCode.code == body.code) {
                        if (isBefore(new Date(), verificationCode.code_expires_at)) {
                            verificationCode.code_used_at = new Date()
                            verificationCode.is_active = false

                            let data: any = {
                                is_signup_initiated: false
                            }
                            let hcp = await this.HCPRecord?.getHCP({email: {$regex: new RegExp(body.email, "i")}})
                            if (hcp) {
                                data["is_signup_initiated"] = true
                                data["hcp_id"] = hcp._id
                            }
                            await this.VerificationCodeRecord?.editVerificationCode({_id: verificationCode._id}, verificationCode)
                            return req.replyBack(200, {
                                http_code: 200,
                                msg: 'phone verification successful',
                                data
                            })
                        } else {
                            return req.replyBack(500, {
                                error: 'entered code has already expired. please request new code'
                            })
                        }
                    } else {
                        return req.replyBack(500, {
                            error: "Entered OTP is invalid"
                        });
                    }
                } else {
                    return req.replyBack(500, {
                        error: "Unable to get OTP"
                    });
                }

            } catch (err) {
                req.replyBack(500, {
                    error: err
                });
            }
        });

    }

}

export {UserController};


