import "fastify";
import type { AdminRole, TeamRole } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    adminContext?: {
      adminId: string;
      role: AdminRole;
      impersonateWorkspaceId?: string;
    };
    portalContext?: {
      teamMemberId: string;
      workspaceId: string;
      role: TeamRole;
    };
  }
}
