# 🚀 EDA Orders - Sistema de Pedidos com Arquitetura Orientada a Eventos

Sistema de gerenciamento de pedidos utilizando **Event-Driven Architecture (EDA)** com comunicação assíncrona através de eventos.

## 📋 Sobre o Projeto

Este projeto implementa um sistema de pedidos onde os serviços se comunicam de forma **desacoplada** através de **eventos** publicados em um **Message Broker** (RabbitMQ).

## 🏗️ Arquitetura

### Serviços

- **Orders Service**: Gerencia pedidos
- **Inventory Service**: Controla estoque e reservas
- **Payment Service**: Processa pagamentos
- **Notification Service**: Envia emails

## 🔄 Fluxo

### Fluxograma Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO COMPLETO DO SISTEMA                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   CLIENTE    │
└──────┬───────┘
       │ POST /api/v1/orders
       ▼
┌─────────────────────┐
│  Orders Service     │
│  Cria ordem         │
│  Status: PENDING    │
└──────┬──────────────┘
       │ Publica evento
       ▼
┌─────────────────────┐
│ Inventory Worker    │
│ Consome OrderCreated│
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐      ┌──────────────────────┐
│ Para cada item      │──────▶│ Estoque suficiente?  │
└──────┬──────────────┘      └──────┬───────────────┘
       │                             │
       │ Sim                         │ Não
       ▼                             ▼
┌─────────────────────┐      ┌──────────────────────┐
│ Reserva produto      │      │ Libera reservas      │
│ Status: PENDING      │      │ parciais             │
│ Expira em 30min      │      │ Cancela pedido       │
└──────┬──────────────┘      │ Publica OrderCancelled│
       │                      └──────────────────────┘
       │
       │ Todos processados
       │ com sucesso
       ▼
┌─────────────────────┐
│ ⏳ Aguarda pagamento │
└──────┬──────────────┘
       │
       │ POST /api/v1/payments
       ▼
┌─────────────────────┐
│ Payment Service     │
│ Valida reservas     │
│ válidas?            │
└──────┬──────────────┘
       │
    ┌──┴──┐
    │     │
   Sim   Não
    │     │
    ▼     ▼
┌─────────────┐  ┌─────────────────┐
│ Cria        │  │ Cancela pedido  │
│ pagamento   │  │ Publica          │
│ Status:     │  │ OrderCancelled  │
│ PENDING     │  └─────────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Payment Gateway     │
│ Processa pagamento  │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Pagamento aprovado?│
└──────┬──────────────┘
       │
    ┌──┴──┐
    │     │
   Sim   Não
    │     │
    ▼     ▼
┌─────────────┐  ┌─────────────────┐
│ CONFIRMED   │  │ CANCELLED       │
│ Atualiza    │  │ Atualiza        │
│ pagamento   │  │ pagamento       │
└──────┬──────┘  └────────┬────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Publica             │  │ Publica              │
│ PaymentConfirmed    │  │ PaymentFailed        │
└──────┬──────────────┘  └──────────┬──────────┘
       │                            │
       │                            │
       ▼                            ▼
┌─────────────────────┐  ┌─────────────────────┐
│ RabbitMQ            │  │ RabbitMQ            │
│ Exchange: payments   │  │ Exchange: payments   │
│ Key: payment.confirmed│ │ Key: payment.failed │
└──────┬──────────────┘  └──────────┬──────────┘
       │                            │
       │                            │
       ▼                            ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Orders Worker       │  │ Orders Worker       │
│ Consome             │  │ Consome             │
│ PaymentConfirmed    │  │ PaymentFailed       │
└──────┬──────────────┘  └──────────┬──────────┘
       │                            │
       │                            │
       ▼                            ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Atualiza ordem      │  │ Atualiza ordem       │
│ Status: CONFIRMED   │  │ Status: CANCELLED    │
└──────┬──────────────┘  └──────────┬──────────┘
       │                            │
       │                            │
       ▼                            ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Publica             │  │ Publica              │
│ OrderConfirmed      │  │ OrderCancelled      │
└──────┬──────────────┘  └──────────┬──────────┘
       │                            │
       │                            │
       ▼                            ▼
