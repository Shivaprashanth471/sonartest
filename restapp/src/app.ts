import express from 'express';
import "reflect-metadata";

process.env.TZ = "Asia/Kolkata";

const bodyParser = require('body-parser');

const cors = require('cors');
const serverless = require('serverless-http');
import {createContainer} from "./dependencies";
import {TYPES} from "./types";

import {wrapExpressRequest} from "../infrastructures/ExpressRouterRequest";
import {Middleware} from "./Middleware";
import {IMiddleware} from "./IMiddleware";

import {IUserController} from "./controllers/IUserController";
import {IFacilityController} from "./controllers/IFacilityController";
import {IShiftRequirementController} from "./controllers/IShiftRequirementController";
import {IShiftApplicationController} from "./controllers/IShiftApplicationController";
import {IShiftController} from "./controllers/IShiftController";
import {IHCPController} from "./controllers/IHCPController";
import {IGroupController} from "./controllers/IGroupController";
import {IMetaController} from "./controllers/IMetaController";
import {IBlastsController} from "./controllers/IBlastsController";

import {IProcessController} from "./controllers/IProcessController"
import {Container} from 'inversify';

 kqbk    bffkbwebjwefj   ekfbkje
kjbjbefb    f kbjdbq    
queueMicrotaskejf


let path = require('path');
let cron = require('node-cron')
var axios = require('axiossssssss');

