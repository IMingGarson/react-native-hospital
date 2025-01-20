interface Document {
  title: string;
  content: string;
  duration: number;
}

interface Video {
  id: string;
  title: string;
  uri: string;
  watched: boolean;
  timestamp: number;
  duration: number;
}

interface Survey {
  symptom: string;
  hasSymptom: boolean;
  severity: number;
  customSymptom: string | null;
}

interface PatientProgressionData {
  id: number,
  name: string,
  video: Video[],
  survey: Survey[],
  document: Document[],
  records: SymptomRecord[]
}

interface SymptomRecord {
  date: string;
  data: Survey[];
}

interface VideoInterface {
  id: string;
  title: string;
  uri: string;
  watched: boolean;
  timestamp: number;
  duration: number;
}

interface ProgressState {
  [key: string]: VideoInterface;
}

interface PSAData {
  date: string;
  psa: number;
}

export type { 
    PatientProgressionData as PatientProgressionData,
    SymptomRecord as SymptomRecord,
    Document as Document,
    Survey as Survey,
    Video as Video,
    ProgressState as ProgressState,
    VideoInterface as VideoInterface,
    PSAData as PSAData
}