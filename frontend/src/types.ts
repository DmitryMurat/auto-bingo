export interface CodeOut {
  code: string;
  found: boolean;
}

export interface RegionOut {
  id: number;
  name: string;
  federal_district: string;
  map_id: string;
  codes: CodeOut[];
  total_codes: number;
  found_codes: number;
  fully_found: boolean;
}

export interface ProgressOut {
  total_codes: number;
  found_codes: number;
  total_regions: number;
  fully_found_regions: number;
  regions: RegionOut[];
}
