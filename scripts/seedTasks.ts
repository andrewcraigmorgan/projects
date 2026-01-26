import mongoose from 'mongoose'
import { Task } from '../server/models/Task'
import { Project } from '../server/models/Project'
import { User } from '../server/models/User'
import { Organization } from '../server/models/Organization'
import { Milestone } from '../server/models/Milestone'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/projects'

// Test users to create for multi-user assignment testing
const TEST_USERS = [
  { name: 'Alice Chen', email: 'alice@example.com', role: 'team' as const },
  { name: 'Bob Martinez', email: 'bob@example.com', role: 'team' as const },
  { name: 'Carol Williams', email: 'carol@example.com', role: 'team' as const },
  { name: 'David Kim', email: 'david@example.com', role: 'client' as const },
  { name: 'Eve Johnson', email: 'eve@example.com', role: 'client' as const },
]

const DEFAULT_PROJECT = {
  name: 'Demo Project',
  description: 'A comprehensive project management application with advanced features for team collaboration, task tracking, and project oversight. This platform enables organizations to streamline their workflows and improve productivity.',
}

const statuses = ['todo', 'awaiting_approval', 'open', 'in_review', 'done'] as const
const priorities = ['low', 'medium', 'high'] as const

// Milestone templates with rich descriptions
const milestoneTemplates = [
  {
    name: 'Phase 1: Foundation',
    description: '<p>This phase establishes the core infrastructure and security foundations of the application. Key deliverables include the authentication system, database architecture, and API framework.</p><p><strong>Success Criteria:</strong></p><ul><li>All authentication flows functioning correctly</li><li>API performance baseline established</li><li>Security audit completed</li></ul>',
    status: 'active' as const,
  },
  {
    name: 'Phase 2: Core Features',
    description: '<p>Development of the primary user-facing features and functionality. This phase focuses on delivering the main value proposition of the application.</p><p><strong>Key Objectives:</strong></p><ul><li>Dashboard with real-time data visualization</li><li>Mobile application MVP</li><li>User workflow optimization</li></ul>',
    status: 'pending' as const,
  },
  {
    name: 'Phase 3: Polish & Launch',
    description: '<p>Final preparation for production release including comprehensive testing, documentation, and deployment procedures.</p><p><strong>Deliverables:</strong></p><ul><li>Complete user documentation</li><li>Performance optimization</li><li>Production deployment ready</li></ul>',
    status: 'pending' as const,
  },
]

