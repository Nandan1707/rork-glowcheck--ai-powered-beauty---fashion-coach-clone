# GlowCheck: AI-Powered Beauty & Fashion Coach

A production-ready React Native app built with Expo that provides AI-powered beauty analysis, outfit recommendations, and personalized coaching plans.

## 🚀 Features

- **Glow Analysis**: AI-powered facial analysis with skin health recommendations
- **Outfit Analysis**: Fashion advice and style recommendations
- **Personal Coaching**: 30-day beauty coaching plans with daily tasks
- **Community**: Share progress and connect with other users
- **Cross-Platform**: Works on iOS, Android, and Web
- **Production-Ready**: Comprehensive error handling, logging, and performance monitoring

## 🛠 Tech Stack

- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript
- **State Management**: React Query + Context API
- **Database**: Supabase
- **AI Services**: Google Vision API, OpenAI, Custom AI endpoints
- **Storage**: AWS S3
- **Authentication**: Supabase Auth
- **Styling**: React Native StyleSheet

## 📋 Prerequisites

- Node.js 18+ 
- Bun (recommended) or npm/yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd glowcheck-app
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # AI Services
   EXPO_PUBLIC_GOOGLE_VISION_API_KEY=your_google_vision_api_key
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
   
   # AWS S3 Configuration
   EXPO_PUBLIC_AWS_REGION=your_aws_region
   EXPO_PUBLIC_AWS_S3_BUCKET_NAME=your_s3_bucket_name
   EXPO_PUBLIC_AWS_ACCESS_KEY_ID=your_aws_access_key_id
   EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
   
   # Development
   EXPO_PUBLIC_USE_REAL_APIS=false
   ```

4. **Database Setup**
   
   Set up your Supabase database with the following tables:
   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     email TEXT UNIQUE NOT NULL,
     name TEXT,
     avatar_url TEXT,
     subscription_tier TEXT DEFAULT 'free',
     created_at TIMESTAMP DEFAULT NOW()
   );
   
   -- Add more tables as needed for your app
   ```

## 🚀 Development

1. **Start the development server**
   ```bash
   bun start
   # or
   npm start
   ```

2. **Run on specific platforms**
   ```bash
   # iOS
   bun run ios
   
   # Android
   bun run android
   
   # Web
   bun run web
   ```

## 🏗 Production Build

1. **Configure app.json**
   
   Update your `app.json` with production settings:
   ```json
   {
     \"expo\": {
       \"name\": \"GlowCheck\",
       \"slug\": \"glowcheck-app\",
       \"version\": \"1.0.0\",
       \"extra\": {
         \"supabaseUrl\": \"your_production_supabase_url\",
         \"supabaseAnonKey\": \"your_production_supabase_anon_key\"
       }
     }
   }
   ```

2. **Build for production**
   ```bash
   # Web build
   expo build:web
   
   # For mobile builds, use EAS Build
   eas build --platform all
   ```

## 🔒 Security

- API keys are managed through environment variables
- Sensitive data is never logged in production
- Proper error boundaries prevent app crashes
- Input validation and sanitization

## 📊 Monitoring & Analytics

The app includes built-in monitoring:

- **Error Tracking**: Comprehensive error boundaries and logging
- **Performance Monitoring**: Track slow operations and API calls
- **User Analytics**: Optional analytics integration
- **Crash Reporting**: Production-ready error reporting

## 🧪 Testing

```bash
# Run tests
bun test

# Run type checking
bun run type-check

# Run linting
bun run lint
```

## 📱 Features Overview

### Glow Analysis
- AI-powered facial analysis using Google Vision API
- Skin health scoring and recommendations
- Personalized skincare routine suggestions

### Outfit Analysis
- Fashion analysis and style recommendations
- Color matching and seasonal appropriateness
- Event-specific outfit advice

### Coaching Plans
- 30-day personalized beauty coaching
- Daily tasks and progress tracking
- Habit formation and goal achievement

### Community
- Share progress photos and achievements
- Connect with other users
- Get inspiration and support

## 🔧 Configuration

### Feature Flags
The app uses feature flags for production control:

```typescript
FEATURES: {
  ENABLE_ANALYTICS: !__DEV__,
  ENABLE_CRASH_REPORTING: !__DEV__,
  ENABLE_PERFORMANCE_MONITORING: !__DEV__,
  USE_MOCK_DATA: __DEV__ && !process.env.EXPO_PUBLIC_USE_REAL_APIS,
}
```

### Logging
Production-ready logging with different levels:
- DEBUG: Development debugging
- INFO: General information
- WARN: Warning messages
- ERROR: Error conditions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact the development team

## 🚀 Deployment

### Web Deployment
```bash
expo build:web
# Deploy the web-build folder to your hosting service
```

### Mobile App Store Deployment
```bash
# Build for app stores
eas build --platform all

# Submit to app stores
eas submit --platform all
```

---

Built with ❤️ using React Native and Expo