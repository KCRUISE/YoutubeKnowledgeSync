# YouTube Content Summarizer

## Overview

This is a full-stack web application that automatically fetches and summarizes YouTube videos from registered channels using AI. Built with React frontend, Express backend, and PostgreSQL database with Drizzle ORM, the app provides an intuitive interface for managing YouTube channels and viewing AI-generated summaries.

## System Architecture

### Frontend Architecture
- **Framework**: React with Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful API endpoints
- **Development**: Hot reloading with Vite middleware integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon Database
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Migration Strategy**: Drizzle Kit for schema migrations
- **Connection**: Serverless-compatible database connections

## Key Components

### Database Schema
Three main entities with clear relationships:
- **Channels**: Store YouTube channel information (name, URL, frequency settings)
- **Videos**: Store video metadata fetched from YouTube API
- **Summaries**: Store AI-generated summaries with key points and tags

### External Dependencies
- **YouTube Data API v3**: For fetching channel and video information
- **OpenAI GPT-4o**: For generating intelligent video summaries
- **Neon Database**: Serverless PostgreSQL hosting

### Core Services
- **YouTubeService**: Handles YouTube API interactions and data parsing
- **OpenAIService**: Manages AI summarization with structured prompts
- **Storage Layer**: Abstracted data access with both in-memory and database implementations

## Data Flow

1. **Channel Registration**: User adds YouTube channel URL → System validates and extracts channel info → Channel stored in database
2. **Video Fetching**: System periodically fetches latest videos from registered channels → Video metadata stored
3. **AI Summarization**: Videos are processed through OpenAI API → Structured summaries generated with key points and tags
4. **Content Delivery**: Frontend displays summaries with search, filtering, and export capabilities

## External Dependencies

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `YOUTUBE_API_KEY` or `GOOGLE_API_KEY`: YouTube Data API access
- `OPENAI_API_KEY`: OpenAI API access for summarization

### Third-party Services
- **Neon Database**: Serverless PostgreSQL provider
- **YouTube Data API v3**: Video and channel metadata
- **OpenAI API**: AI-powered content summarization

## Deployment Strategy

### Development Environment
- Replit-native development with hot reloading
- Integrated PostgreSQL module
- Vite development server with Express middleware

### Production Build
- Frontend: Vite builds static assets to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Single-command deployment with `npm run build && npm run start`

### Hosting Configuration
- Autoscale deployment target on Replit
- Port 5000 mapped to external port 80
- Environment variables managed through Replit secrets

## Changelog
- July 7, 2025. Added progress monitoring and enhanced settings management
  - Implemented real-time progress monitoring modal with activity tracking and status updates
  - Added comprehensive settings management with state persistence and validation
  - Enhanced header with progress monitor button showing active task counts
  - Fixed settings save functionality with proper form state management and user feedback
  - Added progress statistics display (pending/processing, completed, failed, cancelled tasks)
  - Implemented settings reset functionality with confirmation messages
  - Added loading states and error handling for settings operations
  - Enhanced UI with Progress component for visual feedback on long-running operations
  - Fixed summary creation to run in background with proper progress tracking
  - Added cancel functionality for ongoing summary generation with AbortController
  - Implemented delete functionality for completed and failed progress items
  - Enhanced summary generation to appear in summary list after completion
  - Modified summary creation to use asynchronous processing preventing UI blocking
- July 4, 2025. Enhanced video selection and bulk operations
  - Fixed video selection issues by allowing all videos to be selected regardless of summary status
  - Modified deletion functionality to allow deletion of all videos (with or without summaries)
  - Fixed delete button activation logic to work when any videos are selected
  - Added clickable video card areas for easy selection with visual feedback (blue ring and background)
  - Added bulk summary generation feature for selected videos without summaries
  - Enhanced management bar with separate buttons for summary generation and deletion
  - Added customizable items per page display (6, 12, 24, 48, 100 options)
  - Updated deletion confirmation dialog to clarify that summaries are deleted with videos when applicable
  - Improved user experience with clear feedback for bulk operations and pagination controls
  - Added event propagation handling to prevent conflicts between card clicks and button clicks
- July 4, 2025. Added "New" badge display for videos fetched on the current day
  - Added createdAt field to videos table schema for tracking when videos were fetched
  - Added isNewToday() function to check if a video was fetched today
  - Enhanced video list display with blue "NEW" badge for new videos
  - Updated all view modes (list, grid, detailed) to show the "NEW" badge
  - Improved visual distinction between new and existing content with professional badge styling
- July 4, 2025. Enhanced video deletion with summary restriction
  - Modified video deletion to only allow deletion of videos with generated summaries
  - Added visual indicators (disabled checkboxes) for videos without summaries
  - Updated selection logic to prevent selection of non-summarized videos
  - Enhanced deletion confirmation dialog to clarify that summaries will also be deleted
  - Improved user feedback with toast messages for attempted invalid selections
- July 3, 2025. Advanced channel and video management features
  - Added bulk video fetching for all channels simultaneously
  - Implemented concurrent summary generation (no more waiting for one to finish)
  - Added video deletion functionality with confirmation dialogs
  - Enhanced UI with individual loading states for each video operation
  - Improved error handling and user feedback for all operations
- July 3, 2025. Enhanced video list page with advanced features
  - Added pagination with smart page navigation (max 5 visible pages)
  - Implemented multiple view modes: list, grid, and detailed view
  - Added comprehensive sorting by date, title, views, and duration
  - Integrated search functionality for titles and descriptions
  - Enhanced filtering with automatic page reset on search/sort changes
  - Improved responsive design for all view modes
- July 1, 2025. Obsidian MCP integration for direct export
  - Replaced file download with Obsidian direct integration using REST API
  - Added ObsidianMCPService for seamless vault integration
  - Updated export UI to show success messages for Obsidian saves
  - Added Obsidian setup instructions in settings page
  - Maintains backward compatibility with file download fallback
- July 1, 2025. UI improvements and frequency options expansion
  - Enhanced channel display to show channel name prominently with smaller channel ID
  - Added hourly frequency options (every 1, 3, 6, 12 hours) for more flexible scheduling
  - Fixed @username format YouTube channel URL parsing issues
  - Improved channel registration workflow with better visual hierarchy
- July 1, 2025. Database integration completed
  - Migrated from in-memory storage to PostgreSQL database
  - Implemented DatabaseStorage class with full CRUD operations
  - Added database relations and optimized queries for performance
  - Maintained data integrity with proper schema validation
- July 1, 2025. Enhanced AI summarization with lilys.ai-style structured analysis
  - Added sectioned content analysis with timestamps
  - Implemented core theme extraction and insights generation
  - Enhanced Obsidian markdown export with visual organization
  - Improved UI to display structured summaries with keywords and insights
- June 25, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
Summary quality preference: lilys.ai-level professional analysis with structured sections and deep insights.