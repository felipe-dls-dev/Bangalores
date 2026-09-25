# bangalores-orchestrator (MCP)

Servidor MCP para o Claude Code **orquestrar os outros agentes** do projeto: Codex (arte) e
Antigravity (QA). Ele é um quadro de tarefas compartilhado, com despacho de trabalho para os
agentes sem abrir interface, revisão do que voltou e leitura das filas que já existem nos docs.

Complementa, não substitui, os contratos em `docs/VISUAL_DEVELOPMENT_HANDOFF.md` (ART-XXX) e
`docs/QA_TESTING_GUIDE.md` (QA-XXX): as tarefas do quadro apontam para esses ids em `refs`.

## Instalação

```
cd tools/agent-orchestrator
npm install
```

O Claude Code carrega o servidor pelo `.mcp.json` na raiz (na primeira vez ele pede aprovação;
depois de aprovar, recarregue a janela/sessão). Nada disto entra no bundle do jogo: é um pacote
separado, com as próprias dependências.

## Ferramentas

| Ferramenta | Para quê |
| --- | --- |
| `agents_list` | Agentes, papéis, se o executável foi encontrado e tarefas por status |
| `task_create` | Cria tarefa: brief, `assignee`, `priority`, `depends_on`, `paths`, `acceptance`, `refs` |
| `task_list` | Fila por prioridade; `needs_attention` mostra só o que espera ação (review/blocked) |
| `task_get` | Tarefa completa + estado e final do log da execução |
| `task_update` | Muda status/campos ou registra nota; é o que um agente usa para reportar |
| `task_next` | Agente conectado ao MCP pega a próxima tarefa pronta dele (com o brief) |
| `task_review` | `accept` → done; `changes_requested` → volta para todo e o feedback entra no próximo brief |
| `task_brief` | Texto pronto para colar num agente já aberto (ex.: app do Codex) |
| `task_dispatch` | Roda o agente em segundo plano (`codex exec` / `agy --print`) e devolve na hora |
| `run_cancel` | Interrompe a execução (mata a árvore de processos) e devolve a tarefa para todo |
| `handoff_status` | Lê ART-XXX e QA-XXX abertos nos docs |

Ciclo: `todo → in_progress → review → done`, com `blocked` e `cancelled`. Só o orquestrador
leva `review` a `done`.

## Como o despacho funciona

`task_dispatch` monta o brief (papel do agente, objetivo, aceite, contexto das dependências,
feedback de revisões anteriores, regras do projeto) e sobe `runner.mjs` como processo
desanexado. O runner executa o agente, guarda os logs em `.orchestrator/runs/` e, ao terminar,
lê o bloco `RESULTADO / RESUMO / ENTREGAVEIS / BLOQUEIOS` da última mensagem e move a tarefa
para `review` (ou `blocked`). Como o runner é independente, a execução sobrevive se a sessão do
Claude Code fechar; execuções cujo runner morreu são detectadas e bloqueadas.

Guardas: dependências pendentes e **colisão de `paths`** (duas tarefas em andamento não mexem
nas mesmas pastas) bloqueiam o despacho, a menos que `force`. Os agentes recebem ordem de **não
commitar** e de não mexer na versão do jogo; quem integra e commita é o Claude Code.

- **Codex**: `codex exec --sandbox workspace-write` (ou `read-only`), prompt por stdin, resposta
  final via `-o`. Nunca usa bypass de sandbox.
- **Antigravity**: `agy --print --mode accept-edits`. O modo headless **não consegue pedir
  permissão de comando** e nega sozinho, então qualquer tarefa que rode comandos (todo playtest)
  termina `blocked` com essa explicação. Passar `unattended: true` liga
  `--dangerously-skip-permissions`; é um opt-in seu, consciente, por chamada. A alternativa mais
  restrita é liberar comandos específicos em `permissions.allow` nas configurações do agy.

Executáveis são achados sozinhos (PATH, `%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\codex.exe`,
`~\.gemini\bin\agy.exe`); force com `ORCH_CODEX_BIN` / `ORCH_AGY_BIN`.

## Conectar Codex e Antigravity ao mesmo quadro (opcional)

O despacho não exige isso. Se quiser que eles mesmos chamem `task_next` / `task_update`, registre
o servidor (o estado é um arquivo em disco com lock, então várias instâncias convivem):

```
codex mcp add bangalores-orchestrator -- node "<repo>\tools\agent-orchestrator\server.mjs"
agy mcp add bangalores-orchestrator node "<repo>\tools\agent-orchestrator\server.mjs"
```

## Estado e testes

- Estado em `.orchestrator/` (na raiz, fora do git): `board.json` + `runs/`. Apagar a pasta zera o quadro.
- `npm test` na raiz do repo roda os testes unitários (lógica do quadro, brief/relatório,
  leitura dos docs, lock com 6 processos concorrentes).
- `npm run smoke` (aqui): sobe o servidor de verdade e percorre o ciclo via protocolo MCP.
- `npm run smoke:live -- [codex|antigravity|both] [--unattended]`: despacha uma tarefa trivial,
  só de leitura, aos agentes reais (gasta uma chamada de modelo por agente).
