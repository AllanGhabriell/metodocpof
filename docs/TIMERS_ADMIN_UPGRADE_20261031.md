# Academia CFOP — atualização Timer 3×3, Cross e administrador

## Implementado no GitHub
- Timer 3×3: área central grande de toque; confirmação de registros abaixo de 2 segundos; histórico com edição individual de tempo, +2, DNF, comentários, sessões e arquivamento.
- Histórico: pesquisa, filtros, seleção/exclusão múltipla, desfazer exclusão por 10 segundos, CSV e backup/restauração JSON do próprio timer.
- Estatísticas: melhor/pior/média/mediana/desvio padrão e Ao5/Ao12/Ao50/Ao100/Ao1000, com DNF considerado nas médias.
- Compartilhamento voluntário: cartão PNG de tempo e evolução com gráfico, sem publicar automaticamente resultados.
- Recorde pessoal: efeito dourado/eletrônico discreto, desligável pelo usuário.
- Cross: mesmos controles de histórico e compartilhamento, preservando separação dos timers 1, 2, 3 e 4 peças de meio.
- Admin Studio: panorama por usuário, quantidade de treinos, acertos, modalidades, médias diárias, gráficos e frequência de 7, 30 ou 90 dias.

## O que depende do Supabase
O frontend está publicado, mas a **migração não foi executada**, pois a conta do conector não tem permissão administrativa ao projeto.
1. Entre no projeto Supabase com sua conta.
2. Verifique que as migrações anteriores estão aplicadas; não rode migrações antigas às cegas.
3. Faça backup do banco.
4. Abra o arquivo `supabase/migrations/20261031_000012_timer_analytics.sql`.
5. Execute-o uma única vez no SQL Editor de `mygszfrgmrbnhbuhhzba`.
6. Entre no Studio > Meu perfil > Admin > Usuários e clique em Atualizar.

## Privacidade e limitações
- O administrador vê somente resumos diários por usuário e modalidade; não recebe comentários, embaralhamentos ou tempos individuais no novo ledger.
- Os dados são registrados somente por contas autenticadas e a partir da execução da migração.
- Os históricos completos e seus backups continuam guardados no dispositivo do usuário; não há sincronização automática dos novos campos para todos os aparelhos.
- **Dados agregados já enviados não são corrigidos retroativamente** quando o usuário edita ou exclui um tempo local. São indicadores de atividade, não relatórios auditáveis de tempos atuais.
- Usuários convidados/offline não aparecem nas métricas novas do administrador.
- O site não consegue verificar fisicamente se o cubo foi resolvido; as métricas refletem registros informados pelo usuário.
- Os testes automatizados específicos para o novo histórico foram adicionados à suíte do GitHub. A suíte geral ainda pode falhar por testes antigos não atualizados em outras funcionalidades.

## Conferência recomendada
1. No Timer 3×3, faça um tempo acima de 2 segundos. Abra Histórico e teste comentário, penalidade DNF, +2 e restauração após exclusão.
2. Compartilhe um tempo e a evolução em PNG.
3. Teste Cross com 1 e 4 peças de meio: confirme que os históricos permanecem separados.
4. Gere um recorde válido; confira o brilho e a opção de desligá-lo.
5. No administrador, após aplicar o SQL, faça uma resolução usando conta logada e consulte o relatório atualizado.
