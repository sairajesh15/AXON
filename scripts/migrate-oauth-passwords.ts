import dotenv from 'dotenv';
dotenv.config();

import { auth } from '../src/features/authentication/services/auth-service';
import { prisma } from '../src/database';

const TARGET_USERS = [
  "kalyankundheti@gmail.com",
  "kalyanvenkata085@gmail.com",
  "kalyannandu80@gmail.com",
  "shanmukha.17022006@gmail.com",
  "sairajeshdevara8@gmail.com"
];

const TEMPORARY_PASSWORD = "NewPassword123!";

async function main() {
  console.log("Resolving Better-Auth context...");
  const ctx = await auth.$context;
  let createdCount = 0;

  console.log("Starting Better-Auth password credentials linking...");

  for (const email of TARGET_USERS) {
    console.log(`Processing user: ${email}...`);

    // Find the user using Better-Auth's internal adapter
    const result = await ctx.internalAdapter.findUserByEmail(email);
    if (!result || !result.user) {
      console.log(`⚠️ User with email ${email} not found. Skipping.`);
      continue;
    }

    const { user, accounts } = result;

    // Check if the user already has a credential account linked
    const existingCredentialAccount = accounts.find(acc => acc.providerId === "credential");

    // Hash the password using Better-Auth's internal hasher service
    const hashedPassword = await ctx.password.hash(TEMPORARY_PASSWORD);

    try {
      if (existingCredentialAccount) {
        // Update existing password credential using internalAdapter
        await ctx.internalAdapter.updateAccount({
          accountId: existingCredentialAccount.accountId,
          providerId: "credential",
          data: {
            password: hashedPassword
          }
        });
        console.log(`✅ Updated existing credential password for: ${email}`);
      } else {
        // Link a new credential account using Better-Auth's internalAdapter
        const account = await ctx.internalAdapter.createAccount({
          accountId: user.id,
          providerId: "credential",
          userId: user.id,
          password: hashedPassword
        });
        console.log(`✅ Created and linked new credential account for: ${email} (Account ID: ${account.id})`);
        createdCount++;
      }
    } catch (err) {
      console.error(`❌ Failed to link credential account for ${email}:`, err);
    }
  }

  console.log("\nMigration completed!");
  console.log(`Total new credential accounts created: ${createdCount}`);

  // Query database to verify accounts table entries for these users
  console.log("\n--- Verification Results ---");
  const verificationUsers = await prisma.user.findMany({
    where: {
      email: {
        in: TARGET_USERS
      }
    },
    include: {
      accounts: {
        select: {
          providerId: true,
          password: true
        }
      }
    }
  });

  for (const vu of verificationUsers) {
    const providers = vu.accounts.map(a => `${a.providerId} (hasPassword: ${a.password !== null})`).join(", ");
    console.log(`User: ${vu.email} | Accounts: [ ${providers} ]`);
  }
  console.log("----------------------------");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
