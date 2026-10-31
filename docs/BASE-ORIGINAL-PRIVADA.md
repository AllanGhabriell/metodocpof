# Base original privada — Academia CPOF

A base preliminar dos PDFs originais deixa de ser uma biblioteca pública. O catálogo permanente dos 119 casos continua fixo (41 F2L, 57 OLL, 21 PLL); excluir a base não altera os IDs nem as bibliotecas aprovadas.

## Ativar

No Supabase → SQL Editor → New query, cole **somente** o conteúdo de `supabase/migrations/20261031_000008_private_original.sql` e clique em **Run**. É preciso já ter instalado as migrações até `000007`.

O SQL cria a tabela de referência privada, seu controle de exclusão e a função protegida por autorização. Também deixa a tabela legada `cfop_published_cases` visível apenas para o fundador, de modo que os visitantes recebam conteúdo somente através de `cfop_libraries` e `cfop_library_cases` após aprovação.

## Onde gerenciar

Entre com `coelhodatoca124@gmail.com` e abra **Meu espaço → Outras ferramentas administrativas → Base original (privada)**. A base é importada para o Supabase pelo fundador na primeira visita. A página oferece visualização da lista, exportação de backup JSON e **Excluir base original definitivamente**, com confirmação dupla.

A exclusão retira os registros privados no banco, marca a base como excluída globalmente e impede que o sistema volte a usá-la como referência no importador. **Não exclui as bibliotecas que você publicou.** Não é necessário executar novo SQL para excluir a base depois de ativar esta migração.

A seleção de bibliotecas de alunos contém somente as publicadas. Os treinadores F2L/OLL/PLL não exibem imagens ou movimentos de casos que não estejam aprovados na biblioteca ativa.

## Limitação de privacidade na hospedagem

O GitHub Pages e o repositório públicos não protegem arquivos estáticos por login. O arquivo legado `v2/data/pdf-cases.json`, as imagens PNG antigas e seus históricos de commit podem continuar acessíveis diretamente, mesmo que não apareçam no aplicativo. Para confidencialidade real, após a migração dos 119 registros para uma fonte privada, é necessário eliminar os originais da hospedagem pública, mover as imagens para armazenamento autenticado e considerar a exposição anterior no histórico do GitHub.

Esta implementação restringe **a interface e os dados armazenados no Supabase**. Ela não deve ser anunciada como sigilo integral dos arquivos antigos no repositório.
