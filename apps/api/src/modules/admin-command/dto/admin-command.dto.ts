export class CreateAdminIncidentDto {
  title!: string;
  description!: string;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  involved_parties?: Array<Record<string, unknown>>;
}

export class CreateAnnouncementDto {
  title!: string;
  body!: string;
  channels!: Array<'sms' | 'email' | 'in_app'>;
  audience!: Record<string, unknown>;
}

export class CreateMeetingMinutesDto {
  meeting_date!: string;
  title!: string;
  agenda?: Array<Record<string, unknown>>;
  minutes!: string;
  action_items?: Array<Record<string, unknown>>;
}
