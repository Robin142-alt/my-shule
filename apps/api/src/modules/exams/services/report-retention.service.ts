import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { readdir, lstat, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseFileStorageService } from '../../../common/uploads/database-file-storage.service';
import { PrismaService } from '../../../database/prisma.service';
import { ReportWorkService } from './report-work.service';
import { ConfigService } from '@nestjs/config';

export async function removeAbandonedReportFiles(
  root = tmpdir(),
  now = Date.now(),
) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      !/^myshule-report-cards-[A-Za-z0-9]+$/.test(entry.name)
    )
      continue;
    const directory = join(root, entry.name);
    if (now - (await lstat(directory)).mtimeMs < 24 * 60 * 60 * 1000) continue;
    const path = join(directory, 'report-cards.pdf');
    const file = await lstat(path).catch(() => null);
    if (file?.isFile() && !file.isSymbolicLink()) await unlink(path);
    // No recursive deletion; leave unexpected files and symlinks for inspection.
    await rmdir(directory).catch(() => undefined);
  }
}
@Injectable()
export class ReportRetentionService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly logger = new Logger(ReportRetentionService.name);
  constructor(
    private readonly storage: DatabaseFileStorageService,
    private readonly prisma: PrismaService,
    private readonly work: ReportWorkService,
    private readonly config: ConfigService,
  ) {}
  onApplicationBootstrap() {
    if (
      !this.work.isWorker() ||
      this.config.get('reportCards.workerLane') === 'interactive'
    )
      return;
    this.timer = setInterval(() => {
      void this.sweep();
    }, 10000);
    this.timer.unref();
    void removeAbandonedReportFiles().catch((error) =>
      this.logger.error('Report temporary-file cleanup failed', error),
    );
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.storage.purgeExpiredFileObjects({
        now: new Date().toISOString(),
        batchSize: 500,
        retentionPolicies: ['report-staging', 'report-export', 'reports'],
      });
      await this.storage.purgeOrphanedReportUploads();
      if (result.storage_paths.length)
        await this.prisma.$executeRawUnsafe(
          'DELETE FROM report_pdf_cache WHERE storage_path=ANY($1::text[])',
          result.storage_paths,
        );
      // Bounded batches catch up rather than deleting only hundreds of jobs/day.
      for (let batch = 0; batch < 10; batch++) {
        const deleted = await this.prisma
          .$executeRawUnsafe(`WITH expired AS (SELECT id FROM report_work WHERE expires_at<now()-interval '1 day'
          AND (lease_until IS NULL OR lease_until<now()) ORDER BY expires_at LIMIT 2000 FOR UPDATE SKIP LOCKED)
          DELETE FROM report_work USING expired WHERE report_work.id=expired.id`);
        if (deleted < 2000) break;
      }
      this.logger.log(
        JSON.stringify({
          event: 'report_retention.swept',
          deleted: result.deleted_count,
          bytes: result.deleted_bytes,
        }),
      );
    } catch (error) {
      this.logger.error(
        'Report retention failed; retained metadata allows retry',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
