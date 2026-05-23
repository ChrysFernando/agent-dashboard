-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "defaultLanguage" TEXT NOT NULL,
    "retentionDays" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "NotificationRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "avatarShape" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "personality" TEXT,
    "language" TEXT,
    "greeting" TEXT,
    "rating" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AgentChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    CONSTRAINT "AgentChannel_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KnowledgeBaseDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastWebhookAt" DATETIME
);

-- CreateTable
CREATE TABLE "KnowledgeBaseTag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "knowledgeBaseId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    CONSTRAINT "KnowledgeBaseTag_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBaseDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentKnowledgeBase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentKnowledgeBase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgentKnowledgeBase_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBaseDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "agentId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "direction" TEXT,
    "status" TEXT NOT NULL,
    "outcome" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "responseTimeMs" INTEGER,
    "sentimentScore" REAL,
    "resolution" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Call_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "agentId" TEXT NOT NULL,
    "transcriptId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" DATETIME NOT NULL,
    "threadId" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MessageEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MessageEvent_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "agentId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "callId" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "outcome" TEXT,
    "sentiment" TEXT NOT NULL DEFAULT 'neu',
    "responseTimeMs" INTEGER,
    "sentimentScore" REAL,
    "resolution" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "rawPayloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transcript_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transcript_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranscriptChapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transcriptId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "TranscriptChapter_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranscriptEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transcriptId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "timestampOffsetSec" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    CONSTRAINT "TranscriptEntry_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "agentId" TEXT,
    "callId" TEXT,
    "messageEventId" TEXT,
    "transcriptId" TEXT,
    "knowledgeBaseId" TEXT,
    "payloadJson" TEXT,
    "occurredAt" DATETIME NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentEvent_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentEvent_messageEventId_fkey" FOREIGN KEY ("messageEventId") REFERENCES "MessageEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentEvent_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AgentEvent_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBaseDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingUsageSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "label" TEXT NOT NULL,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "aiMinutes" INTEGER NOT NULL DEFAULT 0,
    "callMinutes" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "transcriptMinutes" INTEGER NOT NULL DEFAULT 0,
    "knowledgeDocumentCount" INTEGER NOT NULL DEFAULT 0,
    "knowledgeUpdateCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BillingUsageSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "usageSnapshotId" TEXT,
    "issuedAt" DATETIME NOT NULL,
    "dueAt" DATETIME NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_usageSnapshotId_fkey" FOREIGN KEY ("usageSnapshotId") REFERENCES "BillingUsageSnapshot" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "lastTestedAt" DATETIME,
    "lastDeliveryAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WebhookEndpointEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    CONSTRAINT "WebhookEndpointEvent_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "endpointId" TEXT NOT NULL,
    "agentEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WebhookDelivery_agentEventId_fkey" FOREIGN KEY ("agentEventId") REFERENCES "AgentEvent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRule_workspaceId_eventType_key" ON "NotificationRule"("workspaceId", "eventType");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_email_key" ON "TeamMember"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_externalId_key" ON "Agent"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_name_key" ON "Agent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AgentChannel_agentId_channel_key" ON "AgentChannel"("agentId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseDocument_externalId_key" ON "KnowledgeBaseDocument"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBaseTag_knowledgeBaseId_value_key" ON "KnowledgeBaseTag"("knowledgeBaseId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "AgentKnowledgeBase_agentId_knowledgeBaseId_key" ON "AgentKnowledgeBase"("agentId", "knowledgeBaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Call_externalId_key" ON "Call"("externalId");

-- CreateIndex
CREATE INDEX "Call_agentId_startedAt_idx" ON "Call"("agentId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MessageEvent_externalId_key" ON "MessageEvent"("externalId");

-- CreateIndex
CREATE INDEX "MessageEvent_agentId_occurredAt_idx" ON "MessageEvent"("agentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_externalId_key" ON "Transcript"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Transcript_callId_key" ON "Transcript"("callId");

-- CreateIndex
CREATE INDEX "Transcript_agentId_startedAt_idx" ON "Transcript"("agentId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptChapter_transcriptId_sortOrder_key" ON "TranscriptChapter"("transcriptId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TranscriptEntry_transcriptId_sortOrder_key" ON "TranscriptEntry"("transcriptId", "sortOrder");

-- CreateIndex
CREATE INDEX "AgentEvent_occurredAt_idx" ON "AgentEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "BillingUsageSnapshot_workspaceId_periodStart_key" ON "BillingUsageSnapshot"("workspaceId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEndpointEvent_endpointId_eventType_key" ON "WebhookEndpointEvent"("endpointId", "eventType");

