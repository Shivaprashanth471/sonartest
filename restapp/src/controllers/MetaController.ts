import {inject, injectable} from "inversify";
import "reflect-metadata";
import {IMetaController} from "./IMetaController";
import {IRouterRequest} from "../interfaces/IRouterRequest";


@injectable()
class MetaController implements IMetaController {
    hcpAttachmentTypes(req: IRouterRequest): void {
        req.replyBack(200, {
            data: [
                {
                    "code": "Chest X-Ray",
                    "name": "Chest X-Ray"
                }, {
                    "code": "SSN Card",
                    "name": "SSN Card"
                }, {
                    "code": "Driver License",
                    "name": "Driver License"
                }]
        })
    }

    hcpRegions(req: IRouterRequest): void {
        req.replyBack(200, {
            data: [
                {
                    "code": "Sacramento",
                    "name": "Sacramento"
                }, {
                    "code": "San Francisco",
                    "name": "San Francisco"
                }, {
                    "code": "Santa Cruz",
                    "name": "Santa Cruz"
                }, {
                    "code": "San Diego",
                    "name": "San Diego"
                }, {
                    "code": "Orange County",
                    "name": "Orange County"
                }, {
                    "code": "Palm Springs",
                    "name": "Palm Springs"
                }, {
                    "code": "Los Angeles",
                    "name": "Los Angeles"
                }]
        });
    }

