import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  AttachSupplierInvoiceDto,
  CreateProcurementRequestDto,
  CreateProcurementSupplierDto,
  CreatePurchaseOrderDto,
  ProcurementRequestItemDto,
  PurchaseOrderItemDto,
  RecordProcurementApprovalDto,
} from './dto/procurement.dto';
import { ProcurementRepository } from './repositories/procurement.repository';
import { EventPublisherService } from '../events/event-publisher.service';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalService } from '../workflow/services/approval.service';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly repository: ProcurementRepository,
    private readonly approvalService: ApprovalService,
    @Optional() private readonly eventPublisher?: EventPublisherService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  getDashboard() {
    this.assertPermission('procurement:read');

    return this.repository.getDashboard(this.requireTenantId());
  }

  async createSupplier(dto: CreateProcurementSupplierDto) {
    this.assertPermission('procurement:write');
    const supplier = await this.repository.createSupplier({
      ...dto,
      name: this.requireText(dto.name, 'Supplier name'),
      category: this.optionalText(dto.category),
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('procurement.supplier.created', 'procurement_supplier', supplier?.id, {
      name: dto.name,
      category: dto.category ?? null,
    });

    return supplier;
  }

  async createRequest(dto: CreateProcurementRequestDto) {
    this.assertPermission('procurement:write');
    const items = this.normalizeRequestItems(dto.items);
    const tenantId = this.requireTenantId();
    const requestedByUserId = this.requireUserId();
    const requestInput = {
      ...dto,
      title: this.requireText(dto.title, 'Procurement request title'),
      department: this.requireText(dto.department, 'Department'),
      items,
      tenant_id: tenantId,
      requested_by_user_id: requestedByUserId,
    };
    const auditMetadata = {
      title: dto.title,
      line_count: items.length,
      budget_code: dto.budget_code ?? null,
    };

    if (this.prisma && this.eventPublisher) {
      return this.prisma.executeWithTenant(tenantId, requestedByUserId, async (tx) => {
        const request = await this.repository.createRequest(requestInput, tx);
        await this.audit(
          'procurement.request.created',
          'procurement_request',
          request?.id,
          auditMetadata,
          tx,
        );
        await this.eventPublisher!.publishProcurementRequestSubmitted(
          this.procurementSubmittedPayload(tenantId, requestedByUserId, request?.id, items),
          tx,
        );
        return request;
      });
    }

    const request = await this.repository.createRequest(requestInput);
    await this.audit('procurement.request.created', 'procurement_request', request?.id, auditMetadata);
    if (this.eventPublisher) {
      await this.eventPublisher.publishProcurementRequestSubmitted(
        this.procurementSubmittedPayload(tenantId, requestedByUserId, request?.id, items),
      );
    }

    return request;
  }

  async recordApproval(requestId: string, dto: RecordProcurementApprovalDto) {
    this.assertPermission('procurement:approve');
    const tenantId = this.requireTenantId();
    const approverUserId = this.requireUserId();
    const decision = this.requireDecision(dto.decision);

    return this.approvalService.decideProcurementRequest({
      tenantId,
      procurementRequestId: this.requireText(requestId, 'Request id'),
      actorUserId: approverUserId,
      actorRole: this.requireRole(),
      requestId: this.requireRequestId(),
      decision: decision === 'approved' ? 'APPROVED' : 'REJECTED',
      note: dto.reason ?? null,
    });
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto) {
    this.assertPermission('procurement:write');
    const items = this.normalizeOrderItems(dto.items);
    const order = await this.repository.createPurchaseOrder({
      ...dto,
      supplier_id: this.requireText(dto.supplier_id, 'Supplier id'),
      items,
      tenant_id: this.requireTenantId(),
      created_by_user_id: this.requireUserId(),
    });

    await this.audit('procurement.purchase_order.created', 'purchase_order', order?.id, {
      supplier_id: dto.supplier_id,
      request_id: dto.request_id ?? null,
      line_count: items.length,
    });

    return order;
  }

  async attachInvoice(purchaseOrderId: string, dto: AttachSupplierInvoiceDto) {
    this.assertPermission('procurement:write');
    const invoice = await this.repository.attachInvoice({
      ...dto,
      purchase_order_id: this.requireText(purchaseOrderId, 'Purchase order id'),
      invoice_number: this.requireText(dto.invoice_number, 'Invoice number'),
      amount_minor: this.requireNonNegativeNumber(dto.amount_minor, 'Invoice amount'),
      tenant_id: this.requireTenantId(),
      attached_by_user_id: this.requireUserId(),
    });

    await this.audit('procurement.invoice.attached', 'supplier_invoice', invoice?.id, {
      purchase_order_id: purchaseOrderId,
      invoice_number: dto.invoice_number,
      amount_minor: dto.amount_minor,
    });

    return invoice;
  }

  private normalizeRequestItems(items: ProcurementRequestItemDto[] | undefined) {
    let normalized: Array<ProcurementRequestItemDto>;

    try {
      normalized = (items ?? []).map((item) => ({
        ...item,
        item_name: this.requireText(item.item_name, 'Procurement item name'),
        quantity: this.requirePositiveNumber(item.quantity, 'Procurement item quantity'),
        estimated_unit_cost_minor: this.requireNonNegativeNumber(
          item.estimated_unit_cost_minor,
          'Procurement item cost',
        ),
      }));
    } catch {
      throw new BadRequestException('At least one valid procurement line item is required');
    }

    if (normalized.length === 0) {
      throw new BadRequestException('At least one valid procurement line item is required');
    }

    return normalized;
  }

  private normalizeOrderItems(items: PurchaseOrderItemDto[] | undefined) {
    const normalized = (items ?? []).map((item) => ({
      ...item,
      item_name: this.requireText(item.item_name, 'Purchase order item name'),
      quantity: this.requirePositiveNumber(item.quantity, 'Purchase order item quantity'),
      unit_cost_minor: this.requireNonNegativeNumber(item.unit_cost_minor, 'Purchase order item cost'),
    }));

    if (normalized.length === 0) {
      throw new BadRequestException('At least one valid purchase order line item is required');
    }

    return normalized;
  }

  private requireDecision(value: string): 'approved' | 'rejected' {
    if (value === 'approved' || value === 'rejected') {
      return value;
    }

    if (value === 'returned') {
      throw new BadRequestException(
        'Returning a procurement request requires a dedicated correction workflow and cannot be recorded as an approval decision',
      );
    }

    throw new BadRequestException('Procurement approval decision is invalid');
  }

  private async audit(
    action: string,
    resourceType: string,
    resourceId: string | undefined,
    metadata: unknown,
    tx?: any,
  ) {
    await this.repository.appendAuditLog({
      tenant_id: this.requireTenantId(),
      actor_user_id: this.currentUserId(),
      action,
      resource_type: resourceType,
      resource_id: resourceId ?? null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    }, tx);
  }

  private procurementSubmittedPayload(
    tenantId: string,
    requestedByUserId: string,
    requestId: string | undefined,
    items: ProcurementRequestItemDto[],
  ) {
    if (!requestId) {
      throw new BadRequestException('Procurement request persistence returned no identifier');
    }

    const estimatedCost = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.estimated_unit_cost_minor),
      0,
    );
    const quantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
    const firstItem = items[0]?.item_name ?? 'procurement items';

    return {
      tenant_id: tenantId,
      request_id: requestId,
      requested_by_user_id: requestedByUserId,
      requested_at: new Date().toISOString(),
      item_name: items.length > 1 ? `${firstItem} and ${items.length - 1} more` : firstItem,
      quantity,
      estimated_cost: estimatedCost,
      status: 'submitted',
    };
  }

  private assertPermission(permission: string): void {
    const permissions = this.requestContext.getStore()?.permissions ?? [];
    const [resource] = permission.split(':');

    if (
      permissions.includes('*:*')
      || permissions.includes(permission)
      || permissions.includes(`${resource}:*`)
    ) {
      return;
    }

    throw new ForbiddenException('Procurement permission is required');
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required for procurement operations');
    }

    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id ?? null;
  }

  private requireUserId(): string {
    const userId = this.currentUserId();

    if (!userId) {
      throw new UnauthorizedException('Authenticated user is required for procurement operations');
    }

    return userId;
  }

  private requireRole(): string {
    const role = this.requestContext.getStore()?.role;
    if (!role) {
      throw new UnauthorizedException('Active school role is required for procurement approval');
    }
    return role;
  }

  private requireRequestId(): string {
    const requestId = this.requestContext.getStore()?.request_id;
    if (!requestId) {
      throw new UnauthorizedException('Request context is required for procurement approval');
    }
    return requestId;
  }

  private requireText(value: string | undefined, fieldName: string): string {
    const normalized = value?.trim() ?? '';

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    return normalized;
  }

  private optionalText(value: string | undefined): string | null {
    const normalized = value?.trim() ?? '';
    return normalized || null;
  }

  private requirePositiveNumber(value: number | undefined, fieldName: string): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      throw new BadRequestException(`${fieldName} must be greater than zero`);
    }

    return numeric;
  }

  private requireNonNegativeNumber(value: number | undefined, fieldName: string): number {
    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new BadRequestException(`${fieldName} cannot be negative`);
    }

    return numeric;
  }
}
