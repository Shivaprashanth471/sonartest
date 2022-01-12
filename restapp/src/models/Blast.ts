export interface Blast {
    title: string,
    blast_owner_id: string,
    text_msg: string,
    is_blasted: boolean,
    created_at: string,
    updated_at: string
}

export interface BlastGroup {
    id: string,
    blast_id: string,
    group_id: string,
    created_at: string,
    updated_at: string,
}

export interface BlastLog {
    id: string,
    blast_id: string,
    hcp_user_id: string,
    triggered_owner_id: string,
    phone_number: string,
    text_content: string,
    dialpad_response: string,
    is_delivered: boolean,
    created_at: string,
    updated_at: string
}