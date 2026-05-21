export type TransportDirection = 'morning' | 'afternoon' | 'round_trip';
export type TransportVehicleOwnershipType = 'school_owned' | 'leased' | 'contracted';
export type TransportTripEventType =
  | 'departed'
  | 'pickup'
  | 'dropoff'
  | 'delay'
  | 'incident'
  | 'arrived';

export interface CreateTransportRouteStopDto {
  name: string;
  sequence: number;
  planned_time?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface CreateTransportRouteDto {
  name: string;
  code?: string;
  direction: TransportDirection;
  zone?: string;
  fare_amount_minor?: number;
  stops?: CreateTransportRouteStopDto[];
}

export interface CreateTransportVehicleDto {
  registration_number: string;
  capacity: number;
  ownership_type: TransportVehicleOwnershipType;
  make?: string;
  model?: string;
  service_due_date?: string;
  insurance_expiry_date?: string;
}

export interface CreateTransportDriverDto {
  name: string;
  phone?: string;
  staff_id?: string;
  license_number?: string;
  license_expiry_date?: string;
}

export interface CreateTransportManifestDto {
  route_id: string;
  academic_term_id?: string;
  effective_from?: string;
  effective_to?: string;
  student_ids: string[];
}

export interface StartTransportTripDto {
  route_id: string;
  vehicle_id: string;
  driver_id?: string;
  manifest_id?: string;
  direction?: TransportDirection;
  trip_date?: string;
  scheduled_start_at?: string;
  learner_count?: number;
}

export interface RecordTransportTripEventDto {
  event_type: TransportTripEventType;
  student_id?: string;
  stop_id?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export interface RecordVehicleServiceDto {
  service_date?: string;
  odometer_reading?: number;
  next_service_date?: string;
  cost_minor?: number;
  service_provider?: string;
  notes?: string;
}
