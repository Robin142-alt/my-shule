const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Update NotificationStatus enum
const oldEnumRegex = /enum NotificationStatus\s*\{[\s\S]*?\}/;
const newEnum = `enum NotificationStatus {
  UNREAD
  READ
  ACTION_REQUIRED
  ACTION_TAKEN
  DISMISSED
  EXPIRED
  FAILED
}

enum NotificationDeliveryStatus {
  QUEUED
  SENT
  DELIVERED
  FAILED
  RETRYING
  CANCELLED
}`;

schemaContent = schemaContent.replace(oldEnumRegex, newEnum);

// Remove existing Notification and NotificationTemplate
const notificationTemplateRegex = /model NotificationTemplate\s*\{[\s\S]*?@@map\("notification_templates"\)\s*\}/;
schemaContent = schemaContent.replace(notificationTemplateRegex, '');

const notificationRegex = /model Notification\s*\{[\s\S]*?@@map\("notifications"\)\s*\}/;
schemaContent = schemaContent.replace(notificationRegex, '');

// Clean up any double blank lines left behind
schemaContent = schemaContent.replace(/\n\s*\n\s*\n/g, '\n\n');

// Append new models
const newModels = `
// ==========================================
// 10. Communication & Notifications (Updated)
// ==========================================

model NotificationTemplate {
  id            String              @id @default(uuid())
  schoolId      String              @map("school_id")
  school        School              @relation(fields: [schoolId], references: [id])
  name          String
  code          String
  module        String              @default("SYSTEM")
  eventType     String              @default("GENERAL") @map("event_type")
  channel       NotificationChannel
  subject       String?
  body          String
  variablesJson Json                @map("variables_json")
  status        AssignmentStatus
  createdAt     DateTime            @default(now()) @map("created_at")
  updatedAt     DateTime            @updatedAt @map("updated_at")
  deletedAt     DateTime?           @map("deleted_at")

  @@index([schoolId])
  @@map("notification_templates")
}

model Notification {
  id                  String               @id @default(uuid())
  schoolId            String               @map("school_id")
  school              School               @relation(fields: [schoolId], references: [id])
  actorUserId         String?              @map("actor_user_id")
  targetUserId        String?              @map("target_user_id")
  targetRole          String?              @map("target_role")
  module              String               @default("SYSTEM")
  eventType           String               @default("GENERAL") @map("event_type")
  entityType          String?              @map("entity_type")
  entityId            String?              @map("entity_id")
  channel             NotificationChannel
  title               String
  message             String
  priority            NotificationPriority
  status              NotificationStatus   @default(UNREAD)
  actionUrl           String?              @map("action_url")
  actionLabel         String?              @map("action_label")
  metadataJson        Json?                @map("metadata_json")
  createdAt           DateTime             @default(now()) @map("created_at")
  readAt              DateTime?            @map("read_at")
  dismissedAt         DateTime?            @map("dismissed_at")
  expiresAt           DateTime?            @map("expires_at")
  deliveries          NotificationDelivery[]

  @@index([schoolId])
  @@index([schoolId, targetUserId, status])
  @@index([schoolId, targetRole, status])
  @@index([schoolId, module, status])
  @@map("notifications")
}

model NotificationDelivery {
  id                  String                     @id @default(uuid())
  notificationId      String                     @map("notification_id")
  notification        Notification               @relation(fields: [notificationId], references: [id])
  schoolId            String                     @map("school_id")
  channel             NotificationChannel
  recipient           String
  status              NotificationDeliveryStatus @default(QUEUED)
  provider            String?
  providerMessageId   String?                    @map("provider_message_id")
  errorMessage        String?                    @map("error_message")
  retryCount          Int                        @default(0) @map("retry_count")
  sentAt              DateTime?                  @map("sent_at")
  deliveredAt         DateTime?                  @map("delivered_at")
  failedAt            DateTime?                  @map("failed_at")
  createdAt           DateTime                   @default(now()) @map("created_at")
  updatedAt           DateTime                   @updatedAt @map("updated_at")

  @@index([schoolId])
  @@index([notificationId])
  @@index([status])
  @@map("notification_deliveries")
}

model NotificationPreference {
  id                String              @id @default(uuid())
  schoolId          String              @map("school_id")
  userId            String?             @map("user_id")
  role              String?
  module            String
  eventType         String              @map("event_type")
  channel           NotificationChannel
  enabled           Boolean             @default(true)
  quietHoursEnabled Boolean             @default(false) @map("quiet_hours_enabled")
  createdAt         DateTime            @default(now()) @map("created_at")
  updatedAt         DateTime            @updatedAt @map("updated_at")

  @@index([schoolId])
  @@index([userId])
  @@map("notification_preferences")
}

model NotificationRule {
  id                  String               @id @default(uuid())
  schoolId            String               @map("school_id")
  module              String
  eventType           String               @map("event_type")
  priority            NotificationPriority
  targetRolesJson     Json                 @map("target_roles_json")
  channelsJson        Json                 @map("channels_json")
  escalationJson      Json?                @map("escalation_json")
  dedupeWindowMinutes Int                  @default(0) @map("dedupe_window_minutes")
  isActive            Boolean              @default(true) @map("is_active")
  createdAt           DateTime             @default(now()) @map("created_at")
  updatedAt           DateTime             @updatedAt @map("updated_at")

  @@index([schoolId])
  @@map("notification_rules")
}
`;

schemaContent += newModels;

fs.writeFileSync(schemaPath, schemaContent, 'utf8');
console.log('Schema updated successfully.');
