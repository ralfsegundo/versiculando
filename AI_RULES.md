# AI Development Rules & Guidelines

Este documento define a stack de tecnologia principal e as regras estritas de desenvolvimento para esta aplicação (Versiculando). Todos os assistentes de IA que trabalharem neste código devem seguir estas diretrizes.

## 🛠 Tech Stack (Pilha de Tecnologia)

- **React 19**: Biblioteca UI principal da aplicação.
- **TypeScript**: Linguagem de programação principal. Tipagem forte é obrigatória.
- **Vite & Tailwind CSS v4**: Ferramenta de build rápida (Vite) com framework CSS utilitário para estilização.
- **Supabase**: Backend as a Service usado para banco de dados e possivelmente autenticação.
- **Express & WebSockets**: Servidor Node.js customizado (`server.ts`) para lidar com conexões em tempo real.
- **Framer Motion (`motion`)**: Biblioteca principal para animações e transições fluidas.
- **Bibliotecas Utilitárias**: 
  - `html2canvas`: Para captura e geração de imagens de elementos DOM.
  - `canvas-confetti`: Para efeitos visuais de confete.
  - `lucide-react`: Biblioteca oficial de ícones.

## 📜 Regras de Desenvolvimento e Uso de Bibliotecas

### 1. Estilização & CSS (Tailwind v4)
- **Regra**: SEMPRE use classes utilitárias do Tailwind CSS para toda a estilização (layout, espaçamento, cores, tipografia, etc.).
- **Evitar**: Não escreva CSS customizado ou estilos inline (`style={{...}}`) a menos que seja absolutamente necessário para valores dinâmicos que o Tailwind não consiga processar.

### 2. Animações (Framer Motion)
- **Regra**: Utilize o pacote `motion` (Framer Motion) para todas as animações complexas, transições de layout e micro-interações na interface.

### 3. Backend, Tempo Real e Banco de Dados (Express, WS, Supabase)
- **Regra**: O projeto possui um backend integrado em `server.ts` rodando Express com WebSockets (`ws`). Alterações que necessitem de tempo real devem utilizar esta infraestrutura.
- **Regra**: O Supabase (`@supabase/supabase-js`) deve ser utilizado para interações com o banco de dados (buscas, inserções, atualizações). Respeite as tipagens de retorno das queries.

### 4. Estrutura do Projeto e Ícones
- **Ícones**: SEMPRE use `lucide-react`. Não importe ícones de outras bibliotecas.
- **Componentização**: Crie componentes pequenos, focados e reutilizáveis na pasta adequada (ex: `src/components/`). Mantenha a lógica separada quando ela se tornar complexa.

### 5. TypeScript & Gerenciamento de Estado
- **Regra**: Escreva código TypeScript estrito. Evite usar `any`; defina `Interfaces` ou `Types` explícitos para props de componentes, respostas de APIs (especialmente do Supabase) e estados complexos.
- **Regra**: Mantenha o gerenciamento de estado simples. Use os hooks nativos do React 19 (`useState`, `useContext`, `useReducer`, `useActionState`, etc.) antes de buscar soluções externas complexas.

### 6. Geração de Imagens
- **Regra**: Ao usar `html2canvas` para transformar partes da UI em imagem, garanta que os componentes alvo tenham tamanhos definidos e lidem bem com o redimensionamento do canvas para evitar cortes ou problemas de resolução.
