export interface CreateIotDeviceDto {
  name: string;
  device_type: string;
  location_name?: string;
  external_device_id?: string;
  installation_date?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordIotTelemetryDto {
  device_id: string;
  metric_name: string;
  metric_value: number;
  unit?: string;
  severity?: 'normal' | 'warning' | 'critical';
  recorded_at?: string;
  metadata?: Record<string, unknown>;
}

export interface DispatchIotCommandDto {
  device_id: string;
  command_type: string;
  payload?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface IssueIotDeviceCredentialDto {
  label?: string;
  expires_at?: string;
}

export interface IotGatewayTelemetryReadingDto {
  metric_name: string;
  metric_value: number;
  unit?: string;
  severity?: 'normal' | 'warning' | 'critical';
  recorded_at?: string;
  metadata?: Record<string, unknown>;
}

export interface IotGatewayTelemetryDto {
  external_device_id?: string;
  readings: IotGatewayTelemetryReadingDto[];
  metadata?: Record<string, unknown>;
}

export interface IotGatewayCommandPollDto {
  external_device_id?: string;
  limit?: number;
}

export interface IotGatewayCommandAckDto {
  external_device_id?: string;
  status: 'acknowledged' | 'failed';
  result_metadata?: Record<string, unknown>;
}
