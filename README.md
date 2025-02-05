# MacApps Hub

A modern platform for discovering and downloading Mac applications and games.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, ShadCN UI
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: AWS S3
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form + Zod

## Features

- App/game submission system
- Version control for applications
- Categories and tags
- Search and filter functionality
- Rating and review system
- User authentication
- Developer accounts
- Download history
- Favorites/wishlist
- Admin dashboard
- Secure file storage and download

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL
- AWS Account (for S3)

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and fill in the required values:
   ```
   DATABASE_URL=
   NEXTAUTH_URL=
   NEXTAUTH_SECRET=
   AWS_ACCESS_KEY_ID=
   AWS_SECRET_ACCESS_KEY=
   AWS_REGION=
   AWS_BUCKET_NAME=
   ```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── (auth)          # Authentication routes
│   ├── (dashboard)     # Dashboard routes
│   └── (marketing)     # Public marketing routes
├── components/         # React components
│   ├── ui/            # UI components
│   ├── forms/         # Form components
│   └── layouts/       # Layout components
├── lib/               # Utility functions
│   ├── auth/         # Authentication utilities
│   ├── db/           # Database utilities
│   └── utils/        # General utilities
├── types/            # TypeScript types
├── hooks/            # Custom React hooks
└── config/           # Configuration files
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
