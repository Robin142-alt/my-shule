"use client";

import { SmartBarcodeWorkspace, SmartCatalogue, SmartCirculation, SmartBorrowerRecords, SmartInventory } from "@/components/library/smart-library-workspaces";

export { SmartOverview, SmartScanBook, SmartStocktake, SmartScannerSettings } from "@/components/library/smart-library-workspaces";

export function CatalogueWorkspace() { return <SmartCatalogue />; }
export function RegisterBooksWorkspace() { return <SmartCatalogue registration />; }
export function IssueBooksWorkspace() { return <SmartCirculation mode="issue" />; }
export function ReturnBooksWorkspace() { return <SmartCirculation mode="return" />; }
export function BarcodePrintingWorkspace() { return <SmartBarcodeWorkspace />; }
export function BarcodeManagementWorkspace() { return <SmartBarcodeWorkspace management />; }
export function BorrowerRecordsWorkspace() { return <SmartBorrowerRecords />; }
export function LoansWorkspace() { return <SmartBorrowerRecords loansOnly />; }
export function InventoryWorkspace() { return <SmartInventory />; }
export function LostDamagedWorkspace() { return <SmartInventory incidents />; }
