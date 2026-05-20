import { Injectable } from '@nestjs/common';

import {
  DataClassificationId,
  DataClassificationRegistryService,
} from './data-classification-registry.service';

export interface PiiLeakScanArtifact {
  path: string;
  content: string;
}

export interface PiiLeakFinding {
  path: string;
  classification: DataClassificationId;
  detector: string;
  excerpt: string;
}

export interface PiiLeakScanResult {
  ok: boolean;
  findings: PiiLeakFinding[];
}

const RAW_KENYAN_PHONE_PATTERN = /\b(?:254|0)7\d{8}\b/g;
const ADMISSION_NUMBER_PATTERN = /\bADM[-/ ]?\d{3,}\b/gi;
const PAYER_NAME_PATTERN = /\b(?:Jane|John|Mary|Grace|Amina|Otieno|Wanjiku)\b\s+\b(?:Parent|Otieno|Wanjiku|Mwangi|Achieng)\b/g;
const MASKED_PHONE_PATTERN = /\b2547\*{6}\d{2}\b/;
const MASKED_ADMISSION_PATTERN = /\bADM-\*{3,}\b/i;

@Injectable()
export class PiiLeakScannerService {
  constructor(private readonly registry: DataClassificationRegistryService) {}

  scanArtifacts(artifacts: PiiLeakScanArtifact[]): PiiLeakScanResult {
    const findings = artifacts.flatMap((artifact) => this.scanArtifact(artifact));
    return {
      ok: findings.length === 0,
      findings,
    };
  }

  private scanArtifact(artifact: PiiLeakScanArtifact): PiiLeakFinding[] {
    const findings: PiiLeakFinding[] = [];
    this.collectMatches(
      findings,
      artifact,
      RAW_KENYAN_PHONE_PATTERN,
      'raw_kenyan_phone_number',
      'payment_data',
    );
    this.collectMatches(
      findings,
      artifact,
      ADMISSION_NUMBER_PATTERN,
      'raw_admission_number',
      'sensitive_child_data',
      MASKED_ADMISSION_PATTERN,
    );
    this.collectMatches(
      findings,
      artifact,
      PAYER_NAME_PATTERN,
      'raw_parent_or_payer_name',
      'payment_data',
    );

    return findings.filter((finding) => !this.isKnownSafeMaskedValue(finding.excerpt));
  }

  private collectMatches(
    findings: PiiLeakFinding[],
    artifact: PiiLeakScanArtifact,
    pattern: RegExp,
    detector: string,
    classification: DataClassificationId,
    maskedPattern?: RegExp,
  ): void {
    for (const match of artifact.content.matchAll(pattern)) {
      const excerpt = match[0] ?? '';

      if (!excerpt || maskedPattern?.test(excerpt)) {
        continue;
      }

      findings.push({
        path: artifact.path,
        classification,
        detector,
        excerpt,
      });
    }
  }

  private isKnownSafeMaskedValue(value: string): boolean {
    return MASKED_PHONE_PATTERN.test(value)
      || this.registry.getColumnPolicy(value)?.redaction === 'mask';
  }
}
