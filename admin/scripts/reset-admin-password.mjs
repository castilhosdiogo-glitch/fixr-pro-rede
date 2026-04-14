// Reseta a senha de um usuário admin via service_role.
// Uso: node scripts/reset-admin-password.mjs email@exemplo.com NovaSenha123
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const [, , emailArg, passwordArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error("Uso: node scripts/reset-admin-password.mjs email@exemplo.com NovaSenha123");
  process.exit(1);
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 200 });
if (listError) {
  console.error("Erro ao listar usuários:", listError.message);
  process.exit(1);
}

const user = list.users.find((u) => u.email === emailArg);
if (!user) {
  console.error(`Usuário ${emailArg} não encontrado.`);
  process.exit(1);
}

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  password: passwordArg,
  email_confirm: true,
});

if (updateError) {
  console.error("Erro ao atualizar senha:", updateError.message);
  process.exit(1);
}

console.log(`Senha de ${emailArg} atualizada com sucesso.`);
console.log(`ID: ${user.id}`);
