Guia de Funcionamento da do Banco de Dados (MySQL) na AWS do Banco Javer

1. O projeto está funcionando em um banco de dados RDS MySQL
2. o Banco de dados está com a versão 8.0.43 (default) da AWS
3. Senha autogerenciada para facilitar a execução quando o banco for interrompido
4. Classe da instancia do banco de dados é db.m7g.large, por ser de tamanho menor pela unica necessidade do projeto ser armazenar dados de cadastro em forma de texto, com 2vCPUs e 8GiB RAM
5. O banco foi configurado para criar sua propria VPC 'app-javer-project' e o grupo de segurança fui eu que criei, com a regra de entrada sendo para qualquer IP ou somente o meu IP, por ser um banco que está sendo criada apenas para ambiente de desenvolvimento.

====== CONEXAO COM O BANCO RDS ======
1. Os dados da conexao estao sendo registrados num arquivo .env
2. É realizado um bloco 'try' na conexao que valida as informacoes
3. Se conectado, retorna um print ou uma sequencia de codigo que será necessária uma conexão com o banco de dados.

OBS.: Para usar a aplicação não é necessária uma inicialização no banco de dados, pois ja está funcionando. Mas é bom verificar se está pausado, se sim, iniciar o banco e aguardar ficar disponível.