# Cristais de Éter: desenho da compra com dinheiro real

Documento de **desenho**, sem código. Serve para o Felipe decidir e, depois, para quem for implementar.
Escrito em 2026-09-25 (v0.8.117). Nada aqui foi validado por advogado ou contador: os pontos legais são
uma lista do que checar, não parecer.

## 1. Onde estamos

Os Cristais de Éter existem desde a v0.8.115, mas **só se ganham jogando** (desafio diário 2, semanal 15,
capítulo da história 5) e **não há nada para gastá-los**. O saldo é o campo `crystals` do estado da
campanha (`src/store/game.ts`), guardado no `localStorage` e no snapshot da campanha na nuvem.

Isso é aceitável enquanto o cristal não vale dinheiro. **Deixa de ser aceitável no dia em que ele puder ser
comprado**, por três motivos:

1. O save é editável: qualquer jogador cria cristais no console do navegador.
2. O ganho em jogo também é decidido pelo cliente (`claimChallenge` confia no progresso que o cliente
   mandou), então dá para "ganhar" cristais sem jogar.
3. O saldo vive na campanha, não na conta: comprar cristais e depois começar outra campanha perderia o saldo.

Ou seja: **antes da primeira compra, o saldo precisa morar no servidor.**

## 2. Princípios (a serem confirmados pelo Felipe)

- **Só cosmético.** Cristais nunca compram Ataque, Defesa, Vida, Ouro, sucesso de forja, materiais nem
  qualquer vantagem de combate. Regra herdada da auditoria v0.8.84 e escrita em `src/data/crystals.ts`.
- **Sem sorteio pago.** Nada de caixa de loot ou item aleatório comprado com cristais: mesmo cosmético,
  isso cai em regras mais duras (classificação indicativa, proteção do consumidor).
- **Sem troca entre jogadores.** O Negociador (mercado da sala coop) continua só com ouro. Cristal não
  é transferível nem vendável.
- **Ganho em jogo continua existindo**, mas pequeno e limitado por dia no servidor, para não desvalorizar
  quem compra.

## 3. Arquitetura proposta (Supabase, que o jogo já usa)

### 3.1 Carteira por conta, com livro-razão

| Tabela | Campos principais | Quem escreve |
| --- | --- | --- |
| `wallets` | `user_id` (PK), `earned`, `purchased`, `updated_at` | só o servidor |
| `wallet_ledger` | `id`, `user_id`, `kind` (`earn`, `purchase`, `spend`, `refund`, `adjust`), `amount` (+/-), `source`, `idempotency_key` (único), `created_at` | só o servidor, append-only |
| `cosmetics_owned` | `user_id`, `cosmetic_id`, `acquired_at`, `ledger_id` | só o servidor |

- `earned` e `purchased` separados: cristal comprado pode ter regra de reembolso; o ganho em jogo não.
  Ao gastar, consome primeiro o `earned` (mais barato para o estúdio), depois o `purchased`. Decisão do Felipe.
- **RLS:** o cliente só **lê** as próprias linhas. Nenhum `insert/update/delete` direto de cliente.
- O cliente nunca "manda o saldo": ele pergunta ao servidor.

### 3.2 Operações, todas via função no banco (RPC `SECURITY DEFINER`) ou Edge Function

- `claim_earn(source, key)`: credita ganho em jogo. Idempotente pela chave (`challenge:daily_a_20720`,
  `story:prologo`). O servidor **não consegue verificar** que o jogador realmente jogou, então limita o dano:
  teto diário (ex.: 4) e semanal (ex.: 15), e cada capítulo só paga uma vez por conta.
- `spend(cosmetic_id)`: em uma transação, trava a linha da carteira (`SELECT ... FOR UPDATE`), confere o
  saldo e o preço no catálogo do servidor, grava `spend` no livro-razão e insere em `cosmetics_owned`.
  Preço vem do servidor, nunca do cliente.
- `create_checkout(pack_id)` (Edge Function): cria a sessão no provedor de pagamento e devolve a URL.
- `payment_webhook` (Edge Function): recebe o evento do provedor, **valida a assinatura**, é idempotente pelo
  id do evento e só então grava `purchase` no livro-razão. É a única porta de entrada de cristais comprados.
- Reembolso ou chargeback: grava `refund` (negativo). Se o saldo não cobrir, a carteira fica negativa e a
  conta perde acesso aos cosméticos comprados com aquele pagamento, em vez de o servidor "perdoar" a dívida.

### 3.3 Fluxo de compra