    hcpSpecialities(req: IRouterRequest): void {

        const specialities: { [name: string]: any } = {
            "CNA": [
                {
                    "code": "Acute Care(Hospital)",
                    "name": "Acute Care(Hospital)"
                },
                {
                    "code": "Skilled Nursing/Assisted Living",
                    "name": "Skilled Nursing/Assisted Living"
                },
                {
                    "code": "Behavioural health",
                    "name": "Behavioural health"
                },
                {
                    "code": "Home Health",
                    "name": "Home Health"
                },
                {
                    "code": "None",
                    "name": "None"
                },
            ],
            "LVN": [
                {
                    "code": "Acute Care(Hospital)",
                    "name": "Acute Care(Hospital)"
                },
                {
                    "code": "Skilled Nursing/Assisted Living",
                    "name": "Skilled Nursing/Assisted Living"
                },
                {
                    "code": "Behavioural health",
                    "name": "Behavioural health"
                },
                {
                    "code": "Home Health",
                    "name": "Home Health"
                },
                {
                    "code": "Sub Acute",
                    "name": "Sub Acute"
                },
                {
                    "code": "Long Term Acute Care",
                    "name": "Long Term Acute Care"
                },
                {
                    "code": "None",
                    "name": "None"
                },
            ],
            "RN": [
                {
                    "code": "Cardiovascular intensive Care RN (cvicu-rn)",
                    "name": "Cardiovascular intensive Care RN (cvicu-rn)"
                },
                {
                    "code": "Catheterization Laboratory (Cath Lab)",
                    "name": "Catheterization Laboratory (Cath Lab)"
                },
                {
                    "code": "Emergency Department (ED/ER)",
                    "name": "Emergency Department (ED/ER)"
                },
                {
                    "code": "Intensive Care Unit (ICU)",
                    "name": "Intensive Care Unit (ICU)"
                },
                {
                    "code": "IP Behavioral Health RN",
                    "name": "IP Behavioral Health RN",
                },
                {
                    "code": "IP Conscious Sedation",
                    "name": "IP Conscious Sedation"
                },
                {
                    "code": "IP Dialysis RN",
                    "name": "IP Dialysis RN"
                },
                {
                    "code": "IP Interventional Radiology RN",
                    "name": "IP Interventional Radiology RN"
                },
                {
                    "code": "IP Operating Room Circulator",
                    "name": "IP Operating Room Circulator"
                },
                {
                    "code": "IP Post-Anesthesia Care Unit (PACU)",
                    "name": "IP Post-Anesthesia Care Unit (PACU)"
                },
                {
                    "code": "IP Pre-Operative(Pre-Op)",
                    "name": "IP Pre-Operative(Pre-Op)"
                },
                {
                    "code": "Labor and Delivery (L&D)",
                    "name": "Labor and Delivery (L&D)"
                },
                {
                    "code": "Long Term Acute Care(LTACH)",
                    "name": "Long Term Acute Care(LTACH)"
                },
                {
                    "code": "Medical Intensice Care Unit RN (micu-rn)",
                    "name": "Medical Intensice Care Unit RN (micu-rn)"
                },
                {
                    "code": "Medical-Surgical(Med-Surg)",
                    "name": "Medical-Surgical(Med-Surg)"
                },
                {
                    "code": "Neonatal Intensive Care Unit (NICU)",
                    "name": "Neonatal Intensive Care Unit (NICU)"
                },
                {
                    "code": "Neuro Intensive Care Unit RN(neuro-icu-rn)",
                    "name": "Neuro Intensive Care Unit RN(neuro-icu-rn)"
                },
                {
                    "code": "Nursery RN",
                    "name": "Nursery RN"
                },
                {
                    "code": "Occ Helath RN",
                    "name": "Occ Helath RN"
                },
                {
                    "code": "OP Behavioural Health RN",
                    "name": "OP Behavioural Health RN"
                },
                {
                    "code": "OP Conscious Sedation",
                    "name": "OP Conscious Sedation"
                },
                {
                    "code": "OP Dialysis RN",
                    "name": "OP Dialysis RN"
                },
                {
                    "code": "OP Interventional Radiology RN",
                    "name": "OP Interventional Radiology RN"
                },
                {
                    "code": "OP Operating Room Circulator",
                    "name": "OP Operating Room Circulator"
                },
                {
                    "code": "OP Post-Anesthesia Care Unit (PACU)",
                    "name": "OP Post-Anesthesia Care Unit (PACU)"
                },
                {
                    "code": "OP Pre-Operative(Pre-op)",
                    "name": "OP Pre-Operative(Pre-op)"
                },

                {
                    "code": "Pediatric Intensive Care Unit(PICU)",
                    "name": "Pediatric Intensive Care Unit(PICU)"
                },
                {
                    "code": "Pediatric(Peds)",
                    "name": "Pediatric(Peds)"
                },
                {
                    "code": "Rehabilitation",
                    "name": "Rehabilitation"
                },
                {
                    "code": "Skilled Nursing",
                    "name": "Skilled Nursing"
                },
                {
                    "code": "Stepdown Unit(SDU)",
                    "name": "Stepdown Unit(SDU)"
                },

                {
                    "code": "Surgical Intensive Care Unit RN(sicu-rn)",
                    "name": "Surgical Intensive Care Unit RN(sicu-rn)"
                },
                {
                    "code": "Telemetry (Tele)",
                    "name": "Telemetry (Tele)"
                },
                {
                    "code": "Transplant ICU RN(transplant-icu)",
                    "name": "Transplant ICU RN(transplant-icu)"
                },
                {
                    "code": "Trauma Intensive Care Unit RN(ticu-rn)",
                    "name": "Trauma Intensive Care Unit RN(ticu-rn)"
                },
                {
                    "code": "None",
                    "name": "None"
                }
            ],
            "MedTech": [{
                "code": "None",
                "name": "None"
            }],
            "CareGiver": [{
                "code": "None",
                "name": "None"
            }],
        }

        let hcp_type = "";
        const queryArgs = req.getQueryArgs();

        // @ts-ignore
        hcp_type = queryArgs.hcp_type || "";

        if (hcp_type && specialities[hcp_type]) {
            req.replyBack(200, {
                data: specialities[hcp_type]
            })
        } else {
            req.replyBack(200, {
                data: specialities
            })
        }
    }

    hcpTypes(req: IRouterRequest): void {
        req.replyBack(200, {
            data: [
                {
                    "code": "RN",
                    "name": "RN"
                }, {
                    "code": "LVN",
                    "name": "LVN"
                }, {
                    "code": "CNA",
                    "name": "CNA"
                }, {
                    "code": "CareGiver",
                    "name": "CareGiver"
                }, {
                    "code": "MedTech",
                    "name": "MedTech"
                }]
        });
    }

}

export {MetaController};


