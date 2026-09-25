# Atributos do Campeão, Energia, Armadura e Carta de Campeão (v0.9.0)

Documento de referência do novo modelo de atributos. Todos os números moram em um só lugar,
[`src/data/heroStatProfiles.ts`](../src/data/heroStatProfiles.ts); as fórmulas puras estão em
[`src/store/heroStats.ts`](../src/store/heroStats.ts). Trocar um coeficiente lá muda o jogo inteiro (solo, coop, ficha,
carta e seleção de heróis), porque tudo lê as mesmas funções.

## 1. Modelo

| Atributo | O que faz |
| --- | --- |
| **Força** | Alimenta os ataques físicos. |
| **Magia** | Alimenta ataques mágicos e a potência de curas, escudos, reforços e invocações. |
| **Vigor** | Vida Máxima **e** resistência a elementos e a efeitos negativos (não é só "Vida renomeada"). |
| **Destreza** | Esquiva derivada (com teto e retorno decrescente) e iniciativa. |

Derivados: **Vida Máxima** (vem de Vigor e bônus; a Vida atual é estado de combate), **Energia** (recurso das habilidades
ativas) e **Armadura** (só de equipamentos, gemas e efeitos de equipamento).

### Fórmulas

```
Vida Máxima      = vidaBase da classe + Vigor × 2 + bônus planos (itens, talentos, Vida permanente de poções)
Poder do ataque  = Força (físico) | Magia (mágico) | max(Força, Magia) (híbrido: só o Monge)
Mitigação física = 2 × A / (1 + A / 40)      A = Armadura total; teto 80; nunca invulnerável
Esquiva          = min(0,45, 0,35 × D / (D + 30) + passiva da classe + esquiva forjada)
Resist. elemento = 0,5 × V / (V + 40)  (+ resistência de equipamento, máx. 75%)
Resist. efeitos  = 0,5 × V / (V + 40)
Iniciativa       = min(0,20, 0,004 × Destreza)  (chance extra de agir primeiro no solo)
Potência da hab. = 1 + 0,04 × (atributo de escala − valor inicial da classe), entre 1 e 2
Poder (carta)    = round(10 × (Vida/2 + poder básico + 0,5 × poder secundário + mitigação + 0,25 × Destreza + 0,25 × Energia))
```

Cada ponto de atributo por nível continua sendo 1 (`pontosPorNivel`). O valor da classe cresce sozinho por nível
(`crescimento`, fracionário, usa o piso).

### Energia

- Começa **cheia** em todo combate (solo e coop).
- Regenera **2 por rodada** (`ATTRIBUTE_RULES.energia.regeneracaoPorRodada`), nunca passa do máximo nem fica negativa.
- Cada habilidade ativa tem `custoEnergia` por perfil. Sem Energia suficiente ela fica **bloqueada** (botão desabilitado, o
  auto-combate não a tenta e nada é gasto). O Conjurador paga por fera invocada.
- A barra do **Golpe Supremo** continua separada e não gasta Energia.
- No coop o relógio da regeneração é a rodada da batalha compartilhada.

### Armadura

Vem **só** de equipamentos, gemas (Safira da Guarda) e efeitos de equipamento (aprimoramento da Forja, conjuntos). Talentos,
especializações, coleção e história não dão Armadura: o que era "Defesa" neles virou **Vigor**. Buffs e postura (%) agem sobre
a Armadura antes da curva. O escudo é outro recurso e continua separado.

## 2. As nove classes (nível 1, sem pontos)

| Classe | Força | Magia | Vigor | Destreza | Vida | Energia | Ataque básico | Habilidade (custo) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guerreiro | 3 | 1 | 6 | 3 | 18 | 10 | Físico | Ímpeto Marcial (10) |
| Guardião | 2 | 1 | 7 | 2 | 20 | 10 | Físico | Provocar (10) |
| Caçadora (Ladino) | 5 | 1 | 3 | 5 | 20 | 10 | Físico | Ataque Duplo (10) |
| Arcanista (Mago) | 1 | 6 | 3 | 3 | 18 | 12 | Mágico | Ascensão Arcana (10) |
| Druida | 1 | 4 | 4 | 3 | 20 | 12 | Mágico | Brisa Revigorante (8) |
| Caçador | 5 | 1 | 4 | 5 | 18 | 10 | Físico | Marca do Predador (8) |
| Monge | 4 | 3 | 5 | 4 | 18 | 10 | Híbrido | Golpe Flamejante (10) |
| Sacerdotisa | 1 | 3 | 5 | 2 | 20 | 12 | Mágico | Bênção da Vida (10) |
| Conjurador | 1 | 4 | 3 | 3 | 22 | 12 | Mágico | Conjurar Fera Espectral (6 por fera) |

A tabela mostra a Vida da classe sem itens; com o kit inicial a Vida é a de antes (ver abaixo).

## 3. Decisões de balanceamento

1. **Ataque e Vida iniciais idênticos aos de antes.** Força/Magia principal = antigo Ataque da classe; `vidaBase` = Vida antiga −
   Vigor × 2. Verificado por teste para as nove classes (`attributeModel.test.ts`).