// Map epic tasks to milestones (by index)
const taskToMilestoneMap: Record<string, number> = {
  'User Authentication System': 0, // Phase 1
  'API Performance Optimization': 0, // Phase 1
  'Dashboard Redesign': 1, // Phase 2
  'Mobile App Development': 1, // Phase 2
  'Documentation Overhaul': 2, // Phase 3
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Rich task templates with detailed descriptions
const taskTemplates = [
  {
    title: 'User Authentication System',
    description: `<p>Implement a comprehensive user authentication system that supports multiple authentication methods and provides secure access control across the application.</p>
<p><strong>Requirements:</strong></p>
<ul>
<li>Support for email/password authentication with secure password policies</li>
<li>OAuth 2.0 integration with major providers (Google, GitHub, Microsoft)</li>
<li>Two-factor authentication (2FA) using TOTP</li>
<li>Session management with configurable timeout policies</li>
<li>Account lockout protection after failed login attempts</li>
</ul>
<p><strong>Security Considerations:</strong></p>
<p>All authentication flows must comply with OWASP security guidelines. Passwords must be hashed using bcrypt with appropriate work factors. JWT tokens should have reasonable expiration times and support token refresh mechanisms.</p>`,
    subtasks: [
      {
        title: 'Design login flow',
        description: `<p>Create the complete user experience design for the authentication flow, including all screens and interaction states.</p>
<p><strong>Deliverables:</strong></p>
<ul>
<li>High-fidelity mockups for all authentication screens</li>
<li>Interactive prototype demonstrating user flows</li>
<li>Accessibility compliance documentation</li>
<li>Error state designs and messaging guidelines</li>
</ul>`,
        subtasks: [
          {
            title: 'Create wireframes',
            description: `<p>Develop low-fidelity wireframes for all authentication screens including login, registration, password reset, and 2FA verification.</p>
<p>The wireframes should clearly show:</p>
<ul>
<li>Form field placement and labels</li>
<li>Call-to-action button positioning</li>
<li>Navigation elements and back options</li>
<li>Mobile and desktop layout variations</li>
</ul>`,
          },
          {
            title: 'Review with stakeholders',
            description: `<p>Conduct design review sessions with key stakeholders to gather feedback and ensure alignment with business requirements.</p>
<p><strong>Participants:</strong> Product Manager, Security Lead, UX Director</p>
<p><strong>Agenda:</strong></p>
<ol>
<li>Walkthrough of proposed authentication flows</li>
<li>Security considerations discussion</li>
<li>Accessibility review</li>
<li>Timeline and resource alignment</li>
</ol>`,
          },
          {
            title: 'Finalize design specs',
            description: `<p>Complete the final design specifications document including all visual assets, interaction specifications, and implementation guidelines.</p>
<p>The specification document should include:</p>
<ul>
<li>Component library references</li>
<li>Color palette and typography guidelines</li>
<li>Animation and transition specifications</li>
<li>Responsive breakpoint definitions</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Implement backend auth',
        description: `<p>Build the server-side authentication infrastructure including API endpoints, security middleware, and database models.</p>
<p><strong>Technical Stack:</strong></p>
<ul>
<li>Node.js with Express/Fastify framework</li>
<li>MongoDB for user data storage</li>
<li>Redis for session management</li>
<li>JWT for stateless authentication tokens</li>
</ul>`,
        subtasks: [
          {
            title: 'Set up JWT tokens',
            description: `<p>Implement JSON Web Token generation and validation for secure stateless authentication.</p>
<p><strong>Implementation Details:</strong></p>
<ul>
<li>Access tokens with 15-minute expiration</li>
<li>Refresh tokens with 7-day expiration stored in HTTP-only cookies</li>
<li>Token blacklisting for logout functionality</li>
<li>Automatic token refresh mechanism</li>
</ul>`,
          },
          {
            title: 'Create user model',
            description: `<p>Design and implement the User data model with all required fields for authentication and profile management.</p>
<p><strong>Model Fields:</strong></p>
<ul>
<li>Unique identifier (UUID)</li>
<li>Email address (unique, indexed)</li>
<li>Password hash (bcrypt)</li>
<li>Account status (active, suspended, pending verification)</li>
<li>2FA configuration (enabled, secret, backup codes)</li>
<li>Login history and audit trail</li>
</ul>`,
          },
          {
            title: 'Add password hashing',
            description: `<p>Implement secure password hashing using bcrypt with appropriate configuration for production security.</p>
<p><strong>Security Requirements:</strong></p>
<ul>
<li>Minimum bcrypt work factor of 12</li>
<li>Password strength validation (minimum 8 characters, mixed case, numbers, symbols)</li>
<li>Prevention of commonly used passwords</li>
<li>Secure password comparison to prevent timing attacks</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Build frontend components',
        description: `<p>Develop reusable Vue.js components for all authentication-related user interfaces.</p>
<p><strong>Component Architecture:</strong></p>
<p>Components should follow the atomic design methodology, with base form elements composed into larger authentication form components.</p>
<ul>
<li>Form validation with real-time feedback</li>
<li>Loading states and error handling</li>
<li>Accessibility compliance (WCAG 2.1 AA)</li>
<li>Internationalization support</li>
</ul>`,
        subtasks: [
          {
            title: 'Login form component',
            description: `<p>Create a comprehensive login form component with email/password fields, remember me option, and social login buttons.</p>
<p><strong>Features:</strong></p>
<ul>
<li>Email validation with real-time feedback</li>
<li>Password visibility toggle</li>
<li>Remember me checkbox with secure implementation</li>
<li>Social login integration (Google, GitHub)</li>
<li>Forgot password link</li>
</ul>`,
          },
          {
            title: 'Registration form',
            description: `<p>Build the user registration form with comprehensive validation and onboarding flow integration.</p>
<p><strong>Form Fields:</strong></p>
<ul>
<li>Full name</li>
<li>Email address with availability check</li>
<li>Password with strength indicator</li>
<li>Password confirmation</li>
<li>Terms of service acceptance</li>
<li>Optional organization/team selection</li>
</ul>`,
          },
          {
            title: 'Password reset flow',
            description: `<p>Implement the complete password reset flow including request form, email verification, and new password entry.</p>
<p><strong>Flow Steps:</strong></p>
<ol>
<li>User requests reset via email address</li>
<li>System sends secure time-limited token via email</li>
<li>User clicks link and enters new password</li>
<li>System validates token and updates password</li>
<li>All existing sessions are invalidated</li>
</ol>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Dashboard Redesign',
    description: `<p>Complete redesign of the main application dashboard to improve user experience, data visualization, and information hierarchy.</p>
<p><strong>Project Goals:</strong></p>
<ul>
<li>Reduce time-to-insight for key metrics by 40%</li>
<li>Improve mobile dashboard usability score to 85+</li>
<li>Support customizable widget layouts</li>
<li>Real-time data updates without page refresh</li>
</ul>
<p><strong>Design Principles:</strong></p>
<p>The new dashboard will follow a progressive disclosure pattern, showing high-level summaries with drill-down capability for detailed analysis.</p>`,
    subtasks: [
      {
        title: 'Research user needs',
        description: `<p>Conduct comprehensive user research to understand current pain points and desired improvements for the dashboard experience.</p>
<p><strong>Research Methods:</strong></p>
<ul>
<li>User interviews with 15-20 active users</li>
<li>Survey distribution to full user base</li>
<li>Analytics review of current dashboard usage</li>
<li>Competitive analysis of similar products</li>
</ul>`,
        subtasks: [
          {
            title: 'Conduct user interviews',
            description: `<p>Schedule and conduct one-on-one interviews with representative users from different segments to understand their dashboard usage patterns and needs.</p>
<p><strong>Interview Focus Areas:</strong></p>
<ul>
<li>Daily workflow and dashboard interaction frequency</li>
<li>Most and least used dashboard features</li>
<li>Pain points and frustrations</li>
<li>Desired features and improvements</li>
<li>Mobile usage patterns and requirements</li>
</ul>`,
          },
          {
            title: 'Analyze usage data',
            description: `<p>Perform deep analysis of existing dashboard analytics to identify usage patterns, popular features, and areas of drop-off.</p>
<p><strong>Metrics to Analyze:</strong></p>
<ul>
<li>Widget interaction rates</li>
<li>Time spent on dashboard vs. detail pages</li>
<li>Feature usage heat maps</li>
<li>Mobile vs. desktop usage breakdown</li>
<li>Session duration and return frequency</li>
</ul>`,
          },
          {
            title: 'Create user personas',
            description: `<p>Develop detailed user personas based on research findings to guide design decisions throughout the project.</p>
<p><strong>Persona Elements:</strong></p>
<ul>
<li>Demographics and role description</li>
<li>Goals and motivations</li>
<li>Pain points and frustrations</li>
<li>Technology comfort level</li>
<li>Typical usage scenarios</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Create new layouts',
        description: `<p>Design responsive layouts for the new dashboard that work seamlessly across all device types and screen sizes.</p>
<p><strong>Layout Requirements:</strong></p>
<ul>
<li>Fluid grid system with configurable columns</li>
<li>Widget drag-and-drop repositioning</li>
<li>Collapsible sidebar navigation</li>
<li>Full-screen focus mode for individual widgets</li>
</ul>`,
        subtasks: [
          {
            title: 'Mobile layout',
            description: `<p>Design the mobile-first dashboard layout optimized for touch interaction and limited screen real estate.</p>
<p><strong>Mobile Considerations:</strong></p>
<ul>
<li>Single column widget stack</li>
<li>Swipe gestures for widget navigation</li>
<li>Thumb-friendly action buttons</li>
<li>Collapsible sections to manage content density</li>
<li>Pull-to-refresh functionality</li>
</ul>`,
          },
          {
            title: 'Desktop layout',
            description: `<p>Create the full-featured desktop dashboard layout maximizing screen space utilization and information density.</p>
<p><strong>Desktop Features:</strong></p>
<ul>
<li>Multi-column grid layout (up to 4 columns)</li>
<li>Resizable widgets with snap-to-grid</li>
<li>Side panel for quick actions and notifications</li>
<li>Keyboard shortcuts for power users</li>
<li>Multi-monitor support for expanded views</li>
</ul>`,
          },
          {
            title: 'Tablet layout',
            description: `<p>Design an intermediate layout for tablet devices that bridges the mobile and desktop experiences.</p>
<p><strong>Tablet Optimizations:</strong></p>
<ul>
<li>Two-column widget grid</li>
<li>Touch-optimized with larger hit targets than desktop</li>
<li>Landscape and portrait mode support</li>
<li>Optional sidebar that can be toggled</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Implement changes',
        description: `<p>Execute the technical implementation of the new dashboard design, including all frontend components and data integration.</p>
<p><strong>Implementation Approach:</strong></p>
<p>Use a phased rollout strategy with feature flags to gradually introduce the new dashboard to users while maintaining the ability to rollback if issues arise.</p>`,
        subtasks: [
          {
            title: 'Update CSS framework',
            description: `<p>Migrate from the current CSS framework to Tailwind CSS for improved maintainability and consistency.</p>
<p><strong>Migration Steps:</strong></p>
<ol>
<li>Install and configure Tailwind CSS</li>
<li>Create design token configuration</li>
<li>Build component utility classes</li>
<li>Migrate existing components systematically</li>
<li>Remove old CSS framework dependencies</li>
</ol>`,
          },
          {
            title: 'Refactor grid system',
            description: `<p>Implement a new CSS Grid-based layout system that supports the widget-based dashboard architecture.</p>
<p><strong>Grid Features:</strong></p>
<ul>
<li>Flexible column configuration</li>
<li>Auto-placement algorithm for widgets</li>
<li>Gap and spacing utilities</li>
<li>Nested grid support for complex widgets</li>
</ul>`,
          },
          {
            title: 'Add responsive breakpoints',
            description: `<p>Define and implement responsive breakpoints that ensure optimal display across all target device sizes.</p>
<p><strong>Breakpoint Definitions:</strong></p>
<ul>
<li>Mobile: 320px - 767px</li>
<li>Tablet: 768px - 1023px</li>
<li>Desktop: 1024px - 1439px</li>
<li>Large Desktop: 1440px+</li>
</ul>`,
          },
        ],
      },
    ],
  },
  {
    title: 'API Performance Optimization',
    description: `<p>Comprehensive optimization of the backend API to improve response times, reduce server load, and enhance scalability.</p>
<p><strong>Performance Targets:</strong></p>
<ul>
<li>P95 response time under 200ms</li>
<li>Support for 10,000 concurrent users</li>
<li>Database query time reduction of 50%</li>
<li>API throughput increase of 3x</li>
</ul>
<p><strong>Optimization Areas:</strong></p>
<p>Focus on the most impactful optimizations including database query efficiency, caching strategy, and request handling pipeline.</p>`,
    subtasks: [
      {
        title: 'Identify bottlenecks',
        description: `<p>Perform comprehensive performance analysis to identify the primary bottlenecks in the current API implementation.</p>
<p><strong>Analysis Tools:</strong></p>
<ul>
<li>Application Performance Monitoring (APM)</li>
<li>Database query profiler</li>
<li>Load testing with realistic traffic patterns</li>
<li>Memory and CPU profiling</li>
</ul>`,
        subtasks: [
          {
            title: 'Profile database queries',
            description: `<p>Analyze all database queries to identify slow queries, missing indexes, and inefficient query patterns.</p>
<p><strong>Profiling Steps:</strong></p>
<ul>
<li>Enable MongoDB profiler for slow queries (&gt;100ms)</li>
<li>Analyze explain plans for critical queries</li>
<li>Identify N+1 query patterns</li>
<li>Document index usage statistics</li>
<li>Create optimization recommendations report</li>
</ul>`,
          },
          {
            title: 'Analyze API response times',
            description: `<p>Measure and analyze response times across all API endpoints to identify the slowest and most frequently called endpoints.</p>
<p><strong>Metrics to Collect:</strong></p>
<ul>
<li>Average, P50, P95, P99 response times per endpoint</li>
<li>Request volume by endpoint</li>
<li>Error rates and timeout frequency</li>
<li>Response size distribution</li>
</ul>`,
          },
          {
            title: 'Review caching strategy',
            description: `<p>Evaluate the current caching implementation and identify opportunities for improved cache utilization.</p>
<p><strong>Cache Review Areas:</strong></p>
<ul>
<li>Cache hit/miss ratios by key pattern</li>
<li>Cache invalidation effectiveness</li>
<li>Memory utilization and eviction rates</li>
<li>Opportunities for additional caching layers</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Implement caching',
        description: `<p>Design and implement a multi-layer caching strategy to reduce database load and improve response times.</p>
<p><strong>Caching Layers:</strong></p>
<ul>
<li>Application-level cache (in-memory)</li>
<li>Distributed cache (Redis)</li>
<li>HTTP cache headers for client-side caching</li>
<li>CDN caching for static assets</li>
</ul>`,
        subtasks: [
          {
            title: 'Set up Redis',
            description: `<p>Deploy and configure Redis as the primary distributed caching solution for the application.</p>
<p><strong>Configuration Requirements:</strong></p>
<ul>
<li>Redis Cluster setup for high availability</li>
<li>Memory allocation and eviction policy configuration</li>
<li>Connection pooling setup</li>
<li>Monitoring and alerting configuration</li>
<li>Backup and persistence settings</li>
</ul>`,
          },
          {
            title: 'Cache frequent queries',
            description: `<p>Implement caching for the most frequently executed database queries identified during profiling.</p>
<p><strong>Implementation Approach:</strong></p>
<ul>
<li>Identify top 20 queries by frequency</li>
<li>Design cache key schema</li>
<li>Implement cache-aside pattern</li>
<li>Set appropriate TTL values based on data volatility</li>
<li>Add cache metrics collection</li>
</ul>`,
          },
          {
            title: 'Add cache invalidation',
            description: `<p>Implement robust cache invalidation mechanisms to ensure data consistency across the caching layer.</p>
<p><strong>Invalidation Strategies:</strong></p>
<ul>
<li>Event-driven invalidation on data mutations</li>
<li>Tag-based invalidation for related entities</li>
<li>Graceful degradation on cache failures</li>
<li>Cache warming on application startup</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Database optimization',
        description: `<p>Optimize the MongoDB database configuration and query patterns for improved performance.</p>
<p><strong>Optimization Focus:</strong></p>
<ul>
<li>Index optimization and creation</li>
<li>Query rewriting for efficiency</li>
<li>Schema denormalization where appropriate</li>
<li>Read replica configuration for read-heavy workloads</li>
</ul>`,
        subtasks: [
          {
            title: 'Add missing indexes',
            description: `<p>Create indexes for frequently queried fields and compound queries identified during profiling.</p>
<p><strong>Index Strategy:</strong></p>
<ul>
<li>Single field indexes for equality queries</li>
<li>Compound indexes for multi-field queries</li>
<li>Text indexes for search functionality</li>
<li>Covered query optimization where possible</li>
<li>Index intersection analysis</li>
</ul>`,
          },
          {
            title: 'Optimize slow queries',
            description: `<p>Rewrite slow queries identified during profiling to improve execution efficiency.</p>
<p><strong>Optimization Techniques:</strong></p>
<ul>
<li>Query projection to limit returned fields</li>
<li>Aggregation pipeline optimization</li>
<li>Batch operations for bulk updates</li>
<li>Query plan analysis and hints</li>
</ul>`,
          },
          {
            title: 'Consider data sharding',
            description: `<p>Evaluate and potentially implement database sharding for improved horizontal scalability.</p>
<p><strong>Sharding Considerations:</strong></p>
<ul>
<li>Shard key selection based on query patterns</li>
<li>Data distribution analysis</li>
<li>Cross-shard query impact assessment</li>
<li>Migration strategy for existing data</li>
</ul>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Mobile App Development',
    description: `<p>Develop a native-quality mobile application using React Native that provides full feature parity with the web application.</p>
<p><strong>Platform Support:</strong></p>
<ul>
<li>iOS 14+ (iPhone and iPad)</li>
<li>Android 10+ (phones and tablets)</li>
</ul>
<p><strong>Key Features:</strong></p>
<ul>
<li>Offline-first architecture with sync</li>
<li>Push notifications for real-time updates</li>
<li>Biometric authentication support</li>
<li>Deep linking for navigation from external sources</li>
<li>Native performance for smooth 60fps animations</li>
</ul>`,
    subtasks: [
      {
        title: 'Set up project',
        description: `<p>Initialize the React Native project with all required configurations, dependencies, and development tooling.</p>
<p><strong>Project Setup Requirements:</strong></p>
<ul>
<li>React Native with TypeScript configuration</li>
<li>iOS and Android native module setup</li>
<li>Code signing and provisioning profiles</li>
<li>Development, staging, and production environments</li>
</ul>`,
        subtasks: [
          {
            title: 'Initialize React Native',
            description: `<p>Create the base React Native project with TypeScript template and configure the development environment.</p>
<p><strong>Setup Steps:</strong></p>
<ol>
<li>Initialize project with react-native-cli</li>
<li>Configure TypeScript with strict mode</li>
<li>Set up path aliases for clean imports</li>
<li>Configure ESLint and Prettier</li>
<li>Add Husky for pre-commit hooks</li>
</ol>`,
          },
          {
            title: 'Configure build tools',
            description: `<p>Set up the build configuration for both iOS and Android platforms including signing, environments, and optimization.</p>
<p><strong>Build Configuration:</strong></p>
<ul>
<li>Fastlane setup for automated builds</li>
<li>Environment-specific configuration files</li>
<li>App icons and splash screen generation</li>
<li>ProGuard/R8 configuration for Android</li>
<li>Bitcode settings for iOS</li>
</ul>`,
          },
          {
            title: 'Set up CI/CD pipeline',
            description: `<p>Configure continuous integration and deployment pipeline for automated testing and app store submissions.</p>
<p><strong>Pipeline Stages:</strong></p>
<ol>
<li>Code checkout and dependency installation</li>
<li>Linting and type checking</li>
<li>Unit and integration tests</li>
<li>Build generation for all platforms</li>
<li>Automated deployment to TestFlight/Play Console</li>
</ol>`,
          },
        ],
      },
      {
        title: 'Core features',
        description: `<p>Implement the core functionality required for the mobile application MVP release.</p>
<p><strong>MVP Feature Set:</strong></p>
<ul>
<li>User authentication with biometrics</li>
<li>Project and task management</li>
<li>Push notification handling</li>
<li>Offline data access and sync</li>
</ul>`,
        subtasks: [
          {
            title: 'Navigation system',
            description: `<p>Implement the application navigation structure using React Navigation with proper deep linking support.</p>
<p><strong>Navigation Requirements:</strong></p>
<ul>
<li>Tab-based main navigation</li>
<li>Stack navigation for detail screens</li>
<li>Modal presentation for forms</li>
<li>Deep link handling for external navigation</li>
<li>Navigation state persistence</li>
</ul>`,
          },
          {
            title: 'State management',
            description: `<p>Set up global state management solution with persistence for offline support.</p>
<p><strong>State Architecture:</strong></p>
<ul>
<li>Redux Toolkit for global state</li>
<li>RTK Query for API data fetching</li>
<li>Redux Persist for offline storage</li>
<li>Optimistic updates for responsive UI</li>
<li>Conflict resolution for sync</li>
</ul>`,
          },
          {
            title: 'API integration',
            description: `<p>Integrate with the backend API including authentication, data fetching, and real-time updates.</p>
<p><strong>Integration Components:</strong></p>
<ul>
<li>Axios client configuration with interceptors</li>
<li>Token refresh handling</li>
<li>Request retry logic with exponential backoff</li>
<li>WebSocket connection for real-time updates</li>
<li>Network connectivity handling</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Testing & QA',
        description: `<p>Comprehensive testing strategy to ensure application quality before release.</p>
<p><strong>Testing Objectives:</strong></p>
<ul>
<li>90%+ code coverage for business logic</li>
<li>All critical user flows covered by E2E tests</li>
<li>Performance benchmarks met on target devices</li>
<li>Accessibility compliance verified</li>
</ul>`,
        subtasks: [
          {
            title: 'Unit tests',
            description: `<p>Write comprehensive unit tests for all business logic, utilities, and state management.</p>
<p><strong>Testing Focus:</strong></p>
<ul>
<li>Redux reducers and selectors</li>
<li>Custom hooks</li>
<li>Utility functions</li>
<li>API client methods</li>
<li>Data transformation logic</li>
</ul>`,
          },
          {
            title: 'Integration tests',
            description: `<p>Create integration tests that verify the interaction between multiple components and systems.</p>
<p><strong>Test Scenarios:</strong></p>
<ul>
<li>Authentication flows</li>
<li>Navigation transitions</li>
<li>Form submissions with validation</li>
<li>API error handling</li>
<li>Offline/online transitions</li>
</ul>`,
          },
          {
            title: 'Beta testing program',
            description: `<p>Establish and manage a beta testing program to gather real-world feedback before public release.</p>
<p><strong>Beta Program Structure:</strong></p>
<ul>
<li>Internal alpha testing (team members)</li>
<li>Closed beta with select customers</li>
<li>Open beta via TestFlight/Play Console</li>
<li>Feedback collection and triage process</li>
<li>Crash reporting and analytics monitoring</li>
</ul>`,
          },
        ],
      },
    ],
  },
  {
    title: 'Documentation Overhaul',
    description: `<p>Complete restructuring and rewriting of all product documentation to improve user onboarding and self-service support.</p>
<p><strong>Documentation Goals:</strong></p>
<ul>
<li>Reduce support tickets by 30% through better self-service docs</li>
<li>Improve time-to-first-value for new users</li>
<li>Enable users to discover advanced features independently</li>
<li>Maintain documentation freshness with automated checks</li>
</ul>
<p><strong>Content Types:</strong></p>
<ul>
<li>Getting started guides for new users</li>
<li>Feature documentation with examples</li>
<li>API reference with interactive examples</li>
<li>Troubleshooting guides and FAQs</li>
<li>Video tutorials for complex workflows</li>
</ul>`,
    subtasks: [
      {
        title: 'Audit existing docs',
        description: `<p>Perform a comprehensive audit of all existing documentation to understand current state and identify gaps.</p>
<p><strong>Audit Criteria:</strong></p>
<ul>
<li>Accuracy of technical content</li>
<li>Completeness of feature coverage</li>
<li>Clarity and readability</li>
<li>Navigation and discoverability</li>
<li>Visual asset quality</li>
</ul>`,
        subtasks: [
          {
            title: 'List all pages',
            description: `<p>Create a complete inventory of all existing documentation pages with their current status and ownership.</p>
<p><strong>Inventory Fields:</strong></p>
<ul>
<li>Page URL and title</li>
<li>Last updated date</li>
<li>Page views and engagement metrics</li>
<li>Content owner assignment</li>
<li>Priority for update</li>
</ul>`,
          },
          {
            title: 'Identify outdated content',
            description: `<p>Review all documentation to identify content that is outdated, inaccurate, or no longer relevant.</p>
<p><strong>Review Checklist:</strong></p>
<ul>
<li>Feature descriptions match current functionality</li>
<li>Screenshots show current UI</li>
<li>Code examples work with current API version</li>
<li>Links are not broken</li>
<li>Referenced features still exist</li>
</ul>`,
          },
          {
            title: 'Note missing topics',
            description: `<p>Identify documentation gaps by comparing feature coverage against the product functionality.</p>
<p><strong>Gap Analysis Sources:</strong></p>
<ul>
<li>Product feature list comparison</li>
<li>Support ticket analysis for common questions</li>
<li>User feedback and requests</li>
<li>Competitor documentation comparison</li>
<li>Sales team input on customer needs</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Write new content',
        description: `<p>Create new documentation content to fill gaps and replace outdated material.</p>
<p><strong>Content Standards:</strong></p>
<ul>
<li>Clear, concise language at 8th grade reading level</li>
<li>Consistent voice and terminology</li>
<li>Step-by-step instructions with screenshots</li>
<li>Code examples in multiple languages where applicable</li>
<li>Accessibility compliance for all content</li>
</ul>`,
        subtasks: [
          {
            title: 'API reference',
            description: `<p>Create comprehensive API reference documentation with examples for all endpoints.</p>
<p><strong>Reference Content:</strong></p>
<ul>
<li>Endpoint descriptions with HTTP methods</li>
<li>Request/response schemas with examples</li>
<li>Authentication requirements</li>
<li>Error codes and handling</li>
<li>Rate limiting information</li>
<li>Interactive API explorer integration</li>
</ul>`,
          },
          {
            title: 'Getting started guide',
            description: `<p>Write a comprehensive getting started guide that helps new users achieve their first success quickly.</p>
<p><strong>Guide Structure:</strong></p>
<ol>
<li>Account creation and setup</li>
<li>First project creation</li>
<li>Adding team members</li>
<li>Creating and managing tasks</li>
<li>Next steps and advanced features preview</li>
</ol>`,
          },
          {
            title: 'Tutorials section',
            description: `<p>Develop in-depth tutorials for common workflows and advanced use cases.</p>
<p><strong>Tutorial Topics:</strong></p>
<ul>
<li>Project planning and milestone setup</li>
<li>Team collaboration best practices</li>
<li>Reporting and analytics usage</li>
<li>Integration with external tools</li>
<li>Advanced automation and workflows</li>
</ul>`,
          },
        ],
      },
      {
        title: 'Set up doc site',
        description: `<p>Deploy a modern documentation website with excellent search, navigation, and user experience.</p>
<p><strong>Site Requirements:</strong></p>
<ul>
<li>Fast page loads with static generation</li>
<li>Full-text search across all content</li>
<li>Version selector for API docs</li>
<li>Dark mode support</li>
<li>Mobile-friendly responsive design</li>
</ul>`,
        subtasks: [
          {
            title: 'Choose documentation tool',
            description: `<p>Evaluate and select the documentation platform that best meets our requirements.</p>
<p><strong>Evaluation Criteria:</strong></p>
<ul>
<li>Ease of content authoring (Markdown support)</li>
<li>Search functionality quality</li>
<li>Customization options</li>
<li>Integration with existing toolchain</li>
<li>Cost and maintenance overhead</li>
</ul>
<p><strong>Candidates:</strong> Docusaurus, GitBook, ReadMe, VitePress</p>`,
          },
          {
            title: 'Configure search',
            description: `<p>Set up and configure search functionality to enable users to quickly find relevant content.</p>
<p><strong>Search Features:</strong></p>
<ul>
<li>Instant search with preview snippets</li>
<li>Keyboard shortcuts for quick access</li>
<li>Search analytics for improvement insights</li>
<li>Typo tolerance and suggestions</li>
<li>Faceted search by content type</li>
</ul>`,
          },
          {
            title: 'Deploy to production',
            description: `<p>Deploy the documentation site to production with proper CI/CD, monitoring, and maintenance processes.</p>
<p><strong>Deployment Setup:</strong></p>
<ul>
<li>Static site hosting (Vercel/Netlify/CloudFlare Pages)</li>
<li>Custom domain configuration with SSL</li>
<li>Automated deployments on content changes</li>
<li>Analytics integration for usage tracking</li>
<li>Uptime monitoring and alerting</li>
</ul>`,
          },
        ],
      },
    ],
  },
]

interface TaskTemplate {
  title: string
  description?: string
  subtasks?: TaskTemplate[]
}

function getRandomAssignees(allUserIds: mongoose.Types.ObjectId[]): mongoose.Types.ObjectId[] {
  // 30% chance of no assignees, 40% chance of 1, 20% chance of 2, 10% chance of 3
  const rand = Math.random()
  let count: number
  if (rand < 0.3) count = 0
  else if (rand < 0.7) count = 1
  else if (rand < 0.9) count = 2
  else count = 3

  if (count === 0 || allUserIds.length === 0) return []

  // Shuffle and take first `count` users
  const shuffled = [...allUserIds].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

async function createTaskWithSubtasks(
  template: TaskTemplate,
  projectId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  parentTaskId: mongoose.Types.ObjectId | null = null,
  order: number = 0,
  milestoneId: mongoose.Types.ObjectId | null = null,
  allUserIds: mongoose.Types.ObjectId[] = []
): Promise<void> {
  const assignees = getRandomAssignees(allUserIds)

  const task = await Task.create({
    project: projectId,
    title: template.title,
    description: template.description || `<p>Description for: ${template.title}</p>`,
    status: randomItem(statuses),
    priority: randomItem(priorities),
    parentTask: parentTaskId,
    milestone: milestoneId,
    order,
    createdBy: userId,
    assignees,
  })

  if (template.subtasks) {
    for (let i = 0; i < template.subtasks.length; i++) {
      await createTaskWithSubtasks(
        template.subtasks[i],
        projectId,
        userId,
        task._id as mongoose.Types.ObjectId,
        i,
        milestoneId, // Subtasks inherit parent's milestone
        allUserIds
      )
    }
  }
}

async function seed() {
  console.log('Connecting to MongoDB...')
  await mongoose.connect(MONGODB_URI)
  console.log('Connected!')

  // Find first user (should be created by mongodb plugin on startup)
  const user = await User.findOne()
  if (!user) {
    console.error('No user found. Please start the app first to create the default user.')
    process.exit(1)
  }

  // Find the user's organization
  let org = await Organization.findOne({ members: { $elemMatch: { user: user._id } } })
  if (!org) {
    console.error('No organization found. Please start the app first to create the default organization.')
    process.exit(1)
  }

  // Create test users
  console.log('\nCreating test users...')
  const testUserIds: { userId: mongoose.Types.ObjectId; role: 'team' | 'client' }[] = []

  for (const testUser of TEST_USERS) {
    let existingUser = await User.findOne({ email: testUser.email })
    if (!existingUser) {
      existingUser = await User.create({
        name: testUser.name,
        email: testUser.email,
        password: '$2a$10$dummyhashedpasswordforseeding', // Not a real hash, just placeholder
        organizations: [org._id],
      })
      console.log(`  Created user: ${testUser.name} (${testUser.email}) - ${testUser.role}`)
    } else {
      // Ensure user is in the organization
      if (!existingUser.organizations?.includes(org._id)) {
        existingUser.organizations = [...(existingUser.organizations || []), org._id]
        await existingUser.save()
      }
      console.log(`  User exists: ${testUser.name} (${testUser.email}) - ${testUser.role}`)
    }

    testUserIds.push({ userId: existingUser._id as mongoose.Types.ObjectId, role: testUser.role })

    // Add to organization members if not already
    const isOrgMember = org.members.some(
      (m: { user: mongoose.Types.ObjectId }) => m.user.toString() === existingUser._id.toString()
    )
    if (!isOrgMember) {
      org.members.push({ user: existingUser._id, role: 'member' })
    }
  }
  await org.save()

  // Find or create the demo project
  let project = await Project.findOne({ name: DEFAULT_PROJECT.name, organization: org._id })
  if (!project) {
    console.log('Creating demo project...')
    project = await Project.create({
      name: DEFAULT_PROJECT.name,
      description: DEFAULT_PROJECT.description,
      organization: org._id,
      owner: user._id,
      members: [{ user: user._id, role: 'team' }],
      status: 'active',
    })
    console.log(`Created project: ${project.name}`)
  }

  // Add test users to project members
  console.log('\nAdding test users to project...')
  for (const { userId, role } of testUserIds) {
    const isMember = project.members.some(
      (m: { user: mongoose.Types.ObjectId }) => m.user.toString() === userId.toString()
    )
    if (!isMember) {
      project.members.push({ user: userId, role, addedBy: user._id })
    }
  }
  await project.save()
  console.log(`Project now has ${project.members.length} members`)

  console.log(`Seeding tasks for project: ${project.name}`)
  console.log(`Using user: ${user.email}`)

  // Clear existing tasks and milestones for this project
  const deletedTasks = await Task.deleteMany({ project: project._id })
  console.log(`Deleted ${deletedTasks.deletedCount} existing tasks`)

  const deletedMilestones = await Milestone.deleteMany({ project: project._id })
  console.log(`Deleted ${deletedMilestones.deletedCount} existing milestones`)

  // Create milestones
  console.log('\nCreating milestones...')
  const milestones: mongoose.Types.ObjectId[] = []
  const today = new Date()

  for (let i = 0; i < milestoneTemplates.length; i++) {
    const template = milestoneTemplates[i]
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() + i * 30) // Each phase is 30 days apart
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 30) // Each phase lasts 30 days

    const milestone = await Milestone.create({
      project: project._id,
      name: template.name,
      description: template.description,
      status: template.status,
      startDate,
      endDate,
    })
    milestones.push(milestone._id as mongoose.Types.ObjectId)
    console.log(`  Created: ${template.name}`)
  }

  // Collect all user IDs for random assignment
  const allUserIds = [
    user._id as mongoose.Types.ObjectId,
    ...testUserIds.map((t) => t.userId),
  ]

  // Create all task trees with milestone assignments
  console.log('\nCreating tasks...')
  for (let i = 0; i < taskTemplates.length; i++) {
    const taskTitle = taskTemplates[i].title
    const milestoneIndex = taskToMilestoneMap[taskTitle]
    const milestoneId = milestoneIndex !== undefined ? milestones[milestoneIndex] : null

    console.log(`Creating: ${taskTitle}${milestoneId ? ` (${milestoneTemplates[milestoneIndex].name})` : ''}`)
    await createTaskWithSubtasks(
      taskTemplates[i],
      project._id as mongoose.Types.ObjectId,
      user._id as mongoose.Types.ObjectId,
      null,
      i,
      milestoneId,
      allUserIds
    )
  }

  const totalTasks = await Task.countDocuments({ project: project._id })
  const totalMilestones = await Milestone.countDocuments({ project: project._id })
  console.log(`\nSeeding complete! Created ${totalMilestones} milestones and ${totalTasks} tasks.`)

  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seeding failed:', err)
  process.exit(1)
})
