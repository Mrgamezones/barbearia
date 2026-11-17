## MODIFIED Requirements

### Requirement: Rodapé
O rodapé SHALL ter colunas com: marca e frase curta com ícones de Instagram e WhatsApp; Navegação; Serviços (os ativos, até 5, e "Outros serviços"); Contato (telefone, e-mail, endereço com link para mapa); e Horário de funcionamento por dia. Também SHALL ter a linha final com o copyright do ano atual, o link da política de privacidade e o link "Área do barbeiro" para `/painel/<slug>`. Todos os dados SHALL vir das configurações e do catálogo.

#### Scenario: Domingo fechado
- **WHEN** o domingo está marcado como fechado no horário de funcionamento
- **THEN** o rodapé exibe "Domingo — Fechado"

#### Scenario: Rodapé no celular
- **WHEN** o rodapé é exibido em 360 px de largura
- **THEN** as colunas ficam empilhadas, sem rolagem horizontal

#### Scenario: Dono chega ao painel pelo site
- **WHEN** o dono, sem sessão, toca em "Área do barbeiro" no rodapé de `/barbearia/demir-barbershop`
- **THEN** vai para a tela de login e, depois de entrar, cai em `/painel/demir-barbershop`; o link tem `rel="nofollow"`
