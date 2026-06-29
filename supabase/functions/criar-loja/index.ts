// ============================================================================
// Edge Function: criar-loja
// Registra um novo tenant (loja) no SaaS. Cria o usuário de auth (service role),
// a loja, o vínculo de membro (owner), a assinatura no plano Free, as
// configurações iniciais e a linha de credenciais do tenant.
//
// Injetados pelo Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-tenant-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DEFAULT_HOURS = {
  seg: { enabled: true, open: '09:00', close: '18:00' },
  ter: { enabled: true, open: '09:00', close: '18:00' },
  qua: { enabled: true, open: '09:00', close: '18:00' },
  qui: { enabled: true, open: '09:00', close: '18:00' },
  sex: { enabled: true, open: '09:00', close: '18:00' },
  sab: { enabled: true, open: '09:00', close: '13:00' },
  dom: { enabled: false, open: '09:00', close: '13:00' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { store_name, store_slug, email, password } = await req.json();

    if (!store_name || !store_slug || !email || !password) {
      return json({ error: 'Todos os campos são obrigatórios.' }, 400);
    }
    if (!/^[a-z0-9-]+$/.test(store_slug)) {
      return json({ error: 'Slug inválido.' }, 400);
    }
    if (String(password).length < 6) {
      return json({ error: 'A senha deve ter ao menos 6 caracteres.' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Slug disponível?
    const { data: existing, error: slugErr } = await supabase
      .from('stores')
      .select('id')
      .eq('slug', store_slug)
      .limit(1)
      .maybeSingle();
    if (slugErr) throw slugErr;
    if (existing) {
      return json({ error: 'Slug já em uso.' }, 409);
    }

    // Cria o usuário de auth (e-mail já confirmado).
    const { data: created, error: userErr } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (userErr) {
      if (/already registered/i.test(userErr.message)) {
        return json({ error: 'E-mail já cadastrado.' }, 409);
      }
      throw userErr;
    }
    const user = created.user;
    if (!user) throw new Error('Falha ao criar usuário.');

    // Cria a loja.
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .insert({
        name: store_name,
        slug: store_slug,
        status: 'active',
        owner_id: user.id,
      })
      .select('id')
      .single();
    if (storeErr) throw storeErr;
    const storeId = store.id;

    // Vincula o usuário como owner.
    const { error: memberErr } = await supabase.from('store_members').insert({
      store_id: storeId,
      user_id: user.id,
      role: 'owner',
    });
    if (memberErr) throw memberErr;

    // Promove o perfil para admin (acesso ao painel da loja).
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', user.id);
    if (profileErr) throw profileErr;

    // Assinatura no plano Free.
    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('id')
      .eq('slug', 'free')
      .limit(1)
      .maybeSingle();
    if (planErr) throw planErr;
    if (plan) {
      const { error: subErr } = await supabase
        .from('store_subscriptions')
        .insert({
          store_id: storeId,
          plan_id: plan.id,
          status: 'active',
        });
      if (subErr) throw subErr;
    }

    // Configurações iniciais da loja.
    const { error: settingsErr } = await supabase
      .from('store_settings')
      .insert({
        store_id: storeId,
        data: {
          store: {
            name: store_name,
            tagline: '',
            instagram_url: '',
            whatsapp_url: '',
            onboarding_done: false,
          },
          hours: DEFAULT_HOURS,
          shipping: { free_threshold: 0, default_fee: 0 },
          pages: {
            sobre: { title: '', subtitle: '', body: '' },
            contato: { title: '', subtitle: '', body: '' },
            envios: { title: '', subtitle: '', body: '' },
            trocas: { title: '', subtitle: '', body: '' },
          },
        },
      });
    if (settingsErr) throw settingsErr;

    // Linha de credenciais do tenant (vazia).
    const { error: credsErr } = await supabase
      .from('tenant_credentials')
      .insert({ store_id: storeId });
    if (credsErr) throw credsErr;

    return json({ ok: true, store_id: storeId, store_slug });
  } catch (err) {
    console.error('criar-loja:', err);
    return json({ error: (err as Error).message ?? 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
