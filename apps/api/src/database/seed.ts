/**
 * Optional demo seed.
 *
 * Requires the Keycloak demo user to have signed in at least once
 * (so `users` has email demo@example.com from /me sync).
 *
 * Usage (from repo root):
 *   pnpm --filter @web-note/api db:seed
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_WORKSPACE = 'Demo Workspace';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, DEMO_EMAIL),
  });

  if (!user) {
    console.error(
      `No user with email ${DEMO_EMAIL}. Sign in once via the web app (demo/demo), then re-run seed.`,
    );
    await client.end();
    process.exit(1);
  }

  const existing = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .innerJoin(
      schema.workspaceMembers,
      eq(schema.workspaceMembers.workspaceId, schema.workspaces.id),
    )
    .where(eq(schema.workspaces.name, DEMO_WORKSPACE))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Demo workspace already exists: ${existing[0].id}`);
    await client.end();
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(schema.workspaces)
      .values({
        name: DEMO_WORKSPACE,
        createdBy: user.id,
      })
      .returning();

    await tx.insert(schema.workspaceMembers).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    });

    const [folder] = await tx
      .insert(schema.folders)
      .values({
        workspaceId: workspace.id,
        name: 'Getting started',
        parentId: null,
      })
      .returning();

    const [document] = await tx
      .insert(schema.documents)
      .values({
        workspaceId: workspace.id,
        folderId: folder.id,
        title: 'Welcome',
        createdBy: user.id,
        status: 'draft',
        isPrivate: false,
      })
      .returning();

    const welcomeContent = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Welcome to Web Note' }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'This demo document was created by the seed script. Edit, publish, and explore versions.',
            },
          ],
        },
      ],
    };

    await tx.insert(schema.documentRevisions).values({
      documentId: document.id,
      content: welcomeContent,
      updatedBy: user.id,
    });

    return { workspace, folder, document };
  });

  console.log('Seeded demo data:');
  console.log(`  workspace: ${result.workspace.id}`);
  console.log(`  folder:    ${result.folder.id}`);
  console.log(`  document:  ${result.document.id}`);

  await client.end();
}

void main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
