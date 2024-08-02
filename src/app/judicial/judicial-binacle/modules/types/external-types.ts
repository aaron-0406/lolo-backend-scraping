export type CaseFiles = CaseFile[]

export interface CaseFile {
  id_judicial_case_file: number
  number_case_file: string
  judgment_number: number
  secretary: string
  amount_demanded_soles: number
  amount_demanded_dollars: number
  cautionary_code: string
  errand_code: string
  judge: string
  demand_date: string
  created_at: string
  client_id_client: number
  customer_user_id_customer_user: number
  judicial_court_id_judicial_court: number
  judicial_subject_id_judicial_subject: number
  judicial_procedural_way_id_judicial_procedural_way: number
  customer_has_bank_id: number
  process_reason_id?: number | null
  process_status?: string | null
  process_comment?: string | null
  id_judicial_case_file_related?: number | null
  id_bank?: number | null
  judicial_sede_id_judicial_sede?: number | null
  city_id_city?: number | null
  qr_code?: string | null
  is_valid: boolean
}

export interface CaseFileNumber {
  codeExp: string
  codeAnio: string
  codeIncidente: string
  codeDistprov: string
  codeOrgano: string
  codEspecialidad: string
  codInstancia: string
}
