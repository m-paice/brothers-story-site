-- seed.sql — dados essenciais para reset do banco
-- Pré-requisito: schema.sql + migrations já executados
-- Senha padrão dos usuários de teste: password

-- ============================================================
-- 1. Auth users
-- ============================================================

INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
) VALUES
  (
    'c4bac75e-621f-47f0-85ed-bd10c9453aef',
    'matheus.paice@gmail.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  ),
  (
    'f16629c8-1c00-4043-a685-892ce236850d',
    'eduardo.lopes@brotherstore.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    false, 'authenticated', 'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. Profiles
-- ============================================================

INSERT INTO profiles (id, nome, role) VALUES
  ('c4bac75e-621f-47f0-85ed-bd10c9453aef', 'Matheus Paice', 'superadmin'),
  ('f16629c8-1c00-4043-a685-892ce236850d', 'Eduardo Lopes',  'admin')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. Plans
-- ============================================================

INSERT INTO plans (id, name, slug, price, max_products, max_orders_month, features, is_active) VALUES
  (
    '25bd2b67-c2f8-46db-ae63-98734b9ba142',
    'Free', 'free', 0.00, 50, 100,
    '["dashboard","produtos","pedidos","vendas","configuracoes"]',
    true
  ),
  (
    '68057448-a690-42e3-ab4c-00abfda40260',
    'Pro', 'pro', 97.00, NULL, NULL,
    '["dashboard","produtos","pedidos","vendas","configuracoes","frete_superfrete","pagamento_mercadopago","relatorios","etiquetas"]',
    true
  ),
  (
    '36c05104-3a73-41c8-85a6-4964112f7c6f',
    'Enterprise', 'enterprise', 297.00, NULL, NULL,
    '["dashboard","produtos","pedidos","vendas","configuracoes","frete_superfrete","pagamento_mercadopago","relatorios","etiquetas","dominio_customizado","suporte_prioritario","multiplos_admins"]',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. Store — Brothers Story
-- ============================================================

INSERT INTO stores (id, name, slug, owner_id, status) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Brothers Story',
    'brothers-story',
    'f16629c8-1c00-4043-a685-892ce236850d',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Store members
-- ============================================================

INSERT INTO store_members (store_id, user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'f16629c8-1c00-4043-a685-892ce236850d', 'owner')
ON CONFLICT (store_id, user_id) DO NOTHING;

-- ============================================================
-- 6. Store subscription (plano Free)
-- ============================================================

INSERT INTO store_subscriptions (store_id, plan_id, status) VALUES
  ('00000000-0000-0000-0000-000000000001', '25bd2b67-c2f8-46db-ae63-98734b9ba142', 'active')
ON CONFLICT (store_id) DO NOTHING;

-- ============================================================
-- 7. Store settings
-- ============================================================

INSERT INTO store_settings (store_id, data) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '{
    "store": {
      "name": "Brothers Story",
      "tagline": "Moda masculina feita para durar e vestir bem.",
      "instagram_url": "https://www.instagram.com/brothers_story_modamasculina/",
      "whatsapp_url": "https://wa.me/message/KYXA3T4X6GCWL1",
      "onboarding_done": true
    },
    "shipping": {
      "free_threshold": 500,
      "default_fee": 24.90
    },
    "hours": {
      "seg": {"enabled": true,  "open": "09:00", "close": "18:00"},
      "ter": {"enabled": true,  "open": "09:00", "close": "18:00"},
      "qua": {"enabled": true,  "open": "09:00", "close": "18:00"},
      "qui": {"enabled": true,  "open": "09:00", "close": "18:00"},
      "sex": {"enabled": true,  "open": "09:00", "close": "18:00"},
      "sab": {"enabled": true,  "open": "09:00", "close": "13:00"},
      "dom": {"enabled": false, "open": "09:00", "close": "13:00"}
    },
    "pages": {
      "sobre": {
        "title": "Sobre a Brothers Story",
        "subtitle": "Moda masculina feita para durar e vestir bem.",
        "body": "A Brothers Story nasceu da vontade de oferecer moda masculina com propósito: peças bem construídas, de caimento impecável e que combinam com o dia a dia de quem valoriza estilo sem exagero. Cada item do nosso catálogo é escolhido a dedo, pensando em qualidade, conforto e durabilidade.\n\n## O que nos move\n\nAcreditamos que vestir bem é simples quando as peças certas estão ao seu alcance. Por isso trabalhamos com curadoria enxuta — preferimos poucas peças excelentes a muitas opções sem identidade. Do básico ao statement, tudo é selecionado para compor um guarda-roupa versátil.\n\n## Compromisso com você\n\n- Curadoria de produtos com foco em qualidade e caimento.\n- Atendimento próximo e direto pelo WhatsApp e Instagram.\n- Transparência em preços, prazos e políticas de troca.\n\nTem alguma dúvida ou quer uma recomendação personalizada? Fale com a gente — adoramos ajudar a montar o look certo."
      },
      "contato": {
        "title": "Fale com a gente",
        "subtitle": "Atendimento direto, sem complicação.",
        "body": "Dúvidas sobre tamanhos, disponibilidade, pedidos ou trocas? Nosso atendimento é feito de forma próxima e direta. Escolha o canal de sua preferência.\n\nPreferimos o WhatsApp para tratar de pedidos: assim conseguimos confirmar disponibilidade, combinar o pagamento e acompanhar a entrega com você em tempo real."
      },
      "envios": {
        "title": "Envios",
        "subtitle": "Como e quando o seu pedido chega.",
        "body": "Enviamos para todo o Brasil. Assim que o seu pedido é confirmado pela nossa equipe, ele é preparado e despachado, e você recebe o código de rastreamento para acompanhar a entrega.\n\n## Frete e prazos\n\n- Frete grátis em pedidos a partir de R$ 500,00.\n- Abaixo desse valor, o frete padrão é de R$ 24,90.\n- O prazo de entrega varia conforme a sua região e é informado na confirmação do pedido.\n\n## Como funciona\n\nNesta etapa, o pedido feito no site é uma solicitação: nossa equipe confirma a disponibilidade das peças e combina com você a forma de pagamento e o envio. Só depois da confirmação o produto é separado e postado.\n\n## Acompanhamento\n\nApós o despacho, enviamos o código de rastreamento pelo WhatsApp. Se tiver qualquer dúvida sobre o status da entrega, é só falar com a gente."
      },
      "trocas": {
        "title": "Trocas e devoluções",
        "subtitle": "Comprou e não serviu? A gente resolve.",
        "body": "Queremos que você fique satisfeito com a sua compra. Se a peça não serviu ou você mudou de ideia, é possível trocar ou devolver seguindo as condições abaixo.\n\n## Prazo\n\nVocê tem até 7 dias corridos após o recebimento para solicitar a devolução por arrependimento, conforme o Código de Defesa do Consumidor (art. 49). Para trocas de tamanho, o prazo é de 30 dias a partir do recebimento.\n\n## Condições\n\n- A peça deve estar sem uso, com etiqueta e na embalagem original.\n- Não pode apresentar sinais de uso, lavagem ou cheiro de perfume.\n- Recomendamos guardar a nota e a embalagem até confirmar o caimento.\n\n## Como solicitar\n\nFale com a gente pelo WhatsApp informando o número do pedido e o motivo da troca ou devolução. Nossa equipe orienta o passo a passo e os detalhes do envio."
      }
    }
  }'::jsonb
)
ON CONFLICT (store_id) DO UPDATE SET data = EXCLUDED.data;

-- ============================================================
-- 8. Products
-- ============================================================

INSERT INTO products (id, name, price, original_price, stock, category, description, image, images, is_new, weight, height, width, length, store_id) VALUES
  (1,  'Camiseta Básica Cinza',        385.00, 385.00, 18, 'Peruana',    'Trama técnica ergonômica para máxima mobilidade e regulação térmica.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662442603-986uc3yh2vo.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662442603-986uc3yh2vo.jpg","https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662444278-epv38ieltkd.jpg"]'::jsonb,
   true,  0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (2,  'Short Esportivo Vermelho',     1150.00, 1350.00, 12, 'Casacos',   'Couro de bezerro italiano integral com acabamento fosco profundo.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662445784-qm87l2df5c9.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662445784-qm87l2df5c9.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (3,  'Camiseta Colcci Vermelha',     540.00, 720.00, 9,  'Tênis',      'Solado reforçado com fibra de carbono e cadarço de compressão adaptável.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662448077-hr2co9qkm1c.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662448077-hr2co9qkm1c.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (4,  'Camiseta Diesel Branca',       420.00, 420.00, 2,  'Calças',     'Tecido ripstop repelente à água com configuração modular de 8 bolsos.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662449645-s6snrjcyy3.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662449645-s6snrjcyy3.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (5,  'Camiseta TXC Branca',          260.00, 320.00, 22, 'Acessórios', 'Coleção de anéis e pingente em prata de lei com acabamento à mão.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662451424-i0bawg4y1d.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662451424-i0bawg4y1d.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (6,  'Camiseta Verde Militar',       180.00, 180.00, 41, 'Camisetas',  'Malha de algodão pesada 320g/m² com caimento boxy estruturado.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662452881-f1j0le2ivwi.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662452881-f1j0le2ivwi.jpg"]'::jsonb,
   true,  0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (7,  'Camiseta TXC Caramelo',        590.00, 590.00, 7,  'Jaquetas',   'Jeans selvedge japonês cru que desbota de forma única com o tempo.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662454437-iy0n7jj3dx.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662454437-iy0n7jj3dx.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (8,  'Camiseta Básica Marrom',       336.00, 480.00, 17, 'Acessórios', 'Armação de acetato com lentes polarizadas e ferragens em preto fosco.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662455832-f2tz6h0uaj.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662455832-f2tz6h0uaj.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (9,  'Camiseta Diesel Azul',         460.00, 460.00, 0,  'Calças',     'Alfaiataria em mistura de lã com silhueta afiada e afunilada.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662457362-gf4slg9zmn.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662457362-gf4slg9zmn.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (10, 'Camiseta Colcci Azul',         340.00, 420.00, 11, 'Acessórios', 'Corpo modular em Cordura com compartimentos magnéticos de acesso rápido.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662459050-12i7i59vwfyq.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662459050-12i7i59vwfyq.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (11, 'Camiseta Básica Azul-Marinho',  720.00, 720.00, 5,  'Tricô',      'Cashmere mongol grau A em modelagem de gola careca relaxada.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662460561-t0a5ejzb96i.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662460561-t0a5ejzb96i.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001'),

  (12, 'Camiseta TXC Preta',           540.00, 680.00, 8,  'Calças',     'Construção drapeada assimétrica em tecido técnico fosco.',
   'https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662461905-mugdou6b8x.jpg',
   '["https://bqotguvfiquscfgohgfo.supabase.co/storage/v1/object/public/produtos/1782662461905-mugdou6b8x.jpg"]'::jsonb,
   false, 0.300, 2.0, 11.0, 16.0, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- ============================================================
-- 9. Product variants
-- ============================================================

INSERT INTO product_variants (id, product_id, color, size, stock, store_id) VALUES
  (23, 1,  'Branca', 'M',      9,  '00000000-0000-0000-0000-000000000001'),
  (24, 1,  'Preta',  'G',      4,  '00000000-0000-0000-0000-000000000001'),
  (25, 1,  'Preta',  'M',      5,  '00000000-0000-0000-0000-000000000001'),
  (4,  2,  '',       'Único',  12, '00000000-0000-0000-0000-000000000001'),
  (10, 3,  '',       'Único',  9,  '00000000-0000-0000-0000-000000000001'),
  (8,  4,  '',       'Único',  2,  '00000000-0000-0000-0000-000000000001'),
  (5,  5,  '',       'Único',  21, '00000000-0000-0000-0000-000000000001'),
  (15, 6,  '',       'p',      39, '00000000-0000-0000-0000-000000000001'),
  (16, 6,  '',       'm',      2,  '00000000-0000-0000-0000-000000000001'),
  (12, 7,  '',       'Único',  7,  '00000000-0000-0000-0000-000000000001'),
  (17, 8,  '',       'Único',  15, '00000000-0000-0000-0000-000000000001'),
  (18, 8,  '',       'p',      2,  '00000000-0000-0000-0000-000000000001'),
  (11, 9,  '',       'Único',  0,  '00000000-0000-0000-0000-000000000001'),
  (3,  10, '',       'Único',  11, '00000000-0000-0000-0000-000000000001'),
  (1,  11, '',       'Único',  5,  '00000000-0000-0000-0000-000000000001'),
  (2,  12, '',       'Único',  8,  '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

SELECT setval('product_variants_id_seq', (SELECT MAX(id) FROM product_variants));
