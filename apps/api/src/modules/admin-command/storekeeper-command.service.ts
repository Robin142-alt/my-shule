import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class StorekeeperCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id || null;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[]; rowCount: number }> {
    try {
      return await this.prisma.query<T>(query, params);
    } catch {
      return { rows: [], rowCount: 0 };
    }
  }

  private titleCaseStatus(value: string | null | undefined): string {
    return String(value || 'pending')
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  private async ensureCategory(tenantId: string, categoryName: string): Promise<string | null> {
    const name = String(categoryName || '').trim();
    if (!name) return null;
    const result = await this.operations.writeSql<{ id: string }>(
      `
        INSERT INTO inventory_categories (tenant_id, category_name)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id, category_name)
        DO UPDATE SET updated_at = NOW()
        RETURNING id::text
      `,
      [tenantId, name],
    );
    return result.rows[0]?.id ?? null;
  }

  private async findItemByNameOrId(tenantId: string, value: string) {
    const result = await this.operations.readSql(
      `
        SELECT id::text, item_name, unit, quantity_on_hand, unit_price
        FROM inventory_items
        WHERE tenant_id = $1
          AND COALESCE(is_archived, FALSE) = FALSE
          AND (id::text = $2 OR lower(item_name) = lower($2))
        ORDER BY CASE WHEN id::text = $2 THEN 0 ELSE 1 END
        LIMIT 1
      `,
      [tenantId, value],
    );
    return result.rows[0] ?? null;
  }

  private async nextSequenceCode(tenantId: string, table: string, prefix: string): Promise<string> {
    const result = await this.operations.readSql<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE tenant_id = $1`,
      [tenantId],
    );
    const next = (result.rows[0]?.count ?? 0) + 1;
    return `${prefix}-${new Date().getFullYear()}-${String(next).padStart(5, '0')}`;
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT
        (SELECT COUNT(*)::int FROM inventory_items WHERE tenant_id = $1 AND COALESCE(is_archived, FALSE) = FALSE) as "totalItems",
        (SELECT COUNT(*)::int FROM inventory_items WHERE tenant_id = $1 AND COALESCE(is_archived, FALSE) = FALSE AND quantity_on_hand <= reorder_level) as "lowStockCount",
        (SELECT COUNT(*)::int FROM inventory_requests WHERE tenant_id = $1 AND status = 'pending') as "pendingRequests",
        (SELECT COUNT(*)::int FROM inventory_incidents WHERE tenant_id = $1 AND status IN ('logged', 'write_off_requested')) as "damagedCount"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalItems: 0, lowStockCount: 0, pendingRequests: 0, damagedCount: 0 };
    return {
      metrics: {
        totalItems: row.totalItems || 0,
        lowStockCount: row.lowStockCount || 0,
        pendingRequests: row.pendingRequests || 0,
        damagedCount: row.damagedCount || 0,
      },
      recentActivities: [],
    };
  }

  async getItems() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          item.id::text,
          item.item_name AS name,
          COALESCE(category.category_name, 'Uncategorized') AS category,
          item.unit,
          item.quantity_on_hand AS quantity_in_stock,
          item.reorder_level,
          item.unit_price AS unit_cost,
          to_char(MAX(movement.occurred_at) FILTER (WHERE lower(movement.movement_type::text) IN ('receive', 'received', 'stock_in')), 'YYYY-MM-DD') AS last_restocked,
          item.status
        FROM inventory_items item
        LEFT JOIN inventory_categories category
          ON category.tenant_id = item.tenant_id AND category.id = item.category_id
        LEFT JOIN inventory_stock_movements movement
          ON movement.tenant_id = item.tenant_id AND movement.item_id = item.id
        WHERE item.tenant_id = $1
          AND COALESCE(item.is_archived, FALSE) = FALSE
        GROUP BY item.id, category.category_name
        ORDER BY item.item_name ASC
      `,
      [tenantId],
    );
    const items = res.rows;
    const categories = [...new Set(items.map((item: any) => item.category).filter(Boolean))].sort();
    return {
      metrics: {
        total_items: items.length,
        total_categories: categories.length,
        total_stock_value: items.reduce((sum: number, item: any) => sum + Number(item.quantity_in_stock || 0) * Number(item.unit_cost || 0), 0),
      },
      categories,
      items,
    };
  }

  async createItem(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const itemName = this.operations.requiredText(dto?.item_name ?? dto?.name, 'Item name');
    const unit = this.operations.requiredText(dto?.unit, 'Unit');
    const categoryId = await this.ensureCategory(tenantId, String(dto?.category || dto?.category_name || 'Uncategorized'));
    const sku = String(dto?.sku || `${itemName}-${Date.now()}`)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]+/g, '-')
      .slice(0, 64);
    const result = await this.operations.writeSql(
      `
        INSERT INTO inventory_items (
          tenant_id, item_name, sku, category_id, unit, quantity_on_hand, unit_price, reorder_level, storage_location, notes, status
        )
        VALUES ($1, $2, $3, $4::uuid, $5, $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''), 'active')
        RETURNING id::text, item_name, sku, quantity_on_hand
      `,
      [
        tenantId,
        itemName,
        sku,
        categoryId,
        unit,
        Math.max(0, Number(dto?.quantity_on_hand ?? dto?.quantity_in_stock ?? 0) || 0),
        Math.max(0, Number(dto?.unit_price ?? dto?.unit_cost ?? 0) || 0),
        Math.max(0, Number(dto?.reorder_level ?? dto?.reorderLevel ?? 0) || 0),
        dto?.storage_location || null,
        dto?.notes || null,
      ],
    );
    const item = result.rows[0];
    await this.operations.recordAudit(tenantId, 'inventory.item_created', 'inventory_item', item.id, { item }, userId);
    return { success: true, message: 'Item added to catalogue', item };
  }

  async updateItem(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const categoryId = dto?.category || dto?.category_name ? await this.ensureCategory(tenantId, String(dto.category || dto.category_name)) : undefined;
    const result = await this.operations.writeSql(
      `
        UPDATE inventory_items
        SET item_name = COALESCE(NULLIF($3, ''), item_name),
            category_id = COALESCE($4::uuid, category_id),
            unit = COALESCE(NULLIF($5, ''), unit),
            unit_price = COALESCE($6, unit_price),
            reorder_level = COALESCE($7, reorder_level),
            storage_location = COALESCE(NULLIF($8, ''), storage_location),
            notes = COALESCE($9, notes),
            status = COALESCE(NULLIF($10, ''), status),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND COALESCE(is_archived, FALSE) = FALSE
        RETURNING id::text, item_name, quantity_on_hand
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Item ID'),
        dto?.item_name ?? dto?.name ?? null,
        categoryId ?? null,
        dto?.unit ?? null,
        dto?.unit_price ?? dto?.unit_cost ?? null,
        dto?.reorder_level ?? dto?.reorderLevel ?? null,
        dto?.storage_location ?? null,
        dto?.notes ?? null,
        dto?.status ?? null,
      ],
    );
    const item = result.rows[0];
    if (!item) throw new NotFoundException('Item was not found in this school');
    await this.operations.recordAudit(tenantId, 'inventory.item_updated', 'inventory_item', item.id, { item, changes: dto }, userId);
    return { success: true, message: 'Item updated', item };
  }

  async archiveItem(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE inventory_items
        SET is_archived = TRUE, status = 'archived', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING id::text, item_name
      `,
      [tenantId, this.operations.requiredText(id, 'Item ID')],
    );
    const item = result.rows[0];
    if (!item) throw new NotFoundException('Item was not found in this school');
    await this.operations.recordAudit(tenantId, 'inventory.item_archived', 'inventory_item', item.id, { item }, userId);
    return { success: true, message: 'Item archived', item };
  }

  async issueItem(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const itemId = this.operations.requiredText(dto?.itemId ?? dto?.item_id, 'Item');
    const quantity = this.operations.positiveInteger(dto?.quantity, 'Issue quantity');
    const result = await this.operations.writeSql(
      `
        WITH locked_item AS (
          SELECT id, item_name, quantity_on_hand AS before_quantity
          FROM inventory_items
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND COALESCE(is_archived, FALSE) = FALSE
            AND quantity_on_hand >= $3
          FOR UPDATE
        ),
        updated_item AS (
          UPDATE inventory_items item
          SET quantity_on_hand = item.quantity_on_hand - $3,
              updated_at = NOW()
          FROM locked_item
          WHERE item.tenant_id = $1
            AND item.id = locked_item.id
          RETURNING item.id::text, item.item_name, locked_item.before_quantity, item.quantity_on_hand AS after_quantity
        ),
        movement AS (
          INSERT INTO inventory_stock_movements (
            tenant_id, item_id, movement_type, quantity, reference, before_quantity, after_quantity, department, counterparty, actor_user_id, notes
          )
          SELECT
            $1,
            updated_item.id::uuid,
            'issue',
            $3,
            COALESCE($4, 'storekeeper-dashboard'),
            updated_item.before_quantity,
            updated_item.after_quantity,
            NULLIF($5, ''),
            NULLIF($6, ''),
            $7::uuid,
            NULLIF($8, '')
          FROM updated_item
          RETURNING id::text
        )
        SELECT updated_item.*, movement.id AS "movementId"
        FROM updated_item
        JOIN movement ON TRUE
      `,
      [
        tenantId,
        itemId,
        quantity,
        dto?.reference || null,
        dto?.department || null,
        dto?.issuedTo || dto?.issued_to || dto?.counterparty || null,
        this.operations.uuidOrNull(userId),
        dto?.notes || null,
      ],
    );
    const item = result.rows[0];
    if (!item) throw new BadRequestException('Item was not found in this school or has insufficient stock');
    await this.operations.recordAudit(tenantId, 'inventory.item_issued', 'inventory_item', item.id, { item, quantity }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `storekeeper-item-issued-${item.movementId}`,
      type: 'inventory.item_issued',
      title: `${item.item_name} issued`,
      body: `${quantity} unit(s) were issued from store. Remaining balance: ${item.after_quantity}.`,
      targetRoles: ['principal', 'storekeeper'],
      metadata: { item, quantity },
    });
    return { success: true, message: 'Item issued and stock balance updated', item };
  }

  async receiveItem(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const itemId = this.operations.requiredText(dto?.itemId ?? dto?.item_id, 'Item');
    const quantity = this.operations.positiveInteger(dto?.quantity, 'Received quantity');
    const result = await this.operations.writeSql(
      `
        WITH locked_item AS (
          SELECT id, item_name, quantity_on_hand AS before_quantity
          FROM inventory_items
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND COALESCE(is_archived, FALSE) = FALSE
          FOR UPDATE
        ),
        updated_item AS (
          UPDATE inventory_items item
          SET quantity_on_hand = item.quantity_on_hand + $3,
              updated_at = NOW()
          FROM locked_item
          WHERE item.tenant_id = $1
            AND item.id = locked_item.id
          RETURNING item.id::text, item.item_name, locked_item.before_quantity, item.quantity_on_hand AS after_quantity
        ),
        movement AS (
          INSERT INTO inventory_stock_movements (
            tenant_id, item_id, movement_type, quantity, reference, before_quantity, after_quantity, department, counterparty, actor_user_id, notes
          )
          SELECT
            $1,
            updated_item.id::uuid,
            'receive',
            $3,
            COALESCE($4, 'storekeeper-dashboard'),
            updated_item.before_quantity,
            updated_item.after_quantity,
            NULLIF($5, ''),
            NULLIF($6, ''),
            $7::uuid,
            NULLIF($8, '')
          FROM updated_item
          RETURNING id::text
        )
        SELECT updated_item.*, movement.id AS "movementId"
        FROM updated_item
        JOIN movement ON TRUE
      `,
      [
        tenantId,
        itemId,
        quantity,
        dto?.reference || null,
        dto?.department || null,
        dto?.supplier || dto?.counterparty || null,
        this.operations.uuidOrNull(userId),
        dto?.notes || null,
      ],
    );
    const item = result.rows[0];
    if (!item) throw new NotFoundException('Item was not found in this school');
    await this.operations.recordAudit(tenantId, 'inventory.item_received', 'inventory_item', item.id, { item, quantity }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `storekeeper-item-received-${item.movementId}`,
      type: 'inventory.item_received',
      title: `${item.item_name} received`,
      body: `${quantity} unit(s) were received into store. New balance: ${item.after_quantity}.`,
      targetRoles: ['principal', 'storekeeper'],
      metadata: { item, quantity },
    });
    return { success: true, message: 'Item received and stock balance updated', item };
  }

  async getLowStock() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          item.id::text,
          item.item_name AS name,
          COALESCE(category.category_name, 'Uncategorized') AS category,
          item.unit,
          item.quantity_on_hand AS quantity_in_stock,
          item.reorder_level,
          to_char(MAX(movement.occurred_at) FILTER (WHERE lower(movement.movement_type::text) IN ('receive', 'received', 'stock_in')), 'YYYY-MM-DD') AS last_restocked,
          COALESCE(CURRENT_DATE - (MAX(movement.occurred_at) FILTER (WHERE lower(movement.movement_type::text) IN ('receive', 'received', 'stock_in')))::date, 0)::int AS days_since_restock
        FROM inventory_items item
        LEFT JOIN inventory_categories category
          ON category.tenant_id = item.tenant_id AND category.id = item.category_id
        LEFT JOIN inventory_stock_movements movement
          ON movement.tenant_id = item.tenant_id AND movement.item_id = item.id
        WHERE item.tenant_id = $1
          AND COALESCE(item.is_archived, FALSE) = FALSE
          AND item.quantity_on_hand <= item.reorder_level
        GROUP BY item.id, category.category_name
        ORDER BY item.quantity_on_hand ASC, item.item_name ASC
      `,
      [tenantId],
    );
    const items = res.rows;
    return {
      metrics: {
        total_low_stock: items.length,
        out_of_stock: items.filter((item: any) => Number(item.quantity_in_stock) === 0).length,
        critical_items: items.filter((item: any) => Number(item.quantity_in_stock) <= Number(item.reorder_level) * 0.5).length,
      },
      items,
    };
  }

  async reorderItem(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const item = await this.findItemByNameOrId(tenantId, this.operations.requiredText(id, 'Item ID'));
    if (!item) throw new NotFoundException('Item was not found in this school');
    const requestNumber = await this.nextSequenceCode(tenantId, 'inventory_requests', 'REQ');
    const result = await this.operations.writeSql(
      `
        INSERT INTO inventory_requests (tenant_id, request_number, department, requested_by, status, priority, lines, notes)
        VALUES ($1, $2, 'Stores', 'Storekeeper', 'pending', 'high', $3::jsonb, $4)
        RETURNING id::text, request_number, status
      `,
      [
        tenantId,
        requestNumber,
        JSON.stringify([{ item_id: item.id, item_name: item.item_name, quantity: Math.max(1, Number(item.quantity_on_hand || 0) || 1), unit: item.unit }]),
        `Reorder raised from low-stock alert for ${item.item_name}`,
      ],
    );
    const request = result.rows[0];
    await this.operations.recordAudit(tenantId, 'inventory.reorder_requested', 'inventory_request', request.id, { item, request }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `storekeeper-reorder-${request.id}`,
      type: 'inventory.reorder_requested',
      title: `Reorder requested: ${item.item_name}`,
      body: `A reorder request was raised for ${item.item_name}.`,
      targetRoles: ['principal', 'storekeeper', 'procurement_officer'],
      metadata: { request, item },
    });
    return { success: true, message: 'Reorder request raised', request };
  }

  async getRequests() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          id::text,
          requested_by AS requester_name,
          department,
          COALESCE(lines->0->>'item_name', lines->0->>'name', 'Multiple items') AS item_name,
          COALESCE((lines->0->>'quantity')::int, (lines->0->>'quantity_requested')::int, 1) AS quantity_requested,
          COALESCE(lines->0->>'unit', 'unit') AS unit,
          COALESCE(notes, '') AS reason,
          INITCAP(priority) AS priority,
          to_char(created_at, 'YYYY-MM-DD') AS requested_date,
          status,
          lines
        FROM inventory_requests
        WHERE tenant_id = $1
        ORDER BY created_at DESC
      `,
      [tenantId],
    );
    const requests = res.rows.map((request: any) => ({ ...request, status: this.titleCaseStatus(request.status) }));
    return {
      metrics: {
        total_requests: requests.length,
        pending: requests.filter((r: any) => r.status === 'Pending').length,
        approved: requests.filter((r: any) => r.status === 'Approved').length,
        fulfilled: requests.filter((r: any) => r.status === 'Fulfilled').length,
        rejected: requests.filter((r: any) => r.status === 'Rejected').length,
      },
      requests,
    };
  }

  async actionRequest(id: string, status: 'approved' | 'rejected', dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    if (status === 'rejected') {
      this.operations.requiredText(dto?.reason, 'Rejection reason');
    }
    const result = await this.operations.writeSql(
      `
        UPDATE inventory_requests
        SET status = $3,
            approved_by_user_id = CASE WHEN $3 = 'approved' THEN $4::uuid ELSE approved_by_user_id END,
            notes = CASE WHEN $3 = 'rejected' THEN CONCAT(COALESCE(notes, ''), E'\nRejected: ', $5) ELSE notes END,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'pending'
        RETURNING id::text, request_number, status
      `,
      [tenantId, this.operations.requiredText(id, 'Request ID'), status, this.operations.uuidOrNull(userId), dto?.reason || null],
    );
    const request = result.rows[0];
    if (!request) throw new BadRequestException('Request was not found or is no longer pending');
    await this.operations.recordAudit(tenantId, `inventory.request_${status}`, 'inventory_request', request.id, { request, reason: dto?.reason }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `storekeeper-request-${status}-${request.id}`,
      type: `inventory.request_${status}`,
      title: `Store request ${this.titleCaseStatus(status)}`,
      body: `Request ${request.request_number} was ${status}.`,
      targetRoles: ['principal', 'storekeeper'],
      metadata: { request, reason: dto?.reason },
    });
    return { success: true, message: `Request ${status}`, request };
  }

  async fulfillRequest(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const requestResult = await this.operations.writeSql(
      `
        UPDATE inventory_requests
        SET status = 'fulfilled', fulfilled_at = NOW(), updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status IN ('approved', 'pending')
        RETURNING id::text, request_number, lines
      `,
      [tenantId, this.operations.requiredText(id, 'Request ID')],
    );
    const request = requestResult.rows[0];
    if (!request) throw new BadRequestException('Request was not found or cannot be fulfilled from its current state');

    const lines = Array.isArray(request.lines) ? request.lines : [];
    const issued: any[] = [];
    for (const line of lines) {
      const itemId = line?.item_id || line?.id;
      const quantity = Number(line?.quantity ?? line?.quantity_requested ?? 0);
      if (!itemId || !Number.isInteger(quantity) || quantity <= 0) continue;
      const movement = await this.operations.writeSql(
        `
          WITH locked_item AS (
            SELECT id, item_name, quantity_on_hand AS before_quantity
            FROM inventory_items
            WHERE tenant_id = $1 AND id = $2::uuid AND quantity_on_hand >= $3
            FOR UPDATE
          ),
          updated_item AS (
            UPDATE inventory_items item
            SET quantity_on_hand = item.quantity_on_hand - $3, updated_at = NOW()
            FROM locked_item
            WHERE item.tenant_id = $1 AND item.id = locked_item.id
            RETURNING item.id::text, item.item_name, locked_item.before_quantity, item.quantity_on_hand AS after_quantity
          )
          INSERT INTO inventory_stock_movements (
            tenant_id, item_id, movement_type, quantity, reference, before_quantity, after_quantity, department, counterparty, actor_user_id, notes
          )
          SELECT $1, updated_item.id::uuid, 'issue', $3, $4, updated_item.before_quantity, updated_item.after_quantity, 'Stores', 'Department request', $5::uuid, 'Fulfilled store request'
          FROM updated_item
          RETURNING id::text, item_id::text, quantity
        `,
        [tenantId, itemId, quantity, request.request_number, this.operations.uuidOrNull(userId)],
      );
      issued.push(...movement.rows);
    }
    await this.operations.recordAudit(tenantId, 'inventory.request_fulfilled', 'inventory_request', request.id, { request, issued }, userId);
    return { success: true, message: 'Request fulfilled', request, issued };
  }

  async getStocktake() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          id::text,
          COALESCE(notes, snapshot_number) AS title,
          COALESCE(location_code, 'All') AS category_scope,
          COALESCE(counted_by_user_id::text, 'Storekeeper') AS started_by,
          to_char(created_at, 'YYYY-MM-DD') AS start_date,
          CASE WHEN status = 'posted' THEN to_char(updated_at, 'YYYY-MM-DD') ELSE NULL END AS end_date,
          jsonb_array_length(lines::jsonb) AS total_items_counted,
          jsonb_array_length(lines::jsonb) AS total_items_expected,
          variance_count AS discrepancies,
          status
        FROM inventory_stock_count_snapshots
        WHERE tenant_id = $1
        ORDER BY counted_at DESC, created_at DESC
      `,
      [tenantId],
    );
    const stocktakes = res.rows.map((row: any) => ({
      ...row,
      status: row.status === 'draft' ? 'In Progress' : row.status === 'posted' ? 'Completed' : this.titleCaseStatus(row.status),
    }));
    return {
      metrics: {
        total_stocktakes: stocktakes.length,
        in_progress: stocktakes.filter((row: any) => row.status === 'In Progress').length,
        completed_this_term: stocktakes.filter((row: any) => row.status === 'Completed').length,
        total_discrepancies: stocktakes.reduce((sum: number, row: any) => sum + Number(row.discrepancies || 0), 0),
      },
      stocktakes,
    };
  }

  async startStocktake(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const snapshotNumber = await this.nextSequenceCode(tenantId, 'inventory_stock_count_snapshots', 'STK');
    const result = await this.operations.writeSql(
      `
        INSERT INTO inventory_stock_count_snapshots (
          tenant_id, snapshot_number, location_code, counted_by_user_id, status, lines, notes
        )
        VALUES ($1, $2, NULLIF($3, ''), $4::uuid, 'draft', '[]'::jsonb, $5)
        RETURNING id::text, snapshot_number, status
      `,
      [
        tenantId,
        snapshotNumber,
        dto?.category_scope || dto?.scope || 'All',
        this.operations.uuidOrNull(userId),
        this.operations.requiredText(dto?.title || 'Stocktake', 'Stocktake title'),
      ],
    );
    const stocktake = result.rows[0];
    await this.operations.recordAudit(tenantId, 'inventory.stocktake_started', 'inventory_stock_count_snapshot', stocktake.id, { stocktake }, userId);
    return { success: true, message: 'Stocktake started', stocktake };
  }

  async submitStocktake(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const lines = Array.isArray(dto?.lines) ? dto.lines : Array.isArray(dto?.counts) ? dto.counts : [];
    const varianceCount = lines.filter((line: any) => Number(line?.expected ?? line?.system_quantity ?? 0) !== Number(line?.counted ?? line?.counted_quantity ?? 0)).length;
    const result = await this.operations.writeSql(
      `
        UPDATE inventory_stock_count_snapshots
        SET lines = $3::jsonb, variance_count = $4, status = 'draft', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid AND status = 'draft'
        RETURNING id::text, snapshot_number, variance_count, status
      `,
      [tenantId, this.operations.requiredText(id, 'Stocktake ID'), JSON.stringify(lines), varianceCount],
    );
    const stocktake = result.rows[0];
    if (!stocktake) throw new BadRequestException('Stocktake was not found or is no longer editable');
    await this.operations.recordAudit(tenantId, 'inventory.stocktake_count_submitted', 'inventory_stock_count_snapshot', stocktake.id, { stocktake }, userId);
    return { success: true, message: 'Stocktake count submitted', stocktake };
  }

  async finalizeStocktake(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE inventory_stock_count_snapshots
        SET status = 'posted', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid AND status = 'draft'
        RETURNING id::text, snapshot_number, variance_count, status
      `,
      [tenantId, this.operations.requiredText(id, 'Stocktake ID')],
    );
    const stocktake = result.rows[0];
    if (!stocktake) throw new BadRequestException('Stocktake was not found or has already been finalized');
    await this.operations.recordAudit(tenantId, 'inventory.stocktake_finalized', 'inventory_stock_count_snapshot', stocktake.id, { stocktake }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `storekeeper-stocktake-finalized-${stocktake.id}`,
      type: 'inventory.stocktake_finalized',
      title: `Stocktake ${stocktake.snapshot_number} finalized`,
      body: `A stocktake was finalized with ${stocktake.variance_count} variance(s).`,
      targetRoles: ['principal', 'storekeeper'],
      metadata: { stocktake },
    });
    return { success: true, message: 'Stocktake finalized', stocktake };
  }

  async getDamagedMissing() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          incident.id::text,
          item.item_name,
          COALESCE(category.category_name, 'Uncategorized') AS category,
          incident.quantity,
          item.unit,
          incident.incident_type AS type,
          incident.reason,
          'Storekeeper' AS reported_by,
          to_char(incident.reported_at, 'YYYY-MM-DD') AS reported_date,
          incident.cost_impact AS estimated_loss,
          incident.status
        FROM inventory_incidents incident
        JOIN inventory_items item
          ON item.tenant_id = incident.tenant_id AND item.id::text = incident.item_id::text
        LEFT JOIN inventory_categories category
          ON category.tenant_id = item.tenant_id AND category.id::text = item.category_id::text
        WHERE incident.tenant_id = $1
        ORDER BY incident.reported_at DESC
      `,
      [tenantId],
    );
    const records = res.rows.map((row: any) => ({
      ...row,
      type: this.titleCaseStatus(row.type),
      status: row.status === 'logged' ? 'Reported' : row.status === 'write_off_requested' ? 'Pending Write-Off' : row.status === 'written_off' ? 'Written Off' : this.titleCaseStatus(row.status),
    }));
    return {
      metrics: {
        total_incidents: records.length,
        pending_writeoff: records.filter((row: any) => row.status === 'Pending Write-Off').length,
        total_loss_value: records.reduce((sum: number, row: any) => sum + Number(row.estimated_loss || 0), 0),
        written_off: records.filter((row: any) => row.status === 'Written Off').length,
      },
      records,
    };
  }

  async reportDamagedMissing(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const item = await this.findItemByNameOrId(tenantId, this.operations.requiredText(dto?.item_id ?? dto?.item_name ?? dto?.itemName, 'Item'));
    if (!item) throw new NotFoundException('Item was not found in this school');
    const quantity = this.operations.positiveInteger(dto?.quantity, 'Affected quantity');
    const incidentNumber = await this.nextSequenceCode(tenantId, 'inventory_incidents', 'INC');
    const result = await this.operations.writeSql(
      `
        INSERT INTO inventory_incidents (
          tenant_id, incident_number, item_id, incident_type, quantity, reason, responsible_department, cost_impact, status, notes
        )
        VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8, 'logged', NULLIF($9, ''))
        RETURNING id::text, incident_number, status
      `,
      [
        tenantId,
        incidentNumber,
        item.id,
        String(dto?.type || dto?.incident_type || 'damaged').toLowerCase().replace(/\s+/g, '_'),
        quantity,
        this.operations.requiredText(dto?.reason, 'Reason'),
        dto?.responsible_department || 'Stores',
        Number(item.unit_price || 0) * quantity,
        dto?.notes || null,
      ],
    );
    const incident = result.rows[0];
    await this.operations.recordAudit(tenantId, 'inventory.incident_reported', 'inventory_incident', incident.id, { incident, item, quantity }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `storekeeper-incident-${incident.id}`,
      type: 'inventory.incident_reported',
      title: 'Inventory incident reported',
      body: `${quantity} ${item.unit}(s) of ${item.item_name} were reported as affected.`,
      targetRoles: ['principal', 'storekeeper'],
      metadata: { incident, item },
    });
    return { success: true, message: 'Incident reported', incident };
  }

  async writeOffDamagedMissing(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE inventory_incidents
        SET status = 'write_off_requested',
            notes = CONCAT(COALESCE(notes, ''), E'\nWrite-off requested: ', $3),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status <> 'written_off'
        RETURNING id::text, incident_number, status
      `,
      [tenantId, this.operations.requiredText(id, 'Incident ID'), this.operations.requiredText(dto?.notes, 'Write-off notes')],
    );
    const incident = result.rows[0];
    if (!incident) throw new BadRequestException('Incident was not found or is already closed');
    await this.operations.recordAudit(tenantId, 'inventory.write_off_requested', 'inventory_incident', incident.id, { incident, notes: dto?.notes }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `storekeeper-writeoff-${incident.id}`,
      type: 'inventory.write_off_requested',
      title: 'Inventory write-off requested',
      body: `Write-off approval is requested for incident ${incident.incident_number}.`,
      targetRoles: ['principal', 'storekeeper'],
      metadata: { incident, notes: dto?.notes },
    });
    return { success: true, message: 'Write-off request submitted', incident };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'storekeeper-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const [overview, items, lowStock, requests, stocktake, damagedMissing] = await Promise.all([
      this.getOverview(),
      this.getItems(),
      this.getLowStock(),
      this.getRequests(),
      this.getStocktake(),
      this.getDamagedMissing(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'storekeeper-command',
      reportId: 'storekeeper-operations',
      title: String(dto?.name || dto?.title || 'Storekeeper operations report'),
      format: dto?.format,
      generatedByUserId: this.operations.uuidOrNull(userId),
      sections: { overview, items, lowStock, requests, stocktake, damagedMissing },
      filters: { requested_from: 'storekeeper-dashboard' },
      targetRoles: ['principal', 'storekeeper'],
    });
  }

  async recordAction(dto: any = {}) {
    const tenantId = this.requireTenantId();
    const normalized = String(dto?.action || dto?.type || 'storekeeper_action')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_');

    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'storekeeper',
      targetRoles: ['storekeeper', 'principal', 'accountant', 'procurement_officer'],
      eventType: `storekeeper.${normalized}`,
      entityType: String(dto?.entityType || 'storekeeper_workflow'),
      entityId: dto?.entityId ?? dto?.id ?? null,
      title: String(dto?.title || normalized.replace(/_/g, ' ')).replace(/\b\w/g, (char) => char.toUpperCase()).slice(0, 160),
      message: String(dto?.message || dto?.body || dto?.notice || 'Storekeeper workflow saved.').slice(0, 500),
      priority: normalized.includes('critical') || normalized.includes('reject') || normalized.includes('purchase_order') ? 'high' : 'normal',
      payload: { source_dashboard: 'storekeeper-command-center', ...dto, action: normalized },
    });
  }

  async downloadReport(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT snapshot_id AS "snapshotId", title, format, artifact, manifest, created_at::text AS "generatedDate"
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module = 'storekeeper-command'
          AND (id::text = $2 OR snapshot_id = $2)
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Report ID')],
    );
    const report = result.rows[0];
    if (!report) throw new NotFoundException('Report was not found in this school');
    return { success: true, message: 'Report artifact ready', report };
  }
}
