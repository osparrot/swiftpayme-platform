# SwiftPayMe Web UI

A modern, responsive React application for the SwiftPayMe platform - enabling users to deposit physical assets, manage cryptocurrency portfolios, and conduct secure financial transactions.

## 🌟 Features

### Core Functionality
- **Asset Deposit Workflow**: Complete 4-step process for depositing gold, silver, diamonds, and other precious assets
- **Multi-Currency Wallet**: Support for USD, EUR, GBP with real-time currency conversion
- **Bitcoin Integration**: Full Bitcoin wallet functionality with buy, sell, send, and receive capabilities
- **Portfolio Management**: Comprehensive dashboard with asset allocation, performance tracking, and analytics
- **Transaction History**: Detailed transaction management with filtering, search, and export capabilities
- **Real-Time Notifications**: WebSocket-powered notifications for price alerts, transaction updates, and system messages

### User Experience
- **Responsive Design**: Mobile-first approach with seamless experience across all devices
- **Modern UI/UX**: Built with Tailwind CSS and Radix UI components for professional appearance
- **Dark/Light Mode**: Theme switching with user preference persistence
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support
- **Progressive Web App**: Offline capabilities and native app-like experience

### Security & Compliance
- **Multi-Factor Authentication**: Enhanced security with 2FA support
- **KYC/AML Integration**: Built-in identity verification and compliance workflows
- **Secure Asset Upload**: Document verification with encrypted file handling
- **Real-Time Security Monitoring**: Suspicious activity detection and alerts

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Modern web browser

### Installation

1. **Clone and Navigate**
   ```bash
   cd /path/to/swiftpayme/web-ui
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   # or
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Development Server**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

5. **Open Browser**
   Navigate to `http://localhost:3000`

## 🏗️ Build & Deployment

### Development Build
```bash
pnpm run build
```

### Production Deployment

#### Option 1: Using the Deployment Script
```bash
./deploy-web-ui.sh --start
```

#### Option 2: Manual Deployment
```bash
# Build the application
pnpm run build

# Serve using the included server
node serve.cjs
```

#### Option 3: Docker Deployment
```bash
# Build Docker image
docker build -t swiftpayme-web-ui .

# Run container
docker run -p 3000:80 swiftpayme-web-ui
```

## 📁 Project Structure

```
web-ui/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── auth/         # Authentication components
│   │   ├── common/       # Shared components (Navbar, Footer)
│   │   ├── dashboard/    # Dashboard-specific components
│   │   ├── notifications/# Notification system
│   │   ├── transactions/ # Transaction components
│   │   ├── wallet/       # Wallet components
│   │   ├── assets/       # Asset management components
│   │   └── ui/           # Base UI components
│   ├── contexts/         # React contexts
│   │   ├── AuthContext.jsx
│   │   ├── ThemeContext.jsx
│   │   └── NotificationContext.jsx
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components
│   │   ├── LandingPage.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Profile.jsx
│   │   ├── AssetDeposit.jsx
│   │   ├── Transactions.jsx
│   │   └── Wallet.jsx
│   ├── services/         # API and external services
│   │   ├── apiService.js
│   │   ├── authService.js
│   │   └── websocketService.js
│   ├── styles/           # Global styles
│   └── App.jsx           # Main application component
├── dist/                 # Build output
├── Dockerfile            # Docker configuration
├── nginx.conf            # Nginx configuration
├── serve.cjs             # Production server
└── deploy-web-ui.sh      # Deployment script
```

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws

# Feature Flags
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_BITCOIN_WALLET=true
VITE_ENABLE_ASSET_DEPOSIT=true

# Security
VITE_ENABLE_2FA=true
VITE_SESSION_TIMEOUT=3600000

# Supported Assets & Currencies
VITE_SUPPORTED_CURRENCIES=USD,EUR,GBP
VITE_SUPPORTED_ASSETS=gold,silver,diamond,platinum
```

### API Integration

The Web UI integrates with the SwiftPayMe API Gateway:

- **Authentication**: JWT-based authentication with refresh tokens
- **Real-time Updates**: WebSocket connection for live data
- **File Uploads**: Secure document and image upload for asset verification
- **Rate Limiting**: Built-in rate limiting and error handling

## 🎨 UI Components

### Component Library
- **Radix UI**: Accessible, unstyled components
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Beautiful, customizable icons
- **Recharts**: Responsive chart library
- **Framer Motion**: Smooth animations and transitions

### Custom Components
- **ResponsiveContainer**: Adaptive container with breakpoint support
- **ResponsiveGrid**: Flexible grid system
- **ResponsiveCard**: Interactive card component
- **NotificationCenter**: Comprehensive notification system
- **PortfolioChart**: Advanced portfolio visualization

## 📱 Mobile Experience

### Mobile-First Design
- Touch-friendly interface with minimum 44px touch targets
- Optimized layouts for small screens
- Swipe gestures and mobile navigation patterns

### Mobile Navigation
- Bottom navigation bar for authenticated users
- Collapsible menu system
- Quick actions and shortcuts

### Performance Optimization
- Code splitting and lazy loading
- Image optimization and compression
- Service worker for offline functionality
- Progressive loading strategies

## 🔐 Security Features

### Authentication & Authorization
- JWT token management with automatic refresh
- Role-based access control
- Session timeout and security monitoring
- Multi-factor authentication support

### Data Protection
- Client-side encryption for sensitive data
- Secure file upload with validation
- HTTPS enforcement
- Content Security Policy (CSP)

### Privacy & Compliance
- GDPR compliance features
- Cookie consent management
- Data retention policies
- Audit trail logging

## 🧪 Testing

### Running Tests
```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API integration and workflow testing
- **E2E Tests**: Complete user journey testing
- **Visual Regression**: UI consistency testing

## 🚀 Performance

### Optimization Features
- **Code Splitting**: Automatic route-based code splitting
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Image Optimization**: Automatic image compression and WebP conversion
- **Caching Strategy**: Intelligent caching for static assets
- **CDN Integration**: Content delivery network support

### Performance Metrics
- **Lighthouse Score**: 90+ across all categories
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1

## 🌐 Browser Support

### Supported Browsers
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Progressive Enhancement
- Core functionality works in older browsers
- Enhanced features for modern browsers
- Graceful degradation for unsupported features

## 📊 Analytics & Monitoring

### Built-in Analytics
- User interaction tracking
- Performance monitoring
- Error reporting and logging
- Conversion funnel analysis

### Integration Options
- Google Analytics 4
- Mixpanel
- Sentry for error tracking
- Custom analytics endpoints

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- ESLint configuration for code quality
- Prettier for code formatting
- Conventional commits for version control
- TypeScript for type safety (optional)

## 📚 Documentation

### Additional Resources
- [API Documentation](../api-gateway/README.md)
- [Component Storybook](./storybook/README.md)
- [Deployment Guide](./docs/deployment.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)

## 🆘 Support

### Getting Help
- Check the [troubleshooting guide](./docs/troubleshooting.md)
- Review [common issues](./docs/common-issues.md)
- Submit issues on GitHub
- Contact the development team

### Maintenance
- Regular dependency updates
- Security patch management
- Performance optimization
- Feature enhancement roadmap

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**SwiftPayMe Web UI** - Empowering users with secure, intuitive asset management and cryptocurrency trading capabilities.

For more information, visit our [main documentation](../README.md) or contact our development team.
