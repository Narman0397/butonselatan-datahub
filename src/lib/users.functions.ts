import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Role = "admin" | "wali_data" | "produsen";
type Input = { email: string; password: string; full_name: string; organization_id: string | null; roles: Role[] };

export const createPortalUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Input) => {
    const email = String(d.email ?? "").trim().toLowerCase();
    const full_name = String(d.full_name ?? "").trim().slice(0, 120);
    const password = String(d.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email tidak valid");
    if (password.length < 8) throw new Error("Kata sandi minimal 8 karakter");
    if (!full_name) throw new Error("Nama wajib diisi");
    const roles = (Array.isArray(d.roles) ? d.roles : []).filter((r): r is Role => ["admin", "wali_data", "produsen"].includes(r));
    return { email, password, full_name, organization_id: d.organization_id || null, roles };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Hanya Super Admin yang dapat menambah pengguna");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) {
      const msg = error?.message ?? "";
      throw new Error(/already|registered|exists/i.test(msg) ? "Email sudah terdaftar" : "Gagal membuat akun");
    }
    const uid = created.user.id;
    await supabaseAdmin.from("profiles").upsert({ id: uid, email: data.email, full_name: data.full_name, organization_id: data.organization_id });
    if (data.roles.length) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      await supabaseAdmin.from("user_roles").insert(data.roles.map((role) => ({ user_id: uid, role })));
    }
    return { id: uid };
  });
