# GitHub Repository Manager

## Overview

This is a full-stack web application that provides a comprehensive GitHub repository management interface. Built with modern React and Express.js, it allows users to browse, edit, and manage their GitHub repositories directly through a web interface. The application features a file explorer, code editor with syntax highlighting, and commit functionality, essentially providing a web-based IDE for GitHub repositories.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent, professional UI components
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Code Editor**: Monaco Editor integration for syntax highlighting and code editing capabilities
- **UI Components**: Comprehensive set of Radix UI primitives through shadcn/ui for accessibility and consistency

### Backend Architecture
- **Framework**: Express.js with TypeScript for API development
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Storage**: In-memory storage interface with extensible design for easy database integration
- **Development**: Vite integration for hot module replacement and development server

### Data Storage Solutions
- **Database**: PostgreSQL configured through Drizzle ORM with migrations support
- **Connection**: Neon Database serverless PostgreSQL for cloud deployment
- **Schema Management**: Drizzle Kit for database migrations and schema management
- **Local Development**: In-memory storage implementation for development and testing

### Authentication and Authorization
- **GitHub Integration**: Personal Access Token-based authentication with GitHub API
- **Token Storage**: Client-side localStorage for token persistence
- **API Access**: Full GitHub API integration for repository operations

### External Dependencies

#### Core Technologies
- **Neon Database**: Serverless PostgreSQL hosting for production data storage
- **GitHub API**: Complete integration for repository management, file operations, and commit handling
- **Monaco Editor**: Microsoft's code editor for in-browser code editing with IntelliSense

#### Development Tools
- **Vite**: Build tool and development server with hot reload
- **TypeScript**: Type safety across frontend and backend
- **Drizzle Kit**: Database migration and schema management
- **ESBuild**: Fast bundling for production builds

#### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Radix UI**: Headless UI primitives for accessibility
- **shadcn/ui**: Pre-built component library built on Radix UI
- **Lucide React**: Icon library for consistent iconography

#### State and Data Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form handling with validation
- **Zod**: Runtime type validation and schema parsing

The application follows a modern full-stack architecture with clear separation between frontend and backend concerns, leveraging industry-standard tools for development, deployment, and user experience.