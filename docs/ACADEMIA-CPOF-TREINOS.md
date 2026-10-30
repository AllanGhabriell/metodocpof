# Academia CPOF — contrato dos treinamentos

## Identidade e interface
F2L, OLL e PLL compartilham a mesma estrutura de HTML e o mesmo CSS (`trainer-unified.css`).
As imagens de casos continuam sendo os PNGs existentes nas pastas `f2l/`, `oll/` e `pll/`. **Não substituir imagens por cubos 3D gerados.**

## Modos e metodologia
- **Aleatório:** variedade livre, sem repetição imediata. Dificuldade informada manualmente (Fácil/Médio/Difícil). Pode priorizar casos difíceis opcionalmente.
- **Sequencial:** ordem fixa da etapa. Casos pulados não contam como resolvidos. Opcionalmente, ao finalizar os casos, entra em um bloco separado de reforço dos casos marcados Médio/Difícil.
- **Competitivo:** tempo medido por caso após o PNG estar carregado. Classificação automática pelo tempo-alvo (até 100%: bom; até 135%: médio; acima: ruim). Caso ruim recebe maior prioridade de repetição. Botão **Reconheci o caso** mede o tempo de reconhecimento explicitamente; sem clique não inventa essa métrica.
- **Adaptativo:** escolha ponderada por classificação manual, caso devido para revisão, tempo médio, tempo de reconhecimento e desempenho anterior, com proteção contra repetição imediata. Não substitui a escolha do usuário.
- **Revisão espaçada:** resolve os casos reais do cubo com intervalos heurísticos. Dá prioridade aos casos já praticados e prontos para revisão, depois aos marcados difíceis/médios, e usa casos comuns se nenhum estiver pendente. Não é um sistema de flashcards.
- **Foco:** favorece casos marcados Médio/Difícil, e mantém opções abertas caso nada esteja marcado.

## Hábitos, autonomia e XP
- Objetivos opcionais: **diário**, **semanal** ou **livre**. Nenhum modo obriga o usuário a zerar uma lista de revisões acumuladas.
- A sequência 🔥 contabiliza dias consecutivos **com atividade registrada**. O calendário mostra 42 dias; os gráficos técnicos mostram atividades por modalidade, variações de tempo, modalidades utilizadas e tempos completos do 3×3.
- A dificuldade manual, sozinha, **não conta como resolução e não concede XP**.
- O botão de conclusão registra uma **declaração do usuário**, não uma verificação física. Tarefas não resolvidas e dificuldades também podem ser registradas, com XP reduzido. O XP por caso é limitado depois de muitas repetições no mesmo dia.
- A separação reconhecimento/execução só existe se o usuário pressionar o botão de reconhecimento durante o cronômetro.

## Armazenamento, backup e nuvem
- `cpof-academy-coach-v1`: avaliação manual, agenda de revisão, evolução individual e metas.
- `cpof-academy-activity-v1`: tentativas registradas, identificação única e eventual tempo marcado.
- `cpof-scramble-times-v1`: tempos de resolução completa do 3×3.
- `cfop-studio-progress-v1`: XP/ações legadas, perfil, metas e progresso de Cross e lições.
- O backup de perfil exporta/restaura esses conjuntos e dados mais antigos.
- Quando o usuário está **autenticado em uma conta Supabase configurada**, a área Studio reconcilia essas chaves no `cfop_user_state` protegido por RLS. Falhas de conexão não devem impedir treinar localmente.
- A sincronização e as métricas devem ser testadas com duas sessões reais; testes unitários não comprovam o funcionamento de OAuth ou dos navegadores.

## Verificação manual antes de declarar tudo pronto
1. Abrir F2L, OLL e PLL no desktop e celular. Verificar que a mesma interface funciona e que o PNG correto aparece.
2. Alternar os seis modos e voltar à página para confirmar a preferência.
3. Marcar um caso difícil no aleatório e no sequencial; verificar o reforço no fim da sequência sem bagunçar a ordem.
4. Pular um caso e confirmar que ele não é registrado como uma resolução.
5. No competitivo, iniciar depois que o PNG carregar; medir caso bom/ruim e opcionalmente pressionar Reconheci o caso.
6. Treinar no modo de revisão espaçada, verificar metas e histórico em Evolução, conferir XP e sequência.
7. Executar backups, restaurar e comparar os registros; testar conta conectada com sincronização entre dispositivos.
8. Conferir cronômetro 3×3 e CROSS; validar o cubo 3D, orientação das cores e execução dos exercícios.

**Limitações assumidas:** não há sensores nem validação automática da resolução física; o motor de priorização é heurístico, não um modelo clínico; conjuntos de algoritmos/setups anteriores ainda exigem revisão caso a caso.
