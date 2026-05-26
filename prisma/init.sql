-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('sales', 'support', 'booking', 'coldcall');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('live', 'paused', 'idle');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('voice', 'whatsapp');

-- CreateEnum
CREATE TYPE "KnowledgeBaseType" AS ENUM ('faq', 'script', 'product_info', 'objection_handling', 'pricing');

-- CreateEnum
CREATE TYPE "TranscriptSentiment" AS ENUM ('pos', 'neu', 'neg');

-- CreateEnum
CREATE TYPE "TranscriptSpeaker" AS ENUM ('agent', 'user', 'system');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('call_completed', 'agent_error', 'spend_threshold');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('owner', 'admin', 'viewer');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('pending', 'success', 'failed');

-- CreateEnum
CREATE TYPE "WorkspaceStatus" AS ENUM ('trial', 'active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'support', 'billing', 'read_only');

-- CreateEnum
CREATE TYPE "AnnouncementSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('all', 'trial', 'active', 'suspended', 'custom');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('open', 'pending', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "SessionSubject" AS ENUM ('admin', 'team');

-- CreateEnum
CREATE TYPE "ServiceHealthStatus" AS ENUM ('operational', 'degraded', 'outage', 'maintenance');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('minor', 'major', 'critical');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('ongoing', 'monitoring', 'resolved');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyFeeCents" INTEGER NOT NULL DEFAULT 0,
    "includedVoiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "includedAiMinutes" INTEGER NOT NULL DEFAULT 0,
    "includedMessages" INTEGER NOT NULL DEFAULT 0,
    "maxAgents" INTEGER,
    "maxKnowledgeDocuments" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "templateModel" TEXT,
    "templateVoice" TEXT,
    "templateChannel" TEXT,
    "voiceCostPerMinute" DOUBLE PRECISION,
    "aiCostPerMessage" DOUBLE PRECISION,
    "callCostPerMinute" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "timezone" TEXT NOT NULL,
    "country" TEXT,
    "defaultLanguage" TEXT NOT NULL,
    "retentionDays" INTEGER,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'active',
    "monthlyBudgetCents" INTEGER NOT NULL DEFAULT 0,
    "trialEndsAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "planId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRule" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "eventType" "NotificationEventType" NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "webhookEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL,
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "avatarShape" TEXT,
    "status" "AgentStatus" NOT NULL DEFAULT 'idle',
    "personality" TEXT,
    "language" TEXT,
    "greeting" TEXT,
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentChannel" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,

    CONSTRAINT "AgentChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseDocument" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "type" "KnowledgeBaseType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastWebhookAt" TIMESTAMP(3),

    CONSTRAINT "KnowledgeBaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeBaseTag" (
    "id" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "KnowledgeBaseTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentKnowledgeBase" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "knowledgeBaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentKnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Call" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "externalId" TEXT,
    "agentId" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "direction" TEXT,
    "status" TEXT NOT NULL,
    "outcome" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "responseTimeMs" INTEGER,
    "sentimentScore" DOUBLE PRECISION,
    "resolution" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "externalId" TEXT,
    "agentId" TEXT NOT NULL,
    "transcriptId" TEXT,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "threadId" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcript" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "externalId" TEXT,
    "agentId" TEXT NOT NULL,
    "channel" "Channel" NOT NULL,
    "contact" TEXT NOT NULL,
    "callId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "outcome" TEXT,
    "sentiment" "TranscriptSentiment" NOT NULL DEFAULT 'neu',
    "responseTimeMs" INTEGER,
    "sentimentScore" DOUBLE PRECISION,
    "resolution" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT,
    "rawPayloadJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptChapter" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TranscriptChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranscriptEntry" (
    "id" TEXT NOT NULL,
    "transcriptId" TEXT NOT NULL,
    "speaker" "TranscriptSpeaker" NOT NULL,
    "timestampOffsetSec" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "TranscriptEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "eventType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "agentId" TEXT,
    "callId" TEXT,
    "messageEventId" TEXT,
    "transcriptId" TEXT,
    "knowledgeBaseId" TEXT,
    "payloadJson" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingUsageSnapshot" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "voiceMinutes" INTEGER NOT NULL DEFAULT 0,
    "aiMinutes" INTEGER NOT NULL DEFAULT 0,
    "callMinutes" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "transcriptMinutes" INTEGER NOT NULL DEFAULT 0,
    "knowledgeDocumentCount" INTEGER NOT NULL DEFAULT 0,
    "knowledgeUpdateCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingUsageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "usageSnapshotId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastDeliveryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpointEvent" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,

    CONSTRAINT "WebhookEndpointEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "agentEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "key" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'support',
    "initials" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#7b61ff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "severity" "AnnouncementSeverity" NOT NULL DEFAULT 'info',
    "audience" "AnnouncementAudience" NOT NULL DEFAULT 'all',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnouncementTarget" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "AnnouncementTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientApiKey" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hashedSecret" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'read,write',
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'open',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'normal',
    "openedBy" TEXT,
    "assignedTo" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL DEFAULT 'client',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "subjectType" "SessionSubject" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ServiceHealthStatus" NOT NULL DEFAULT 'operational',
    "uptimePercent" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "lastIncidentAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'minor',
    "durationMinutes" INTEGER,
    "status" "IncidentStatus" NOT NULL DEFAULT 'ongoing',
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrrMovement" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MrrMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

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

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminAuditLog_occurredAt_idx" ON "AdminAuditLog"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnnouncementTarget_announcementId_workspaceId_key" ON "AnnouncementTarget"("announcementId", "workspaceId");

-- CreateIndex
CREATE INDEX "ClientApiKey_workspaceId_idx" ON "ClientApiKey"("workspaceId");

-- CreateIndex
CREATE INDEX "SupportTicket_workspaceId_status_idx" ON "SupportTicket"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Session_subjectType_subjectId_idx" ON "Session"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceStatus_name_key" ON "ServiceStatus"("name");

-- CreateIndex
CREATE INDEX "Incident_occurredAt_idx" ON "Incident"("occurredAt");

-- CreateIndex
CREATE INDEX "MrrMovement_periodStart_idx" ON "MrrMovement"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "MrrMovement_periodStart_kind_key" ON "MrrMovement"("periodStart", "kind");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentChannel" ADD CONSTRAINT "AgentChannel_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseDocument" ADD CONSTRAINT "KnowledgeBaseDocument_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeBaseTag" ADD CONSTRAINT "KnowledgeBaseTag_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBaseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledgeBase" ADD CONSTRAINT "AgentKnowledgeBase_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentKnowledgeBase" ADD CONSTRAINT "AgentKnowledgeBase_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBaseDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEvent" ADD CONSTRAINT "MessageEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEvent" ADD CONSTRAINT "MessageEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEvent" ADD CONSTRAINT "MessageEvent_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcript" ADD CONSTRAINT "Transcript_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptChapter" ADD CONSTRAINT "TranscriptChapter_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranscriptEntry" ADD CONSTRAINT "TranscriptEntry_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_messageEventId_fkey" FOREIGN KEY ("messageEventId") REFERENCES "MessageEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "Transcript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentEvent" ADD CONSTRAINT "AgentEvent_knowledgeBaseId_fkey" FOREIGN KEY ("knowledgeBaseId") REFERENCES "KnowledgeBaseDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingUsageSnapshot" ADD CONSTRAINT "BillingUsageSnapshot_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_usageSnapshotId_fkey" FOREIGN KEY ("usageSnapshotId") REFERENCES "BillingUsageSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpointEvent" ADD CONSTRAINT "WebhookEndpointEvent_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_agentEventId_fkey" FOREIGN KEY ("agentEventId") REFERENCES "AgentEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnouncementTarget" ADD CONSTRAINT "AnnouncementTarget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientApiKey" ADD CONSTRAINT "ClientApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ServiceStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

