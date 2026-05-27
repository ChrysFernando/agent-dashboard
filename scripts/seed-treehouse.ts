import { AgentStatus, AgentType, Channel, WorkspaceStatus } from "@prisma/client";

import { prisma } from "../src/lib/prisma.js";

const WORKSPACE_ID = "ws_treehouse";
const WORKSPACE_SLUG = "treehouse";
const WORKSPACE_NAME = "Treehouse";

const AGENT_ID = "agt_kavya_treehouse";
const AGENT_NAME = "Kavya (Treehouse)";

async function main() {
  const workspace = await prisma.workspace.upsert({
    where: { id: WORKSPACE_ID },
    update: {
      name: WORKSPACE_NAME,
      slug: WORKSPACE_SLUG,
      status: WorkspaceStatus.active,
    },
    create: {
      id: WORKSPACE_ID,
      name: WORKSPACE_NAME,
      slug: WORKSPACE_SLUG,
      timezone: "Asia/Colombo (UTC+05:30)",
      defaultLanguage: "English (US)",
      status: WorkspaceStatus.active,
      monthlyBudgetCents: 250_000,
    },
  });

  const agent = await prisma.agent.upsert({
    where: { id: AGENT_ID },
    update: {
      workspaceId: workspace.id,
      name: AGENT_NAME,
      type: AgentType.booking,
      status: AgentStatus.live,
      language: "English (US)",
    },
    create: {
      id: AGENT_ID,
      workspaceId: workspace.id,
      name: AGENT_NAME,
      type: AgentType.booking,
      status: AgentStatus.live,
      language: "English (US)",
      personality: "Friendly, warm, professional booking concierge for Treehouse.",
    },
  });

  await prisma.agentChannel.upsert({
    where: {
      agentId_channel: { agentId: agent.id, channel: Channel.voice },
    },
    update: {},
    create: { agentId: agent.id, channel: Channel.voice },
  });

  console.log("Seeded Treehouse client + Kavya agent:");
  console.log(`  workspace : ${workspace.id} (slug=${workspace.slug})`);
  console.log(`  agent     : ${agent.id} (${agent.name}, type=${agent.type}, channel=voice)`);
  console.log("");
  console.log("Set these on the DO droplet (docker compose env):");
  console.log("  DASHBOARD_API_URL=https://<your-vercel-domain>/api/webhooks/agent-events");
  console.log("  DASHBOARD_API_KEY=<same value as INBOUND_WEBHOOK_SECRET in Vercel>");
  console.log(`  DASHBOARD_AGENT_ID=${agent.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
