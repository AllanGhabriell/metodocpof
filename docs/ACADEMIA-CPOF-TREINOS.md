# Academia CPOF — contrato dos treinamentos

## Identidade e interface
F2L, OLL e PLL compartilham a mesma estrutura de HTML e o mesmo CSS (`trainer-unified.css`).
As imagens de casos continuam sendo os PNGs existentes nas pastas `f2l/`, `oll/` e `pll/`. **Não substituir imagens por cubos 3D gerados.**

## Interface simplificada de treino (F2L / OLL / PLL)
- Os três treinadores mostram a imagem PNG original em um quadro do **mesmo tamanho em todos os modos**. A opção de tamanho da imagem continua ajustável nas preferências.
- O fluxo principal tem somente **Caso anterior / Fácil / Difícil / Pular**. Os movimentos e setups são um painel compacto, fechado por padrão, inclusive no sequencial. Não existe uma segunda caixa obrigatória de avaliação.
- **Fácil** registra a execução informada pelo usuário e avança; **Difícil** registra uma tentativa com dificuldade e avança, dando mais peso ao caso até haver duas execuções consecutivas marcadas Fácil; **Pular** avança sem registrar resolução ou conceder XP.
- No **Competitivo**, a escolha manual de Fácil e Difícil é substituída pelos controles temporizados **Iniciar tentativa / Registrar tempo** e pelo marcador opcional **Reconheci**. Nesse modo, a classificação permanece baseada no tempo.
- Os seis modos têm uma explicação curta acessível pelo botão **?** ao lado da seleção e uma comparação completa em **Menu → Como funcionam os modos?**. Não há informações de contagem de práticas ou coaching ocupando a área da imagem.
- O menu agrupa preferências em seções recolhidas: metas, casos, cronômetro/atalhos, aparência, sequência/competitivo e restauração.

## Modos e metodologia
- **Aleatório:** variedade livre, sem repetição imediata. As decisões disponíveis são apenas Fácil/Difícil, que alteram automaticamente a prioridade; o foco extra no difícil continua opcional.
- **Sequencial:** ordem fixa da etapa. Casos pulados não contam como resolvidos. Opcionalmente, ao finalizar os casos, entra em um bloco de reforço dos marcados difíceis até duas confirmações seguidas de Fácil.
- **Competitivo:** tempo medido por caso após o PNG estar carregado. Classificação automática pelo tempo-alvo (até 100%: bom; até 135%: médio; acima: ruim). Caso ruim recebe maior prioridade de repetição. Botão **Reconheci o caso** mede o tempo de reconhecimento explicitamente; sem clique não inventa essa métrica.
- **Adaptativo:** escolha ponderada por classificação manual, caso devido para revisão, tempo médio, tempo de reconhecimento e desempenho anterior, com proteção contra repetição imediata. Não substitui a escolha do usuário.
- **Revisão espaçada:** resolve os casos reais do cubo com intervalos heurísticos. Dá prioridade aos casos já praticados e prontos para revisão, depois aos marcados difíceis/médios, e usa casos comuns se nenhum estiver pendente. Não é um sistema de flashcards.
- **Foco:** favorece casos marcados Médio/Difícil, e mantém opções abertas caso nada esteja marcado.

## Hábitos, autonomia e XP
- Objetivos opcionais: **diário**, **semanal** ou **livre**. Nenhum modo obriga o usuário a zerar uma lista de revisões acumuladas.
- A sequência 🔥 contabiliza dias consecutivos **com atividade registrada**. O calendário mostra 42 dias; os gráficos técnicos mostram atividades por modalidade, variações de tempo, modalidades utilizadas e tempos completos do 3×3.
- A marcação isolada de dificuldade **não conta como resolução nem concede XP**. O botão Difícil durante a sessão registra uma tentativa informada pelo usuário, mas não conta como caso dominado.
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
