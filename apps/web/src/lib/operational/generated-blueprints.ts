import { type ExtremeErpBlueprint, type OperationalState, type OperationalQueue, type OperationalFormBlueprint, type OperationalTableBlueprint } from "./extreme-erp-blueprints";

export const generatedBlueprintRegistry: ExtremeErpBlueprint[] = [
  {
    "id": "student-exit-passes",
    "title": "Student Exit Passes",
    "commandQuestion": "What would you like to do in Student Exit Passes?",
    "roleFocus": "Standard Student Exit Passes operations",
    "urgentActions": [
      "Verify Pass",
      "Approve Gate Exit if permitted",
      "Deny Exit",
      "Notify Deputy",
      "Print Exit Log"
    ],
    "queues": [],
    "tables": [
      {
        "id": "student-exit-passes-table-0",
        "title": "Table",
        "columns": [
          "Student",
          "Class",
          "Reason",
          "Approved by",
          "Time out",
          "Expected return",
          "Status",
          "",
          ""
        ],
        "rowActions": [
          "View",
          "Edit",
          "View Audit"
        ],
        "bulkActions": [
          "Export Excel",
          "Archive Selected"
        ]
      }
    ],
    "forms": [],
    "printOutputs": [],
    "sampleData": [
      "Active",
      "Pending",
      "Resolved"
    ],
    "states": [
      "LOADING",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOCKED"
    ]
  },
  {
    "id": "routes",
    "title": "Routes",
    "commandQuestion": "What would you like to do in Routes?",
    "roleFocus": "Standard Routes operations",
    "urgentActions": [
      "Add Route",
      "Add Stop",
      "Assign Vehicle",
      "Assign Driver",
      "Export Routes"
    ],
    "queues": [],
    "tables": [
      {
        "id": "routes-table-0",
        "title": "Table",
        "columns": [
          "Route",
          "Stops",
          "Vehicle",
          "Driver",
          "Students",
          "Status",
          "Actions",
          ""
        ],
        "rowActions": [
          "View",
          "Edit",
          "View Audit"
        ],
        "bulkActions": [
          "Export Excel",
          "Archive Selected"
        ]
      }
    ],
    "forms": [],
    "printOutputs": [],
    "sampleData": [
      "Active",
      "Pending",
      "Resolved"
    ],
    "states": [
      "LOADING",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOCKED"
    ]
  },
  {
    "id": "vehicles",
    "title": "Vehicles",
    "commandQuestion": "What would you like to do in Vehicles?",
    "roleFocus": "Standard Vehicles operations",
    "urgentActions": [
      "Add Vehicle",
      "Update Insurance",
      "Update Service Date",
      "Mark Under Maintenance",
      "Export Vehicle List",
      ""
    ],
    "queues": [],
    "tables": [],
    "forms": [],
    "printOutputs": [],
    "sampleData": [
      "Active",
      "Pending",
      "Resolved"
    ],
    "states": [
      "LOADING",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOCKED"
    ]
  },
  {
    "id": "student-transport-list",
    "title": "Student Transport List",
    "commandQuestion": "What would you like to do in Student Transport List?",
    "roleFocus": "Standard Student Transport List operations",
    "urgentActions": [
      "Add Student to Route",
      "Remove Student",
      "Change Stop",
      "Notify Parent",
      "Download Bus List",
      "",
      ""
    ],
    "queues": [],
    "tables": [],
    "forms": [],
    "printOutputs": [],
    "sampleData": [
      "Active",
      "Pending",
      "Resolved"
    ],
    "states": [
      "LOADING",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOCKED"
    ]
  },
  {
    "id": "lab-inventory",
    "title": "Lab Inventory",
    "commandQuestion": "What would you like to do in Lab Inventory?",
    "roleFocus": "Standard Lab Inventory operations",
    "urgentActions": [
      "Add Apparatus",
      "Add Chemical",
      "Update Stock",
      "Mark Damaged",
      "Mark Missing",
      "Export Inventory"
    ],
    "queues": [],
    "tables": [
      {
        "id": "lab-inventory-table-0",
        "title": "Table",
        "columns": [
          "Item",
          "Category",
          "Quantity",
          "Condition",
          "Location",
          "Status",
          "Actions",
          ""
        ],
        "rowActions": [
          "View",
          "Edit",
          "View Audit"
        ],
        "bulkActions": [
          "Export Excel",
          "Archive Selected"
        ]
      }
    ],
    "forms": [],
    "printOutputs": [],
    "sampleData": [
      "Active",
      "Pending",
      "Resolved"
    ],
    "states": [
      "LOADING",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOCKED"
    ]
  },
  {
    "id": "apparatus-issue",
    "title": "Apparatus Issue",
    "commandQuestion": "What would you like to do in Apparatus Issue?",
    "roleFocus": "Standard Apparatus Issue operations",
    "urgentActions": [
      "Issue Apparatus",
      "Return Apparatus",
      "Mark Broken",
      "Print Issue Slip"
    ],
    "queues": [],
    "tables": [],
    "forms": [
      {
        "id": "apparatus-issue-form-0",
        "title": "Form",
        "purpose": "Standard data entry form",
        "fields": [
          "Teacher",
          "Class",
          "Practical",
          "Items",
          "Quantity",
          "Condition out/in",
          ""
        ],
        "footerActions": [
          "Cancel",
          "Save Draft",
          "Submit"
        ],
        "auditAction": "FORM_SUBMITTED"
      }
    ],
    "printOutputs": [],
    "sampleData": [
      "Active",
      "Pending",
      "Resolved"
    ],
    "states": [
      "LOADING",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOCKED"
    ]
  },
  {
    "id": "chemicals",
    "title": "Chemicals",
    "commandQuestion": "What would you like to do in Chemicals?",
    "roleFocus": "Standard Chemicals operations",
    "urgentActions": [
      "Add Chemical",
      "Update Quantity",
      "Mark Expired",
      "Print Chemical Regis"
    ],
    "queues": [],
    "tables": [],
    "forms": [],
    "printOutputs": [],
    "sampleData": [
      "Active",
      "Pending",
      "Resolved"
    ],
    "states": [
      "LOADING",
      "EMPTY",
      "DEGRADED",
      "FAILED",
      "LOCKED"
    ]
  }
] as any;
