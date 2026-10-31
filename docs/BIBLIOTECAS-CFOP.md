# Bibliotecas CFOP — fluxo implementado

## Identidade fixa

- F2L: `F2L-01` a `F2L-41` (41 casos).
- OLL: `OLL-01` a `OLL-57` (57 casos, com nomes conhecidos e grupos).
- PLL: `PLL-01` a `PLL-21` (Ua, Ub, H, Z, Aa, Ab, E, Ra, Rb, Ja, Jb, T, F, V, Y, Na, Nb, Ga, Gb, Gc, Gd).
- O ID e o nome do caso são do catálogo fixo e não podem ser modificados no editor. Cada biblioteca tem seus próprios algoritmo, setup, orientação e imagem.

## Ativação do banco

O projeto deve ter recebido a instalação base (migrações 000001–000006). Execute **somente** a migração nova
`supabase/migrations/20261030_000007_libraries.sql` no Supabase → SQL Editor → Run.

O script é transacional, cria as tabelas `cfop_case_catalog`, `cfop_libraries`,
`cfop_library_cases` e `cfop_library_case_drafts`. Não exclui os dados existentes.
Somente o fundador `coelhodatoca124@gmail.com` com e-mail confirmado pode escrever ou publicar bibliotecas via políticas RLS.
As contas comuns podem selecionar bibliotecas públicas e visualizar somente os casos aprovados.

## Passo a passo

1. Entre no Studio com a conta fundadora.
2. Abra `studio.html?page=admin-libraries`, depois **Gerenciador de bibliotecas**.
3. Crie uma biblioteca, selecione F2L/OLL/PLL e envie o PDF.
4. O sistema tenta reconhecer os blocos pela posição das linhas e colunas de texto e produz recortes WebP quadrados (288×288). Os casos do PDF O CUBO 2024 foram usados como referência de layout.
5. Confira a associação do caso, o algoritmo, o setup e a imagem. Corrija manualmente qualquer associação incerta. O reconhecimento por ordem é marcado como **Conferir associação**, não como validação matemática.
6. Marque cada caso como **Aprovado**, **Pendente** ou **Rejeitado**. Ao salvar, grava-se apenas o **rascunho**, sem alterar o que os alunos já estão usando.
7. Ao clicar em **Publicar biblioteca**, o servidor publica atomicamente os casos aprovados, deixando os outros fora da biblioteca pública.
8. Alunos escolhem a biblioteca na página do Studio ou no seletor dos treinadores. Alterações online aparecem após nova sincronização.

## Offline e limites atuais

- O Service Worker disponibiliza arquivos básicos do site offline após o navegador carregá-los e armazená-los.
- As bibliotecas selecionadas são armazenadas em IndexedDB; sem rede, o aluno usa a última versão baixada.
- Publicações feitas enquanto o aluno estiver offline são recebidas somente depois que o navegador voltar a sincronizar.
- A extração PDF utiliza PDF.js remoto e precisa de internet na primeira utilização. Não há reconhecimento confiável de PDFs exclusivamente digitalizados ou fotografias.
- F2L e PLL possuem mapeamento dos IDs originais dos treinadores; os números do treinador OLL ainda não foram associados matematicamente aos 57 casos da ordem dos PDFs. No OLL, a biblioteca personalizada está disponível no Studio; o treinador mantém as imagens/algoritmos originais para não apresentar uma orientação incorreta.
- A aprovação editorial **não equivale** à validação matemática do setup. O simulador só libera casos matematicamente validados.
- A detecção reconhece diagramação e algumas siglas, não garante reconhecimento universal por visão para qualquer PDF. Exige revisão humana.
- O dono deve ter direito de redistribuir publicamente imagens extraídas de PDFs de terceiros.

## Verificação

O workflow `CFOP Studio — verificações` testa sintaxe, catálogo imutável,
extração por colunas e controles de acesso no código. É necessário testar a migração no Supabase real e testar a revisão/publicação com a conta fundadora.
