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
- July 7, 2025. Enhanced video summarization to match lilys.ai quality standards
  - Analyzed actual lilys.ai summary format and structure from reference link
  - Implemented concise, focused content matching lilys.ai's efficiency
  - Added highlight markers (==text==) and bold formatting for key concepts
  - Streamlined summary structure to prioritize core messages over lengthy descriptions
  - Enhanced prompt to generate lilys.ai-style brief, impactful summaries
  - Maintained professional analysis while significantly improving readability
  - Focused on essential information delivery rather than comprehensive coverage
- July 7, 2025. Fixed video count display and improved statistics accuracy
  - Added totalVideos field to statistics API and database queries
  - Fixed sidebar navigation to display correct video counts from stats API
  - Updated dashboard statistics cards to include video count display
  - Modified storage interface to include video count in stats calculations
  - Enhanced statistics consistency across all UI components
- July 7, 2025. Added Korean channel support and theme toggle functionality
  - Enhanced YouTube URL parsing to support international characters including Korean usernames
  - Added light/dark mode toggle with system preference detection
  - Implemented theme persistence using localStorage
  - Added simple one-click theme toggle button in header (light/dark mode)
  - Modified regex patterns to support Unicode characters in channel URLs
  - Improved URL validation for better international YouTube channel compatibility
  - Simplified theme toggle to single click instead of dropdown menu
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
  - Enhanced summary list search functionality with real-time header search
  - Added refresh button to summary list for manual data updates
  - Removed redundant search input from summary page filter section
  - Improved user experience with centralized search and refresh controls
  - Fixed bulk summary generation progress tracking issues
  - Added proper API endpoint `/api/videos/:videoId/summary` for video summary generation
  - Enhanced bulk summary creation with better error handling and progress monitoring
  - Improved progress store synchronization for multiple simultaneous summary generation
  - Modified video deletion to preserve summaries independently
  - Updated deletion confirmation messages to reflect summary preservation
  - Enhanced data integrity by keeping summaries when videos are removed
  - Fixed foreign key constraint error by setting videoId to nullable with SET NULL on delete
  - Updated database schema to allow summary preservation when videos are deleted
  - Modified all summary query methods to handle deleted videos gracefully
  - Added fallback display values for summaries of deleted videos ("삭제된 영상")
  - Fixed title inconsistency between video list and summary list
  - Modified summary creation to preserve original video titles
  - Updated OpenAI prompt to maintain video title consistency
  - Added re-summarization feature for existing summaries
  - Modified server endpoints to allow overwriting existing summaries
  - Enhanced UI to show re-summarize buttons for completed videos
  - Updated all view modes (list, grid, detailed) to support re-summarization
  - Fixed summary deletion error by correcting API request parameter order
  - Added missing summary deletion endpoint on server
  - Enhanced export functionality to handle deleted videos gracefully
  - Added automatic cache invalidation when clicking summary list menu for fresh data retrieval
  - Added count badges to sidebar menu items showing number of channels, videos, and summaries
  - Enhanced sidebar navigation with real-time statistics display
  - Updated progress monitoring to refresh every 3 seconds instead of 2 seconds
  - Added automatic summary list refresh when summaries are completed while viewing the page
  - Enhanced sidebar menu counts with real-time auto-refresh every 3 seconds
  - Added comprehensive cache invalidation for statistics when videos/summaries are created/deleted
  - All operations now trigger automatic menu count updates (channel creation, video deletion, summary generation/deletion)
  - Removed duplicate refresh button from summary list filter section to avoid UI confusion
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