const app = express();
app.use(bodyParser.json());
app.use(cors()

// app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
// app.get('/download/:name', function (req, res) {
//     const file = "src/downloads/" + req.params.name;
//     res.download(file, req.params.name); // Set disposition and send it.
// });

export var container: Container
const registerEndpoints = () => {
    return new Promise(async (resolve, reject) => {

        container = await createContainer();
        const middleware = container.get<IMiddleware>(TYPES.IMiddleware);

        const userController = container.get<IUserController>(TYPES.IUserController);
        const blastsController = container.get<IBlastsController>(TYPES.IBlastController);
        const facilityController = container.get<IFacilityController>(TYPES.IFacilityController);
        const shiftRequirementController = container.get<IShiftRequirementController>(TYPES.IShiftRequirementController);
        const shiftApplicationController = container.get<IShiftApplicationController>(TYPES.IShiftApplicationController);
        const shiftController = container.get<IShiftController>(TYPES.IShiftController);
        const hcpController = container.get<IHCPController>(TYPES.IHCPController);
        const groupController = container.get<IGroupController>(TYPES.IGroupController);
        const metaController = container.get<IMetaController>(TYPES.IMetaController);
        const processController = container.get<IProcessController>(TYPES.IProcessController);

        app.post('/user/login', wrapExpressRequest(userController.login));
        app.get('/user/checkLogin', wrapExpressRequest(userController.checkLogin));
        app.get('/user/logout', wrapExpressRequest(userController.logout));
        app.post('/forgotPassword', wrapExpressRequest(userController.forgotPassword));
        app.post('/resetPassword', wrapExpressRequest(userController.resetPassword));
        app.post('/sendOTP', wrapExpressRequest(userController.sendOTP));
        app.post('/otpVerification', wrapExpressRequest(userController.otpVerification));

        app.get('/shiftReminder', wrapExpressRequest(processController.shiftReminder));
        app.get('/unfilledRequirements', wrapExpressRequest(processController.unfilledRequirements));

        //signup flow
        app.post('/hcp/signup', wrapExpressRequest(hcpController.signUP));
        app.get('/hcp/:id', wrapExpressRequest(hcpController.getHCP));
        app.put('/hcp/:id', wrapExpressRequest(hcpController.editHCP));
        app.post('/hcp/:id/attachment', wrapExpressRequest(hcpController.addHCPAttachment));
        app.get('/hcp/:id/attachments', wrapExpressRequest(hcpController.listHCPAttachment));
        app.delete('/hcp/:id/attachment', wrapExpressRequest(hcpController.removeHCPAttachment));

        app.use(wrapExpressRequest(middleware.ParseJWToken))

        app.get('/app/blast', wrapExpressRequest(blastsController.listBlasts));
        app.post('/app/blast', wrapExpressRequest(blastsController.addBlast));
        app.put('/app/blast/:id', wrapExpressRequest(blastsController.editBlast));
        app.post('/app/blast/:id/execute', wrapExpressRequest(blastsController.execute));

        app.post('/app/blast/:id/group', wrapExpressRequest(blastsController.addGroupToBlast));
        app.get('/app/blast/:id/group', wrapExpressRequest(blastsController.listBlastGroups));
        app.delete('/app/blast/:id/group', wrapExpressRequest(blastsController.removeGroupFromBlast));

        app.post('/user', wrapExpressRequest(userController.addUser));
        app.get('/user', wrapExpressRequest(userController.list));
        app.get('/user/lite', wrapExpressRequest(userController.listLite));

        app.get('/user/:id', wrapExpressRequest(userController.getUser));

        app.post('/facility', wrapExpressRequest(facilityController.addFacility));
        app.post('/facility/list', wrapExpressRequest(facilityController.list));
        app.post('/facility/mobileList', wrapExpressRequest(facilityController.facilityDistanceList));
        app.post('/facility/mapList', wrapExpressRequest(facilityController.mapBasedList));
        app.post('/facility/lite', wrapExpressRequest(facilityController.listLite));
        app.get('/facility/:id', wrapExpressRequest(facilityController.getFacility));
        app.put('/facility/:id', wrapExpressRequest(facilityController.editFacility));
        app.post('/facility/:id/profile', wrapExpressRequest(facilityController.uploadProfile));
        app.delete('/facility/:id/profile', wrapExpressRequest(facilityController.deleteProfile));

        app.post('/facility/:id/member', wrapExpressRequest(facilityController.addFacilityMember));
        app.get('/facility/:id/member', wrapExpressRequest(facilityController.getFacilityMembers));
        app.delete('/facility/:id/member/:member_id', wrapExpressRequest(facilityController.deleteFacilityMember));

        app.post('/facility/:id/shift', wrapExpressRequest(facilityController.addFacilityShift));
        app.get('/facility/:id/shift', wrapExpressRequest(facilityController.getFacilityShifts));
        app.delete('/facility/:id/shift/:shift_id', wrapExpressRequest(facilityController.deleteFacilityShift));

        app.post('/shift/requirement/list', wrapExpressRequest(shiftRequirementController.list));
        app.post('/shift/requirement', wrapExpressRequest(shiftRequirementController.add));
        app.get('/shift/requirement/:id', wrapExpressRequest(shiftRequirementController.view));
        app.patch('/shift/requirement/:id/cancel', wrapExpressRequest(shiftRequirementController.cancel));

        app.get('/shift/application', wrapExpressRequest(shiftApplicationController.listAllApplications));
        app.post('/shift/requirement/:id/application', wrapExpressRequest(shiftApplicationController.newApplication));
        app.get('/shift/requirement/:id/application', wrapExpressRequest(shiftApplicationController.listApplications));
        app.get('/shift/hcp/:id/application', wrapExpressRequest(shiftApplicationController.listHCPApplications));

        app.patch('/shift/requirement/:id/application/:a_id/approve', wrapExpressRequest(shiftApplicationController.approveApplication));
        app.patch('/shift/requirement/:id/application/:a_id/reject', wrapExpressRequest(shiftApplicationController.rejectApplication));

        app.get('/shift/requirement/:id/shift', wrapExpressRequest(shiftController.listRequirementShifts));
        app.post('/shift/hcp/:id/shift', wrapExpressRequest(shiftController.listHCPShifts))
        app.get('/shift/stats', wrapExpressRequest(shiftController.statusStats));
        app.post('/shift/download', wrapExpressRequest(shiftController.downloadShifts));
        app.get('/shift/:id', wrapExpressRequest(shiftController.viewShift));

        app.post('/shift/:id/checkIn', wrapExpressRequest(shiftController.checkIn));
        app.post('/shift/:id/checkOut', wrapExpressRequest(shiftController.checkOut));
        app.post('/shift/:id/breakIn', wrapExpressRequest(shiftController.breakIn));
        app.post('/shift/:id/breakOut', wrapExpressRequest(shiftController.breakOut));
        app.patch('/shift/:id/cancel', wrapExpressRequest(shiftController.cancel));
        app.patch('/shift/:id/closed', wrapExpressRequest(shiftController.closed));

        app.post('/shift/:id/webCheckInOut', wrapExpressRequest(shiftController.webCheckInOut));
        app.post('/shift/:id/webBreak', wrapExpressRequest(shiftController.webBreak));
        app.put('/shift/:id/webCheckInOut', wrapExpressRequest(shiftController.editWebCheckInOut));

        app.post('/shift/requirement/:id/shift', wrapExpressRequest(shiftController.add));

        app.post('/shift', wrapExpressRequest(shiftController.listAllShifts));
        app.post('/shift/:id/attachment', wrapExpressRequest(shiftController.uploadAttachment));
        app.get('/shift/:id/attachments', wrapExpressRequest(shiftController.listAttachments));
        app.delete('/shift/:id/attachment', wrapExpressRequest(shiftController.deleteAttachment));

        app.post('/hcp', wrapExpressRequest(hcpController.addHCP));
        app.post('/hcp/list', wrapExpressRequest(hcpController.listHCP));
        app.get('/hcp/lite', wrapExpressRequest(hcpController.listLiteHCP));
        app.get('/hcp/:id/profile', wrapExpressRequest(hcpController.getHCProfile));
        app.put('/hcp/:id/profile', wrapExpressRequest(hcpController.editHCPProfile));
        app.patch('/hcp/:id/approve', wrapExpressRequest(hcpController.approveHCP));
        app.patch('/hcp/:id/reject', wrapExpressRequest(hcpController.rejectHCP));
        app.get('/hcp/user/:id', wrapExpressRequest(hcpController.getHCPByUserID));

        app.post('/hcp/:id/education', wrapExpressRequest(hcpController.addHCPEducation));
        app.get('/hcp/:id/education', wrapExpressRequest(hcpController.listHCPEducation));
        app.delete('/hcp/:id/education/:education_id', wrapExpressRequest(hcpController.removeHCPEducation));

        app.post('/hcp/:id/experience', wrapExpressRequest(hcpController.addHCPExperiance));
        app.get('/hcp/:id/experience', wrapExpressRequest(hcpController.listHCPExperiance));
        app.delete('/hcp/:id/experience/:experience_id', wrapExpressRequest(hcpController.removeHCPExperiance));

        app.post('/hcp/:id/reference', wrapExpressRequest(hcpController.addHCPReference));
        app.get('/hcp/:id/reference', wrapExpressRequest(hcpController.listHCPReference));
        app.delete('/hcp/:id/reference/:reference_id', wrapExpressRequest(hcpController.removeHCPReference));

        app.post('/hcp/:id/contract', wrapExpressRequest(hcpController.addHCPContract));
        app.get('/hcp/:id/contract', wrapExpressRequest(hcpController.getHCPContract));
        app.delete('/hcp/:id/contract', wrapExpressRequest(hcpController.removeHCPContract));

        app.post('/group', wrapExpressRequest(groupController.addGroup));
        app.get('/group', wrapExpressRequest(groupController.listGroup));
        app.get('/group/:id', wrapExpressRequest(groupController.getGroup));
        app.put('/group/:id', wrapExpressRequest(groupController.editGroup));
        app.delete('/group/:id', wrapExpressRequest(groupController.deleteGroup));

        app.post('/group/:id/member', wrapExpressRequest(groupController.addGroupMember));
        app.get('/group/:id/member', wrapExpressRequest(groupController.getGroupMembers));
        app.delete('/group/:id/member/:member_id', wrapExpressRequest(groupController.deleteGroupMember));

        app.get('/meta/hcp-specialities', wrapExpressRequest(metaController.hcpSpecialities));
        app.get('/meta/hcp-regions', wrapExpressRequest(metaController.hcpRegions));
        app.get('/meta/hcp-attachment-types', wrapExpressRequest(metaController.hcpAttachmentTypes));
        app.get('/meta/hcp-types', wrapExpressRequest(metaController.hcpTypes));

        resolve({});
    });
}

if (process.env.RUN_LOCAL) {
    const port = 3000;
    registerEndpoints().then(() => {
        app.listen(port, () => {
            console.log(`App running on port ${port}.`);
        });
    }).catch((err) => {
        console.log("err", err);
    })

} else {
    module.exports.handler = async (event: any, context: any) => {
        await registerEndpoints();
        const handler = serverless(app);
        const result = await handler(event, context);
        return result;
    };
}

cron.schedule('0 0 0 * * *', async () => {
    try {
        console.log("########## RUNNING CRON JOB ##########")

        await axios({
            method: 'get',
            url: process.env.API_URL + 'shiftReminder',
            headers: {}
        })

        await axios({
            method: 'get',
            url: process.env.API_URL + 'unfilledRequirements',
            headers: {}
        })

    } catch (e) {
        console.log("error in cron", e)
    }

})


