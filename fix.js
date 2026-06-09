const fs = require('fs');
let invController = fs.readFileSync('apps/api/src/modules/inventory/inventory.controller.ts', 'utf8');

invController = invController.replace(
  "createRequest(@Body() dto: CreateInventoryRequestDto) {\n    return this.inventoryService.createRequisition(dto);\n  }",
  "createRequest(@Body() dto: CreateInventoryRequestDto) {\n    return this.inventoryService.createRequest(dto);\n  }"
);

invController = invController.replace(
  "createRequisition(@Body() dto: CreateInventoryRequestDto) {\n    return this.inventoryService.createRequest(dto);\n  }",
  "createRequisition(@Body() dto: CreateInventoryRequestDto) {\n    return this.inventoryService.createRequisition(dto);\n  }"
);

fs.writeFileSync('apps/api/src/modules/inventory/inventory.controller.ts', invController);
