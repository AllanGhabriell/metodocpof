# Academia CFOP — Cubo 3D, avisos administrativos e limites

## Código publicado no GitHub

- Timer 3×3: o cubo 3D voltou a ficar **visível abaixo do relógio**, sem necessidade de abrir o menu, e a visualização continua adaptável à altura do celular. O usuário ainda pode desligá-lo nas configurações.
- O embaralhamento continua atualizando o cubo, e a opção Cubo 2D permanece disponível.
- Perfil: nova regra de **6 trocas de foto por dia**, com intervalos progressivos, em minutos: depois da 1ª troca 5, 2ª 15, 3ª 30, 4ª 60, 5ª 120. Após a 6ª, só no próximo dia.
- Nome: usuário comum mantém limite de até 3 trocas/dia, com intervalo de 30 minutos.
- **Administradores autorizados no Supabase** ficam sem limite de mudanças do próprio nome ou foto, incluindo intervalos de espera. O banco continua validando dados, nomes exclusivos e autorização.
- Avisos de conta: ajustes de XP, nome, foto, bloqueio/desbloqueio, suspensão, banimento, permissões e estatísticas geram mensagens automáticas, pendentes até o usuário marcar como lidas.
- Mensagens mostram **nome e foto do administrador que fez a alteração**. A conta fundadora recebe moldura dourada com a patente Deus Criador dos Cubos; demais administradores recebem identificação administrativa.
- As notificações mostram o registro da alteração. Os dados pessoais e o nível técnico não são divulgados publicamente.
- O Studio consulta avisos pendentes periodicamente enquanto estiver visível. Nas demais páginas, o módulo de avisos já faz a consulta.

## ⚠ Ativação obrigatória do banco

O GitHub recebeu o SQL, mas ele **não foi executado no Supabase** (esta conexão não tem permissão administrativa).

1. Entre no projeto Supabase `mygszfrgmrbnhbuhhzba`.
2. Faça backup.
3. Verifique que `supabase/CFOP_PERFIS_ATUALIZACAO_COMPLETA.sql` já foi executado. A migração 000014 depende das tabelas, limites e funções desse script anterior.
4. Verifique as demais migrações anteriores antes de continuar.
5. Abra o arquivo `supabase/migrations/20261031_000014_identity_admin_notifications.sql` e execute-o no SQL Editor.
6. Atualize o navegador, entre com uma conta administrativa e teste a alteração de XP de uma segunda conta.

## Verificações recomendadas

1. No celular, abra Timer 3×3. O cubo deve aparecer abaixo do relógio e não provocar rolagem vertical; experimente girar o cubo e gerar novo embaralhamento.
2. Abra o menu do Timer, altere 3D para 2D, volte e confirme a atualização da visualização.
3. Com duas contas, conceda XP de administrador à conta de testes. Confira o aviso com o nome, a foto e a moldura do administrador. Marque como lido e confirme que ele deixa de aparecer como pendente.
4. Repita com mudança de nome, remoção de foto e bloqueio/desbloqueio.
5. Na conta comum, troque a foto e confirme que a próxima alteração só pode ocorrer após 5 minutos. Após a segunda, o intervalo será 15 minutos e assim por diante.
6. Na conta admin, confirme que pode trocar o próprio nome/foto repetidamente sem intervalo.
7. Confirme que uma conta comum não consegue simular o administrador mudando parâmetros do navegador ou fazendo chamadas REST.

### Observações
- A foto do administrador usada no aviso corresponde ao momento em que o aviso é criado (snapshot).
- O aplicativo precisa estar conectado para receber mensagens online; avisos ficam pendentes no banco até a leitura.
- A compilação do aplicativo Android usa o site online: as mudanças de layout também passam a aparecer dentro do APK quando o site atualizar.
- Os testes do novo comportamento passaram na suíte de GitHub Actions, mas a implantação do SQL e o uso em aparelho real ainda exigem conferência.