1. Jogador logado abre a loja, escolhe um pacote.
2. Cliente chama `create_checkout` e abre a página do provedor (Pix e cartão).
3. Provedor confirma o pagamento e chama o webhook.
4. Servidor credita o livro-razão; o cliente atualiza a carteira (Realtime do Supabase ou polling curto).
5. Recibo por e-mail (o provedor envia; guardar o id da transação).

**A compra exige conta.** Hoje o `AuthGate` já exige login quando o Supabase está configurado. Se o Felipe
aprovar um "modo convidado" (o mockup do Codex trouxe a ideia), convidados **não podem comprar**.

## 4. O que os cristais podem comprar (proposta)

Tudo cosmético e, portanto, **depende de arte nova** (Codex):

- molduras de carta e temas de Acampamento;
- variações de cor dos heróis (skins) e efeitos visuais do Golpe Supremo;
- cenários/tendas do Acampamento;
- temas de interface.

Preços e catálogo ficam numa tabela do servidor (`cosmetics`), não no cliente.

## 5. Provedores de pagamento (a decidir)

| Opção | Pró | Contra |
| --- | --- | --- |
| Stripe (Checkout) | boa documentação, webhooks maduros, Pix no Brasil | taxas e conta Stripe Brasil |
| Mercado Pago | comum no Brasil, Pix nativo | integração e webhooks menos uniformes |
| Pagar.me / outros | foco Brasil | menos exemplos com Supabase |

Recomendação preliminar: Stripe ou Mercado Pago, o que o Felipe já tiver conta ou CNPJ. O que importa é o
provedor ter webhook assinado e suportar Pix.

## 6. Pontos legais e fiscais a validar (não é parecer jurídico)

- **CDC e reembolso:** compra online tem direito de arrependimento em 7 dias; produto digital já consumido
  costuma ter tratamento próprio, mas a política precisa estar clara e visível antes da compra.
- **Tributação e emissão de nota:** venda de moeda virtual precisa de CNPJ e enquadramento fiscal. Falar com
  contador antes de abrir a loja.
- **LGPD:** dados de pagamento ficam no provedor. O jogo guarda só id da transação, valor e conta.
- **Classificação indicativa:** compras dentro do jogo costumam exigir aviso na classificação da loja/site.
- **Menores de idade:** definir idade mínima para comprar e como se confirma; considerar bloquear compra sem
  responsável.
- **Termos de uso e política de privacidade** publicados antes da primeira venda.
- **Sem caixas de sorteio pagas** (princípio da seção 2) evita boa parte do risco regulatório.

## 7. Plano de fases

| Fase | Entrega | Depende de |
| --- | --- | --- |
| A | Migrar `crystals` do estado da campanha para `wallets`/`wallet_ledger` no Supabase, com `claim_earn` e tetos; migração dos saldos locais (ver decisão 6) | decisão 6 |
| B | Catálogo `cosmetics` e RPC `spend`; primeira loja **sem compra**, só com cristais ganhos | arte de cosméticos (Codex) |
| C | `create_checkout` + `payment_webhook` em **modo de teste** do provedor; testes de idempotência e de assinatura | decisões 1 e 2 |
| D | Política de reembolso, termos e revisão fiscal/legal; abrir para um grupo pequeno | validação com contador e advogado |
| E | Produção | fases anteriores |

Testes que não podem faltar: RLS (cliente não escreve nada), webhook repetido não credita duas vezes,
webhook com assinatura inválida é rejeitado, gasto simultâneo não deixa o saldo negativo, reembolso
recalcula a posse dos cosméticos.

## 8. Decisões que dependem do Felipe

1. **Provedor de pagamento** (Stripe, Mercado Pago ou outro) e se já existe CNPJ.
2. **Pacotes e preços** (ex.: 100, 550 e 1200 cristais) e quanto vale um cristal em reais.
3. **O que os cristais compram**: confirma só cosmético? Aceita a proibição de sorteio pago?
4. **Ganho em jogo**: tetos diários/semanais propostos (4 e 15) e se capítulos pagam uma vez por conta.
5. **Gasto**: consumir primeiro o ganho e depois o comprado, ou o contrário?
6. **Migração dos saldos atuais**: zerar tudo, ou creditar o saldo local até um teto (ex.: 50) como cortesia?
7. **Modo convidado**: sim ou não (convidados nunca compram).
8. **Idade mínima e política de reembolso.**

## 9. Esforço estimado (ordem de grandeza)

Fase A e B: médias (banco, RPC, tela da loja e testes). Fase C: média a grande (webhooks e testes de
segurança). Fase D: depende de terceiros (contador e advogado), não de código. A maior parte do prazo real
é decisão e arte, não programação.
