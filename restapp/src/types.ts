// file types.ts
import "reflect-metadata";

const TYPES = {
    MongoClient: Symbol.for("MongoClient"),
    IMiddleware: Symbol.for("IMiddleware"),

    IUserRecord: Symbol.for("IUserRecord"),
    ITokenRecord: Symbol.for("ITokenRecord"),
    IResetCodeRecord: Symbol.for("IResetCodeRecord"),
    IVerificationCodeRecord: Symbol.for("IVerificationCodeRecord"),
    IFacilityRecord: Symbol.for("IFacilityRecord"),
    IFacilityMemberRecord: Symbol.for("IFacilityMemberRecord"),
    IHCPRecord: Symbol.for("IHCPRecord"),
    IFacilityShiftRecord: Symbol.for("IFacilityShiftRecord"),
    IHCPEducationRecord: Symbol.for("IHCPEducationRecord"),
    IHCPExperienceRecord: Symbol.for("IHCPExperianceRecord"),
    IHCPReferenceRecord: Symbol.for("IHCPReferenceRecord"),
    IGroupRecord: Symbol.for("IGroupRecord"),
    IGroupMemberRecord: Symbol.for("IGroupMemberRecord"),

    IUserController: Symbol.for("IUserController"),
    IFacilityController: Symbol.for("IFacilityController"),
    IHCPController: Symbol.for("IHCPController"),
    IGroupController: Symbol.for("IGroupController"),
    IMetaController: Symbol.for("IMetaController"),

    IShiftRequirementController: Symbol.for("IShiftRequirementController"),
    IShiftApplicationController: Symbol.for("IShiftApplicationController"),

    IShiftRequirementRecord: Symbol.for("IShiftRequirementRecord"),
    IShiftApplicationRecord: Symbol.for("IShiftApplicationRecord"),

    IShiftController: Symbol.for("IShiftController"),
    IShiftRecord: Symbol.for("IShiftRecord"),

    IBlastController: Symbol.for("IBlastController"),
    IBlastRecord: Symbol.for("IBlastRecord"),
    IBlastGroupRecord: Symbol.for("IBlastGroupRecord"),

    ControllerLogger: Symbol.for("ControllerLogger"),
    initLogger: Symbol.for("initLogger"),

    IProcessController: Symbol.for("IProcessController"),

};

export {TYPES};
