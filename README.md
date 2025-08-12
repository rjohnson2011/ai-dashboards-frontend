# VA Platform Code Reviews Dashboard - Frontend

A modern React dashboard for tracking and managing pull requests across Department of Veterans Affairs repositories, with a focus on backend team code reviews.

## Overview

This frontend application provides a comprehensive view of pull requests requiring review, CI/CD status, and team approval workflows. It's designed to help VA platform teams efficiently manage their code review process.

## Features

- **Pull Request Tracking**: Real-time view of all open pull requests
- **Smart Filtering**: Filter by review status, CI failures, drafts, and more
- **Backend Review Focus**: Highlights PRs ready for backend team review
- **CI/CD Integration**: Shows GitHub Actions status and failing checks
- **Historical Analytics**: Track PR trends over time
- **Multi-Repository Support**: Switch between different VA repositories
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **Lucide React** for icons
- **Recharts** for data visualization
- **React Router** for navigation

## Prerequisites

- Node.js 18+ and npm
- Access to the backend API (see [platform-code-reviews-api](https://github.com/department-of-veterans-affairs/platform-code-reviews-api))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/department-of-veterans-affairs/ai-dashboards-frontend.git
cd ai-dashboards-frontend
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Configure environment variables:
```env
# Backend API URL
VITE_API_URL=http://localhost:3000  # For local development
# VITE_API_URL=https://ai-dashboards.onrender.com  # For production
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── LoginButton.tsx # GitHub OAuth login
│   ├── UserProfile.tsx # User profile display
│   └── PRHistoryChart.tsx # PR trends visualization
├── services/           # API and auth services
│   └── auth.ts        # Authentication logic
├── Dashboard.tsx      # Main dashboard component
├── App.tsx           # App entry point
└── main.tsx          # React DOM entry point
```

## Features in Detail

### Pull Request Cards

- **Ready for Review**: PRs with approvals but no backend review
- **Total Pull Requests**: All open PRs in the repository
- **Failing CI**: PRs with failing GitHub Actions checks
- **Draft PRs**: Work-in-progress pull requests
- **PRs Needing Team Review**: All PRs awaiting backend review

### PR Table

- Sortable columns for easy organization
- Direct links to GitHub PRs and checks
- Approval status from team members
- Timeline of recent PR activity
- CI/CD status with failing check details

### Search and Filters

- Search by PR title, author, or number
- Filter by card categories
- Sort by various criteria (updated, created, approvals, etc.)

## Deployment

### Vercel (Recommended)

1. Fork this repository
2. Connect to Vercel
3. Set environment variables:
   - `VITE_API_URL`: Your backend API URL
4. Deploy

### Manual Deployment

1. Build the application:
```bash
npm run build
```

2. Serve the `dist` directory with any static hosting service

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **Dependency conflicts**: Use `npm install --legacy-peer-deps`
2. **API connection errors**: Verify `VITE_API_URL` is correct
3. **Build failures**: Ensure Node.js 18+ is installed

### Debug Mode

Enable debug logging in the browser console:
```javascript
localStorage.setItem('debug', 'true')
```

## License

This project is part of the Department of Veterans Affairs platform tools.

## Support

For issues and questions:
- Create an issue in this repository
- Contact the VA Platform team

## Related Projects

- [platform-code-reviews-api](https://github.com/department-of-veterans-affairs/platform-code-reviews-api) - Backend API
- [vets-api](https://github.com/department-of-veterans-affairs/vets-api) - Main VA API repository