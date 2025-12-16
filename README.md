# 🚀 Meu Projeto no Firebase Hosting

Este projeto está configurado para ser hospedado no **Firebase Hosting**.

---

## 📋 Pré-requisitos

- [Node.js](https://nodejs.org/) instalado (versão LTS recomendada)
- [Firebase CLI](https://firebase.google.com/docs/cli) instalada globalmente
  ```bash
  npm install -g firebase-tools
 
 ⚙️ Configuração inicial

    Login no Firebase

    firebase login


Inicializar o projeto (se ainda não estiver configurado)

firebase init


⚙️ Configuração inicial

Login no Firebase

firebase login


Inicializar o projeto (se ainda não estiver configurado)

firebase init

🔀 Multiambiente (dev / staging / prod)

Se você precisar trabalhar com mais de um ambiente no Firebase:

Adicionar ambientes ao CLI

firebase use --add


## rodar local: ## 
firebase serve --only hosting

Crie aliases, por exemplo: dev, staging, prod.

Trocar entre ambientes

firebase use dev
firebase use prod


Deploy direcionado para um projeto específico

## deploy o front
firebase deploy --only hosting --project agenda-clinica-fono-inova


## deploy o BD
firebase deploy --only database --project agenda-clinica-fono-inova

npm install -g firebase-tools             


