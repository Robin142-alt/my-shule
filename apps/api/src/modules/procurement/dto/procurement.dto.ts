export interface CreateProcurementSupplierDto {
  name: string;
  category?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  kra_pin?: string;
}

export interface ProcurementRequestItemDto {
  item_name: string;
  quantity: number;
  estimated_unit_cost_minor: number;
  budget_code?: string;
}

export interface CreateProcurementRequestDto {
  title: string;
  department: string;
  budget_code?: string;
  justification?: string;
  needed_by?: string;
  items: ProcurementRequestItemDto[];
}

export interface RecordProcurementApprovalDto {
  decision: 'approved' | 'rejected' | 'returned';
  reason?: string;
}

export interface PurchaseOrderItemDto {
  item_name: string;
  quantity: number;
  unit_cost_minor: number;
}

export interface CreatePurchaseOrderDto {
  supplier_id: string;
  request_id?: string;
  expected_delivery_date?: string;
  notes?: string;
  items: PurchaseOrderItemDto[];
}

export interface AttachSupplierInvoiceDto {
  invoice_number: string;
  amount_minor: number;
  invoice_date?: string;
  file_url?: string;
  notes?: string;
}
