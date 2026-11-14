# Spec Delta

## Purpose

Define os serviços oferecidos pela barbearia (preço, duração, combos) e como eles são exibidos ao público para escolha no agendamento.

## ADDED Requirements

### Requirement: Catálogo inicial de serviços
O sistema SHALL disponibilizar, na instalação inicial, os serviços: Corte de cabelo, Barba, Bigode, Sobrancelha, Pezinho/acabamento, Hidratação capilar, Pigmentação de barba, Corte infantil, Corte + Barba e Corte + Barba + Sobrancelha, cada um com nome, descrição curta, preço em BRL e duração em minutos.

#### Scenario: Primeira execução
- **WHEN** o banco é criado a partir das migrações e do seed
- **THEN** os dez serviços iniciais existem, todos ativos, com preço e duração preenchidos

### Requirement: Listagem pública de serviços
O sistema SHALL exibir publicamente apenas serviços ativos, ordenados pela ordem definida pelo administrador, mostrando nome, descrição, preço formatado (ex.: "R$ 45,00") e duração (ex.: "30 min").

#### Scenario: Visitante abre a página de serviços
- **WHEN** um visitante acessa a página inicial ou a página de serviços
- **THEN** vê a lista de serviços ativos com nome, descrição, preço e duração

#### Scenario: Serviço inativo
- **WHEN** um serviço está marcado como inativo
- **THEN** ele não aparece na listagem pública nem pode ser selecionado para agendamento

### Requirement: Combos
Um combo SHALL ser um serviço próprio, com preço e duração definidos pelo administrador, independentes da soma dos serviços que o compõem.

#### Scenario: Combo com desconto
- **WHEN** o combo "Corte + Barba" tem preço R$ 70,00 e os serviços avulsos somam R$ 80,00
- **THEN** o agendamento do combo usa o preço R$ 70,00 e a duração cadastrada do combo

### Requirement: Validação de dados do serviço
O sistema MUST rejeitar serviços com nome vazio, preço negativo ou duração que não seja múltiplo positivo de 5 minutos.

#### Scenario: Duração inválida
- **WHEN** o administrador tenta salvar um serviço com duração de 0 ou 22 minutos
- **THEN** o sistema recusa e informa que a duração deve ser múltiplo de 5 e maior que zero