┌─────────────────────┐  ┌─────────────────────┐
│ RabbitMQ            │  │ RabbitMQ            │
│ Exchange: orders    │  │ Exchange: orders    │
│ Key: order.confirmed│  │ Key: order.cancelled│
└──────┬──────────────┘  └──────────┬──────────┘
       │                            │
       │                            │
    ┌──┴──┐                      ┌──┴──┐
    │     │                      │     │
    ▼     ▼                      ▼     ▼
┌─────────────┐          ┌─────────────────────┐
│ Inventory   │          │ Inventory Worker    │
│ Worker      │          │ Consome            │
│ Consome     │          │ OrderCancelled     │
│ OrderConfirmed          └──────────┬──────────┘
└──────┬──────┘                      │
       │                             │
       ▼                             ▼
┌─────────────────────┐  ┌─────────────────────┐
│ Confirma reservas   │  │ Libera reservas     │
│ Status: CONFIRMED   │  │ Status: CANCELLED   │
└──────┬──────────────┘  └─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ Cria movimentação   │
│ INVENTORY OUT       │
└─────────────────────┘

┌─────────────────────┐          ┌─────────────────────┐
│ Notification Worker │          │ Notification Worker │
│ Consome             │          │ Consome             │
│ OrderConfirmed      │          │ OrderCancelled      │
└──────┬──────────────┘          └──────────┬──────────┘
       │                                    │
       ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────┐
│ Busca dados ordem   │          │ Busca dados ordem   │
└──────┬──────────────┘          └──────────┬──────────┘
       │                                    │
       ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────┐
│ Envia email         │          │ Envia email         │
│ de confirmação      │          │ de cancelamento     │
└──────┬──────────────┘          └──────────┬──────────┘
       │                                    │
       ▼                                    ▼
┌─────────────────────┐          ┌─────────────────────┐
│ ✅ Pedido           │          │ ❌ Pedido           │
│ confirmado          │          │ cancelado           │
│ Cliente notificado  │          │ Cliente notificado  │
└─────────────────────┘          └─────────────────────┘
```

### 1. Cliente cria pedido

- Cliente faz `POST /api/v1/orders`
- Orders Service cria pedido (status: `PENDING`)
- Publica evento `OrderCreated` no Message Broker

### 2. Processamento assíncrono

**Inventory Worker:**

- Consome `OrderCreated`
- Reserva produtos do pedido
- Valida disponibilidade de estoque
- Se estoque insuficiente para algum produto:
  - Libera reservas parciais já feitas
  - Cancela o pedido automaticamente
  - Publica `OrderCancelled`

### 3. Cliente processa pagamento

- Cliente faz `POST /api/v1/payments` com `orderId` e `amount`
- Payment Service valida se há reservas válidas (não expiradas) para todos os produtos
- Se reservas inválidas ou expiradas:
  - Cancela o pedido automaticamente
  - Publica `OrderCancelled`
- Se reservas válidas:
  - Processa pagamento via gateway
  - Publica `PaymentConfirmed` ou `PaymentFailed` no Message Broker

### 4. Confirmação do pedido (Fluxo de Sucesso)

**Orders Worker:**

- Consome `PaymentConfirmed`
- Atualiza pedido para `CONFIRMED`
- Publica `OrderConfirmed`

**Inventory Worker:**

- Consome `OrderConfirmed`
- Confirma reservas (cria movimentação OUT)

**Notification Worker:**

- Consome `OrderConfirmed`
- Envia email de confirmação ao cliente

### 5. Cancelamento (Fluxos de Erro)

**Cenários de cancelamento automático:**

1. **Falta de estoque (Inventory Worker):**

   - Inventory Worker detecta estoque insuficiente
   - Libera reservas parciais já feitas
   - Cancela pedido automaticamente
   - Publica `OrderCancelled`

2. **Reservas inválidas/expiradas (Payment Service):**

   - Payment Service detecta reservas inválidas ou expiradas
   - Cancela pedido automaticamente
   - Publica `OrderCancelled`

3. **Pagamento rejeitado (Orders Worker):**
   - Orders Worker consome `PaymentFailed`
   - Atualiza pedido para `CANCELLED`
   - Publica `OrderCancelled`

**Processamento do cancelamento:**

**Inventory Worker:**

- Consome `OrderCancelled`
- Libera reservas (Status: CANCELLED)

**Notification Worker:**

- Consome `OrderCancelled`
- Envia email de cancelamento ao cliente