2. **Armadura no lugar da Defesa da classe.** A Defesa que a classe dava sem item deixou de existir (Armadura é só de itens).
   A curva `2·A/(1+A/40)` fica perto de 1:1 nas faixas de Armadura que os itens dão do meio do jogo (≈ 10–30) e achata depois,
   sem passar de 80. Para o começo do jogo não ficar mais duro, a peça inicial de cada classe dá 1 ou 2 pontos de Armadura extras
   só para aquela classe (`STARTER_ARMOR_BONUS` em `game.ts`, aplicado depois do balanceamento por raridade: não muda nível, preço
   nem ranking). A mitigação do kit inicial fica a **no máximo 1 ponto** do valor antigo nas nove classes (teste).
   Uma primeira calibração com `3·A/(1+A/24)` deixava a mitigação do nível 10 ao 40 até 60% acima da antiga (simulação:
   −34% de mortes); a curva atual corrige isso.
3. **Ponto de Vigor rende mais que o de Vida antigo** (+2 de Vida em vez de +1, mais resistência). É intencional: os pontos
   de Vida e de Defesa antigos agora vão para o mesmo atributo.
4. **Destreza é nova e pequena no começo** (esquiva ≈ 2–6%); só a Caçadora e o Caçador têm a passiva de 20% (teto total 45%).
5. **Habilidades** escalam por atributo (potência 1 = valor inicial; ver fórmulas). Classificação:
   física (Guerreiro, Caçadora, Caçador), mágica (Arcanista, Druida, Sacerdotisa), híbrida (Monge, Conjurador), utilidade
   (Guardião).
6. **Energia substitui o limite de "1 uso por combate"** da habilidade: com custo 6–10, energia inicial 10–12 e regeneração 2,
   o ritmo real fica parecido com a recarga de 3 turnos que já existia (a recarga continua valendo no solo).

## 4. Migração de saves (`balanceVersion: 3`)

`normalizeAttributes` (em `game.ts`) roda ao carregar o save e ao abrir/continuar uma campanha guardada.

| Save antigo | Vira |
| --- | --- |
| `allocatedAttr.ataque` / `attr.ataque` | atributo ofensivo da classe (Força; Magia nas classes mágicas; Força no Monge) |
| `allocatedAttr.vida` + `allocatedAttr.defesa` | Vigor |
| Vida permanente de poções (`attr.vida` acima do gasto) | `permanentLife` (Vida exata preservada) |
| bônus permanentes de `attr.defesa` acima do gasto | Vigor |
| Vida atual | mesma **proporção** da Vida Máxima (cheia continua cheia; zero continua zero) |

- v1 (sem `balanceVersion`) primeiro reconstrói os pontos gastos pela regra antiga, depois migra.
- Todo o resto do save (ouro, inventário, equipamentos, talentos, progresso, campanhas) é preservado.
- Saves incompletos ou corrompidos (texto, `NaN`, negativos, campos ausentes) viram zeros: nunca `NaN`.
- Uma campanha v2 guardada dentro de `campaigns` é migrada ao ser carregada.
- Energia ausente no save vira **cheia** (não zerada).
- `scripts/detect-anomalies.mjs` entende as duas formas (soma todos os pontos alocados).

## 5. Carta de Campeão

`ChampionCard` (`src/ui/ChampionCard.tsx`) é dirigida por dados (`ChampionCardData`, `championCardData.ts`). Os dados vêm de
`championCardSources.ts` (herói ativo, kit inicial de cada classe, estado qualquer) e sempre passam por `championStats`,
a mesma função do combate. Usada na Ficha, na seleção Moderna (com `hideDetailsButton`), na Coleção (herói ativo) e
aceita qualquer dado (prévia). Não há cristais, losangos nem escalas 1–5; a moldura muda com a **raridade**, não com os valores.
Números de quatro dígitos são formatados, nomes longos são cortados com dica do texto inteiro, bônus têm sinal explícito e
seta (não dependem de cor), ícones são decorativos e o texto completo da habilidade abre em diálogo acessível.

Seleção de herói:

- **Moderna:** carta + função, dificuldade, "Boa para começar", ataque básico, habilidade e custo; texto longo, fórmulas e
  passivo/ativo em "Ver detalhes". Navegação por teclado (setas/Home/End), foco, `aria-live` e carrossel no celular mantidos.
- **Clássica:** cada classe mostra função, dificuldade, os 4 números, Vida/Energia/Armadura do kit, assinatura com até 3 etiquetas
  e "Ver detalhes"; o parágrafo longo saiu.

## 6. Coop

O coop usa as mesmas contas do solo. Cada membro publica `armor`, `dodgeChance`, `elementalResist`, `effectResist`, `vigor`,
`energyMax` (e mantém `defense` por compatibilidade). `coopMemberDefenseBase` aplica os percentuais sobre a **Armadura** antes da
curva; sem `armor` publicado (cliente antigo), cai na defesa já mitigada. A potência da habilidade e a Energia são as do herói.

## 7. Testes

`heroStats.test.ts` (fórmulas, teto de esquiva, retorno decrescente da Armadura, Energia, nove classes),
`attributeMigration.test.ts` (v1/v2→v3 e saves corrompidos), `attributeModel.test.ts` (equipamento, forja, gemas, talentos,
especializações, Energia no combate, paridade do início do jogo), `coopAttributes.test.ts`, `championCard.test.tsx`,
`heroSelect.test.tsx`, além dos ajustes nos testes existentes.

Simulação de balanceamento: `npm run test:balance` e `npm run test:balance:coop`. Para uma rodada reduzida use
`BALANCE_RUNS`, `BALANCE_HEROES`, `BALANCE_STEELMERE=0`, `BALANCE_OUT`, `BALANCE_PROGRESS` (progresso por sub-região) e, no coop,
`BALANCE_POOL_FILE` (reaproveita os marcos de um resultado solo).
