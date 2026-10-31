# Academia CFOP — RPG de XP, perfil e administração

## Atualizado na branch `main`
- Progressão de XP agora usa uma curva crescente com 500 níveis e mais de 25 títulos de RPG. A patente **Lendário** começa no nível 150 e exige dedicação prolongada. A curva respeita o XP acumulado anteriormente (sem apagar saldos).
- A conta fundadora recebe o título exclusivo **Deus Criador dos Cubos**, verificado por RPC no Supabase com `cfop_is_owner(auth.uid())`; não pode ser obtido por XP ou por modificar o navegador.
- Coleção de molduras, cores do nome, fundos, auras, brasões e temas de cartões. Itens normais têm desbloqueio por nível; o fundador tem acesso à coleção inteira.
- Perfil → **Minha coleção e aparência**: seleção de itens equipados.
- Perfil → **Meu aprendizado e objetivos**: perguntas opcionais e relatório de orientação para Cross, F2L, OLL e PLL. Treinar permanece livre; não é necessário responder.
- Evolução inclui XP, título e progresso para o próximo nível; novas conquistas difíceis com XP adicional zero, para não facilitar farm.
- Cartões voluntários de compartilhamento incluem título e XP, moldura de avatar e cor de nome. O perfil técnico e respostas pessoais não aparecem nesses cartões.
- Administração: **Gerenciador de progressão e recompensas**, que adiciona e edita títulos e cosméticos pelo banco. O ajuste administrativo de XP já existente permanece disponível com auditoria.

## Ativação do Supabase — OBRIGATÓRIA para os recursos online novos
**A migração ainda não foi executada**, pois a conexão administrativa do ChatGPT não está autorizada ao projeto.
1. Faça um backup no painel do projeto Supabase `mygszfrgmrbnhbuhhzba`.
2. Verifique se as migrações anteriores 000001–000012 estão aplicadas, em ordem. Não execute versões anteriores sem conferir.
3. Abra `supabase/migrations/20261031_000013_profile_progression.sql` do repositório e execute o SQL completo no editor do projeto.
4. Recarregue o Studio e entre na sua conta. Na conta fundadora autorizada pelo banco, aparecerá a patente divina. Administradores terão acesso ao catálogo.
5. Teste com duas contas diferentes para garantir que uma não consiga ler as respostas de outra.

Sem a migração, as preferências do questionário e os itens básicos funcionam localmente, mas os novos dados não podem ser sincronizados; a confirmação de Criador e o catálogo gerenciado não serão ativados.

## Regras e limitações
- XP de casos autenticados continua sujeito à RPC `cfop_claim_case_xp` e suas cotas de 80 XP/dia e intervalos por caso, caso a migração 000011 esteja aplicada. O novo frontend altera **a curva de níveis**, não amplia os XP por clique e não entrega XP ilimitado por responder o questionário.
- A avaliação pessoal é opcional, editável e mantida privadamente sob RLS da própria conta, após 000013. Estatísticas de treino anteriores permanecem inalteradas.
- Os itens personalizados usam uma lista de estilos visuais suportados; um visual novo totalmente diferente requer CSS próprio e revisão.
- A conta criadora tem uma patente visual exclusiva superior às outras, sem inflar artificialmente o saldo de XP e sem contaminar rankings competitivos.
- Testes automáticos novos para progressão, SQL e integração passaram. Testes legados ainda possuem falhas anteriores à mudança; validar a experiência em navegador real, principalmente no celular.
- Não há validação do SQL no banco remoto neste turno devido à ausência de acesso administrativo.

## Verificação manual após migração
- Entre na conta do fundador e veja o título na aba Perfil.
- Equipe uma moldura e uma cor do nome, recarregue e confirme que a seleção persistiu.
- Responda apenas uma pergunta, escolha o foco F2L e salve. Veja o relatório e confirme que o treino normal não solicita respostas.
- Abra uma conta comum, verifique que não pode equipar recompensas bloqueadas nem assumir a patente de Criador.
- Como administrador, adicione um cosmético e veja-o aparecer no catálogo. Conceda XP pela opção administrativa atual e verifique se o nível acompanha a nova curva.
- Compartilhe um cartão e confirme que não contém informações do perfil técnico.
