import {ObjectId} from "mongodb";

export interface ShiftRequirement {
    requirement_owner_id: ObjectId,
    facility_id: ObjectId,
    title: string,
    description: string,
    hcp_type: string,
    shift_type: string,
    hcp_count: number,
    warning_details: string,
    warning_type: string,
    shift_date: Date,
    shift_details: string,
    shift_timings: ShiftTiming
    is_active: boolean
    is_published: boolean
    got_required_hcps: boolean
    price: {
        inbound_price: number,
        outbound_price: number
    }
    status: string,
    created_at: Date
    updated_at: Date
}

export interface ShiftTiming {
    start_time: Date,
    end_time: Date
}