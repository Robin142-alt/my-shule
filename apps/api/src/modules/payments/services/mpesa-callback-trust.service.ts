import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type MpesaCallbackTrustMode = 'edge_signed' | 'daraja_direct' | 'manual_review_only';

@Injectable()
export class MpesaCallbackTrustService {
  constructor(private readonly configService: ConfigService) {}

  resolveMode(): MpesaCallbackTrustMode {
    const configuredMode =
      this.configService.get<string>('mpesa.callbackTrustMode') ??
      process.env.MPESA_CALLBACK_TRUST_MODE ??
      'edge_signed';
    const normalizedMode = configuredMode.trim().toLowerCase();

    if (
      normalizedMode === 'edge_signed' ||
      normalizedMode === 'daraja_direct' ||
      normalizedMode === 'manual_review_only'
    ) {
      return normalizedMode;
    }

    return 'edge_signed';
  }

  requiresEdgeSignature(): boolean {
    return this.resolveMode() === 'edge_signed';
  }
}
