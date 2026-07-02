// ============================================================================
// Edge Function: funcionarios
// Cria um funcionário (admin/staff) vinculado a uma loja existente. Só o
// dono (owner) da loja pode chamar. Usa service role para criar o usuário
// de auth — não altera profiles.role (acesso ao painel é via store_members).
//
// Injetados pelo Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { store_id, email, password, nome, role } = await req.json();

    if (!store_id || !email || !password || !nome || !role) {
      return json({ error: 'Todos os campos são obrigatórios.' }, 400);
    }
    if (!['admin', 'staff'].includes(role)) {
      return json({ error: 'Papel inválido.' }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: 'A senha deve ter ao menos 6 caracteres.' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Não autenticado.' }, 401);
    }

    // Client "de usuário": identifica quem está chamando e verifica permissão
    // reaproveitando a função SQL is_store_owner (mesma regra do RLS).
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: caller, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !caller.user) {
      return json({ error: 'Não autenticado.' }, 401);
    }

    const { data: isOwner, error: ownerErr } = await userClient.rpc(
      'is_store_owner',
      { p_store_id: store_id }
    );
    if (ownerErr) throw ownerErr;
    if (!isOwner) {
      return json(
        { error: 'Apenas o dono da loja pode gerenciar a equipe.' },
        403
      );
    }

    // Client com service role: única forma de criar um usuário de auth.
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: created, error: userErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (userErr) {
      if (/already registered/i.test(userErr.message)) {
        return json({ error: 'E-mail já cadastrado.' }, 409);
      }
      throw userErr;
    }
    const user = created.user;
    if (!user) throw new Error('Falha ao criar usuário.');

    const { data: member, error: memberErr } = await admin
      .from('store_members')
      .insert({ store_id, user_id: user.id, role })
      .select('id')
      .single();
    if (memberErr) throw memberErr;

    return json({ ok: true, user_id: user.id, member_id: member.id });
  } catch (err) {
    console.error('funcionarios:', err);
    return json({ error: (err as Error).message ?? 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
