# Fila de sprites - Guardiao

Esta fila e a autorizacao de producao para as proximas folhas do Guardiao. Cada item segue o padrao visual ja aprovado em `Descanso.png`: pixel art de luta arcade, PNG com transparencia real, celulas de 512x512 px, margem interna minima de 24 px, sem sobreposicao entre celulas e arquivos bruto, normalizado e final.

## Ordem de producao

| Ordem | Folha final | Acao | Grade | Status |
| --- | --- | --- | --- | --- |
| 1 | `Descanso.png` | Postura de batalha, respiro e balanco corporal | 3x2, 6 frames | Concluido |
| 2 | `Ataque_v2.png` | Ataque normal com martelo e escudo | 4x2, 8 frames | Concluido |
| 3 | `Ataque_Critico.png` | Ataque critico de maior impacto | 5x2, 10 frames | Concluido |
| 4 | `Defesa.png` | Guarda e bloqueio com escudo | 3x2, 6 frames | Concluido |
| 5 | `Esquiva.png` | Passo curto de esquiva blindada | 3x2, 6 frames | Concluido |
| 6 | `Dano_Recebido.png` | Recuo ao receber dano | 2x2, 4 frames | Concluido |
| 7 | `Pocao.png` | Uso de pocao | 4x2, 8 frames | Concluido |
| 8 | `Habilidade.png` | Habilidade comum do Guardiao | 4x2, 8 frames | Concluido |
| 9 | `Postura_Ofensiva.png` | Mudanca para postura ofensiva | 3x2, 6 frames | Concluido |
| 10 | `Postura_Defensiva.png` | Mudanca para postura defensiva | 3x2, 6 frames | Concluido |
| 11 | `Ultimate.png` | Habilidade suprema | 3x4, 12 frames | Concluido |
| 12 | `Derrota.png` | Queda e derrota | 4x2, 8 frames | Concluido |
| 13 | `Vitoria.png` | Pose de vitoria | 4x2, 8 frames | Concluido |

## Regra de continuidade

Depois de concluir uma folha, produzir a proxima linha pendente nesta ordem. Para cada uma, salvar a folha final, o bruto gerado, a versao normalizada sem padding e o arquivo `Prompt_<Acao>.txt`; em seguida, atualizar este plano para `Concluido`.

`Ataque_v2.png` e a versao aprovada do ataque normal. O sufixo foi usado porque uma tentativa anterior (`Ataque.png`) estava bloqueada pelo visualizador no momento da substituicao.
