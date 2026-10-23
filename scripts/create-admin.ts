// Creates an administrator account. This is the ONLY way to create one: there is no public sign-up.
//
//   Interactive:      npm run admin:create
//   Non-interactive:  ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... npm run admin:create
//   Staff account:    npm run admin:create -- --role=staff
//   Reset password:   npm run admin:create -- --reset-password
//
// Run it on the server (or any machine that has the production DATABASE_URL). Never commit passwords.
import "dotenv/config";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { BCRYPT_COST, validatePasswordStrength } from "../src/lib/credentials";

const args = process.argv.slice(2);
const role = args.includes("--role=staff") ? "STAFF" : "OWNER";
const resetPassword = args.includes("--reset-password");

function ask(question: string, { hidden = false } = {}): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      // Mute echo of typed characters.
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

  try {
    const email = (process.env.ADMIN_EMAIL || (await ask("Admin email: "))).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That does not look like a valid email address.");

    const existing = await db.adminUser.findUnique({ where: { email } });
    if (existing && !resetPassword) {
      throw new Error(`An admin with ${email} already exists. Use --reset-password to change their password.`);
    }
    if (!existing && resetPassword) throw new Error(`No admin with ${email} exists.`);

    let name = existing?.name ?? process.env.ADMIN_NAME ?? "";
    if (!name) name = await ask("Full name: ");
    if (!name) throw new Error("A name is required.");

    let password = process.env.ADMIN_PASSWORD ?? "";
    if (!password) {
      password = await ask("Password (min 12 characters, letters and numbers): ", { hidden: true });
      const confirm = await ask("Repeat password: ", { hidden: true });
      if (password !== confirm) throw new Error("Passwords did not match.");
    }
    const problem = validatePasswordStrength(password);
    if (problem) throw new Error(`Weak password. ${problem}`);

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    if (existing) {
      await db.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null, isActive: true },
      });
      await db.auditLog.create({ data: { adminUserId: existing.id, action: "admin.password_reset", entity: "AdminUser", entityId: existing.id, details: { via: "cli" } } });
      console.log(`Password updated for ${email}.`);
    } else {
      const created = await db.adminUser.create({ data: { email, name, passwordHash, role } });
      await db.auditLog.create({ data: { adminUserId: created.id, action: "admin.created", entity: "AdminUser", entityId: created.id, details: { via: "cli", role } } });
      console.log(`Created ${role === "OWNER" ? "owner" : "staff"} account for ${email}. Sign in at /admin/login.`);
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(`\nError: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
