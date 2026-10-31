# Academia CPOF — atualização de XP e edição de imagens

## Situação
O frontend e o código da migração foram enviados ao GitHub (branch `main`).
**A migração não foi executada no projeto Supabase**, porque o acesso administrativo ao banco não está autorizado no ChatGPT. Até sua execução, XP de contas autenticadas não é concedido; o treino permanece utilizável. Imagens continuam editáveis no navegador, com fallback de salvamento sem a cópia original persistente.

## Ativar o backend
1. Faça um backup do banco do Supabase.
2. Acesse [SQL Editor](https://supabase.com/dashboard/project/mygszfrgmrbnhbuhhzba/sql/new) com **sua própria conta**.
3. Confirme que as migrações anteriores `000001` a `000010` já foram aplicadas. Se faltar alguma, execute as faltantes na sequência conforme a pasta `supabase/migrations`.
4. Abra [20261031_000011_xp_image_editor.sql](https://github.com/AllanGhabriell/metodocpof/blob/main/supabase/migrations/20261031_000011_xp_image_editor.sql), copie o SQL completo e execute no projeto correto **uma única vez**.
5. Confira a mensagem de sucesso. Em caso de erro, pare e apresente a mensagem. **Não** apague tabelas nem repita migrações destrutivas.

## XP
- A notificação +XP aparece pequena no canto inferior com fade-in e fade-out.
- Em modo Sequencial não é concedido XP.
- **Contas autenticadas:** RPC `cfop_claim_case_xp` valida a recompensa. Primeiro registro de sucesso de um caso: **8 XP**; revisão do caso após pelo menos 24 horas: **2 XP**; uma recompensa por caso/dia e teto de **80 XP por dia** (timezone America/Fortaleza). O cliente não consegue inserir XP no ledger diretamente. Repetir cliques, mudar de modo, abrir abas e atualizar a página não gera XP duplicado no ledger.
- **Visitantes:** limite local por caso e dia, com recompensas menores em revisão; esse XP não é comprovado pelo banco.
- Histórico antigo e dados locais não são apagados. Conquistas e atividade histórica ainda são cálculos locais, portanto **não constituem prova de resolução física nem placar antifraude certificado**. Expansões futuras devem usar conquistas certificadas no servidor antes de um ranking competitivo.
- `awardActivity` em aulas e desafios só registra uma atividade de cada tipo por dia e não gera XP local adicional para usuários conectados.

## Editor de imagens
Abra [Gerenciador de bibliotecas](https://allanghabriell.github.io/metodocpof/importer.html) com a conta de administrador fundador:
1. Escolha a biblioteca existente, mesmo que já esteja publicada.
2. Selecione F2L, OLL ou PLL. Abra **Ajuste geral** para aplicar horizontal/vertical/zoom. A opção **todas as etapas** abrange a biblioteca inteira, com confirmação; nesse caso grava as alterações como rascunhos e exige nova aprovação.
3. Ou clique em **Editar imagem / retoque** no cartão do caso. Mova com o mouse/toque, use giro de 90°, zoom, pincel, borracha de fundo, conta-gotas, desfazer/refazer e restaurar original.
4. A edição gera **512 × 512 WebP** no padrão visual. As imagens são normalizadas também ao salvar rascunhos. O pincel é uma correção pixel a pixel, sem alterar a posição.
5. **Reaprove** cada caso alterado; clique em **Salvar rascunhos** e, quando estiver correto, em **Publicar casos aprovados**. Os demais casos aprovados permanecem publicados enquanto você revisa a correção.
6. A migração cria a coluna `image_original` nos rascunhos e na versão publicada para reverter ao original mesmo após recarregar.

Ajustar visualmente a orientação de um cubo não ajusta automaticamente o algoritmo ou setup correspondente; confira ambos antes de aprovar. A correção de rebarbas com borracha utiliza a cor branca do fundo; fundos de outra cor podem ser reparados com o conta-gotas e pincel.

## Testes e limitações
- Foi verificada a sintaxe JavaScript de módulos e scripts e o cenário local de XP **0 → 8 → 0 → 2 → 0** (erro, primeira conclusão, repetição, revisão no dia seguinte e repetição).
- **Não houve teste de ponta a ponta com banco, autenticação e imagens publicadas reais** porque o Supabase não retornou autorização administrativa. Faça uma revisão no painel antes de editar a biblioteca inteira.
- Os retoques antigos anteriores à migração podem não ter seus originais remotos, se estes já foram perdidos na extração do PDF; não é possível restaurar pixels inexistentes.
- As imagens publicadas antes da atualização conservam sua versão até serem revisadas/salvas, evitando mudanças surpresa.
