# AI Development Rules & Guidelines

This document outlines the core technology stack and strict development rules for this application. All AI assistants working on this codebase must adhere to these guidelines.

## 🛠 Tech Stack

- **React**: Core UI library for building the application.
- **TypeScript**: Primary programming language. Strong typing is mandatory.
- **Tailwind CSS**: Utility-first CSS framework used for all styling.
- **shadcn/ui**: Pre-built, customizable UI component library.
- **Radix UI**: Headless UI primitives (the foundation of shadcn/ui components).
- **React Router**: Library for handling client-side routing.
- **lucide-react**: Official icon library for the application.

## 📜 Development Rules & Library Usage

### 1. Styling & CSS (Tailwind CSS)
- **Rule**: ALWAYS use Tailwind CSS utility classes for styling (layout, spacing, colors, typography, etc.).
- **Avoid**: Do not write custom CSS or inline styles (`style={{...}}`) unless absolutely necessary for dynamic values that Tailwind cannot handle.

### 2. UI Components (shadcn/ui & Radix)
- **Rule**: Always prioritize using the existing pre-built `shadcn/ui` components located in `src/components/ui/`.
- **Rule**: **DO NOT** modify the pre-built `shadcn/ui` component files directly. If a component needs significant visual or functional changes beyond what its props allow, wrap it or create a new custom component in `src/components/`.

### 3. Routing (React Router)
- **Rule**: All application routes must be defined and managed inside `src/App.tsx`.
- **Rule**: Use standard React Router hooks (`useNavigate`, `useParams`, etc.) for navigation and route state management.

### 4. Icons (lucide-react)
- **Rule**: ALWAYS use `lucide-react` for icons. Do not import icons from other libraries (like FontAwesome, Heroicons, etc.) unless explicitly requested.

### 5. Project Structure & Organization
- **Pages**: Put all route-level components in the `src/pages/` directory.
- **Components**: Put reusable, non-page components in the `src/components/` directory.
- **Entry Point**: `src/pages/Index.tsx` is the main/default page. Always ensure it correctly integrates newly built components if they are meant to be displayed immediately.

### 6. TypeScript & State Management
- **Rule**: Write strict TypeScript. Avoid using `any`; define explicit `Interfaces` or `Types` for component props, API responses, and complex state.
- **Rule**: Keep state management as simple as possible. Use React's built-in hooks (`useState`, `useContext`, `useReducer`) before reaching for external state management libraries, unless the complexity warrants it.
