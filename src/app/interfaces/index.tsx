interface Document {
  label: string
  content: string
  duration: number
}

interface Video {
  id: string
  title: string
  uri: string
  watched: boolean
  timestamp: number
  duration: number
}

interface Survey {
  symptom: string
  hasSymptom: boolean
  severity: number
  customSymptom: string | null
}

interface PatientProgressionData {
  id: number
  name: string
  video: Video[]
  survey: Survey[]
  document: Document[]
  records: SymptomRecord[]
  pushToken?: string
  birthday?: string
}

interface APIPatientProgressionData {
  id: string
  name: string
  document_progression_data: string
  video_progression_data: string
  survey_data: string
  symptom_records: APISymptomRecord[]
  push_token: string | null
  birthday: string
}

interface SymptomRecord {
  date: string
  data: Survey[]
}

interface APISymptomRecord {
  date: string
  survey_data: string
}

interface VideoInterface {
  id: string
  title: string
  uri: string
  watched: boolean
  timestamp: number
  duration: number
  length: string
}

interface ProgressState {
  [key: string]: VideoInterface
}

interface PSAData {
  date: string
  psa: number
}

export type {
  PatientProgressionData as PatientProgressionData,
  APIPatientProgressionData as APIPatientProgressionData,
  APISymptomRecord as APISymptomRecord,
  SymptomRecord as SymptomRecord,
  Document as Document,
  Survey as Survey,
  Video as Video,
  ProgressState as ProgressState,
  VideoInterface as VideoInterface,
  PSAData as PSAData
}
