import axios, {AxiosRequestConfig} from "axios";
let https = require('https');

const getOTPCode = async () => {
    return new Promise(async (resolve, reject) => {
        let digits = '0123456789';
        let OTP = '';
        for (let i = 0; i < 4; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        resolve(OTP)

    })
}

const sendSMS = async (phnUserId: any, text: string, recipient: string) => {

    return new Promise(async (resolve, reject) => {
        try {
            let data: any = {
                to_numbers: [recipient],
                user_id: phnUserId,
                text: text
            }
            data = JSON.stringify(data);

            const config: AxiosRequestConfig = {
                method: 'post',
                url: 'https://dialpad.com/api/v2/sms?apikey=' + process.env.DIALPAD_API_KEY,
                headers: {
                    'Content-Type': 'text/plain'
                },
                data: data
            };
            console.log("sms request", config)
            const result = await axios(config);
            resolve(result);
        } catch (e) {
            resolve(e)
        }

    });

}

const sendMail = (ses: any, subject: string, body: string, recipient: string) => {
    return new Promise(async (resolve, reject) => {

        const params = {
            Source: 'it@vitawerks.com',
            Destination: {
                ToAddresses: [recipient]
            },
            Message: {
                Body: {
                    Text: {
                        Data: body
                    }
                },
                Subject: {
                    Data: subject
                }
            }
        }

        try {
            const result = await ses.sendEmail(params).promise();
            resolve(result);
        } catch (error) {
            resolve(error);
        }
    });
}

const sendTemplateMail = (ses: any, subject: string, body: string, recipient: string) => {
    return new Promise(async (resolve, reject) => {

        const params = {
            Source: 'it@vitawerks.com',
            Destination: {
                ToAddresses: [recipient]
            },
            Message: {
                Body: {
                    Html: {
                        Data: body
                    }
                },
                Subject: {
                    Data: subject
                }
            }
        }

        try {
            const result = await ses.sendEmail(params).promise();
            resolve(result);
        } catch (error) {
            resolve(error);
        }
    });
}

const sendPushNotification = async (userId: any, message: string, headings: string) => {

    return new Promise(async (resolve, reject) => {
        try {

            let headers = {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": "Basic " + process.env.ONE_SIGNAL_KEY
            };
            let options = {
                host: "onesignal.com",
                port: 443,
                path: "/api/v1/notifications",
                method: "POST",
                headers: headers
            };

            let payload = {
                app_id: process.env.ONE_SIGNAL_APP_ID,
                contents: {"en": message},
                include_external_user_ids: [userId],
                // large_icon: large_icon,
                // app_url: notification.app_url,
                headings: {en: headings}
            };

            console.log("push notification payload", payload)

            let request = https.request(options, function (response: any) {
                response.on('data', function (data: any) {
                    resolve(data.toString());
                });
            });
            request.on('error', function (e: any) {
                resolve(e);
            });
            request.write(JSON.stringify(payload));
            request.end();

        } catch (e) {
            resolve(e)
        }

    });

}

const removeDuplicates = (inputArray: any[]) => {
    return inputArray.filter((item, index) => {
        return inputArray.indexOf(item) == index;
    });
}

export {getOTPCode, sendSMS, sendMail, sendTemplateMail, sendPushNotification, removeDuplicates}