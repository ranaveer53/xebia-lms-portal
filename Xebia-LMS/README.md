# Xebia Enterprise LMS Portal - Full-Stack Integrated Platform

An enterprise-grade, full-stack Learning Management System (LMS) portal designed for Xebia Consultants and Tech Architects. This monorepo integrates a **Next.js 16 App Router Frontend** with a **Spring Boot 2.7.x REST Backend**, featuring dynamic H2/MongoDB Atlas connectivity, Redis caching layers, role-based access controls, and a complete **Leadership Learning Analytics Dashboard**.

---

## 1. Tech Stack

### Frontend Client
- **Framework**: Next.js (v16 App Router, Webpack/Turbopack)
- **Runtime**: React (v19)
- **Styling**: Vanilla CSS with Tailwind CSS v4 variables
- **State Management**: Tanstack React Query (v5)
- **Authentication**: NextAuth.js (v4)
- **Visualizations**: Raw SVG elements styled dynamically

### Backend Services
- **Framework**: Spring Boot (v2.7.18) & Spring Web MVC
- **Database**: H2 Database (local persistence & mock data seeding) / PostgreSQL (production-ready driver)
- **Caching**: Spring Data Redis (Lettuce Client)
- **Security**: Spring Security & BCrypt Password Encoding
- **Build Tool**: Maven

---

## 2. Folder Structure

```text
xebia-lms-portal/
├── backend/                  # Spring Boot Maven Project
│   ├── src/main/java/com/xebia/lms/
│   │   ├── config/           # Security, Web MVC CORS Configurations
│   │   ├── controller/       # Rest Controllers (Auth, Categories, Courses, Analytics)
│   │   ├── model/            # JPA Data Models & Entities
│   │   ├── repository/       # Spring Data JPA Repository Interfaces
│   │   └── service/          # Business Services & Redis Caching
│   ├── src/main/resources/
│   │   └── application.properties # Spring configuration settings
│   ├── pom.xml               # Maven Dependency Configuration
│   └── mvnw.cmd              # Maven Wrapper Executable
├── src/                      # Next.js App Router Source
│   ├── app/                  # Route Node Pages & Layouts
│   │   ├── admin/            # Administrator views & dashboards
│   │   │   ├── analytics/    # Curriculum completion telemetry
│   │   │   └── leadership-analytics/ # 12-section PDF-compliant analytics cockpit
│   │   ├── dashboard/        # Learner cockpit dashboard
│   │   ├── courses/          # Syllabus catalog & detail pages
│   │   ├── learn/            # Interactive course lesson player
│   │   └── signin/           # SSO interface page
│   ├── components/common/    # Reusable UI widgets (Sidebar, Navbar, Cards)
│   ├── services/
│   │   ├── api.js            # Fetch client hook, warning banners & modes
│   │   └── mongodb.js        # Direct MongoDB client configs for syllabus data
│   └── hooks/                # React Query hooks
├── .env.example              # Frontend environment config template
├── package.json              # Next.js package configurations
└── tailwind.config.js        # Theme color variables
```

---

## 3. Environment Variables

To customize the frontend configuration, create a `.env` or `.env.local` file in the root directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_USE_MOCK_API=false
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-randomly-generated-nextauth-secret-key
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/employeeDB?retryWrites=true&w=majority
```

---

## 4. Local Installation & Startup

### Step 1: Clone the Repository
```bash
git clone https://github.com/Pardhu643/Xebia-LMS.git
```

### Step 2: Start the Backend (Spring Boot)
1. Open a terminal and navigate to the `/backend` subdirectory:
   ```bash
   cd backend
   ```
2. Build and run the project:
   ```bash
   .\mvnw.cmd spring-boot:run
   ```
The backend server will start on [http://localhost:8080/api](http://localhost:8080/api). On startup, it automatically seeds H2 memory tables with 150+ employee records, trainings, sessions, and certifications.

### Step 3: Start the Frontend (Next.js)
1. Open a separate terminal pane in the root folder.
2. Install node dependencies:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
The frontend application will be active at [http://localhost:3000](http://localhost:3000).

---

## 5. System Design Details

### 5.1 Centralized Data Mode (`REAL_MODE` vs `DEMO_MODE`)
The portal features a resilient client data provider mapping logic:
* **Default Mode (`REAL_MODE`)**: Queries are routed directly to the local Spring Boot backend.
* **Demo Mode (`DEMO_MODE`)**: Activated manually by clicking the **Learner Account** or **Admin Account** buttons on the sign-in page. It bypasses backend queries, rendering mock calculations and loading a `Demo Mode` pill in the header.
* **Automatic Fallback Banners**: If the Spring Boot backend server goes offline while in `REAL_MODE`, the client logs the API failure to the console and automatically displays a visible banner warning:
  `⚠️ Spring Boot backend is currently offline. Falling back to local simulation data.`
* **Sign-Out Cleansing**: Logging out of the application deletes data mode keys from `localStorage` to reset defaults.

### 5.2 Redis Caching Layer
* Implemented in the backend `RedisCacheService` using Lettuce configurations.
* Caches serialized response payloads of all analytics controllers for **5 minutes (300-second TTL)**.
* **Resilient Connection Fallbacks**: If the local Redis server is offline or unreachable, connection errors are caught safely. The backend service logs the timeout warning and routes queries directly to H2 database operations with zero application crashes.

---

## 6. REST API Endpoints Mapping

All analytics endpoints map under the context path `/api/analytics/*`:

| Endpoint Method | Route URL Path | Purpose / Description |
| :---: | :--- | :--- |
| **GET** | `/analytics/executive-summary` | Overall KPI aggregates (Total headcounts, Nominated vs Trained counts, CSAT satisfaction scores). |
| **GET** | `/analytics/learning-coverage` | Region-wise visual coverage, project-wise participation heatmaps, and quarterly indicators. |
| **GET** | `/analytics/learning-hours` | Total learning hours, average hour ratios, and Top 10 active learners/regions/projects. |
| **GET** | `/analytics/learning-pillars` | Upskilling, compliance, and flagship program category hours distribution. |
| **GET** | `/analytics/ai-transformation` | AI transformation readiness index, adoption funnels, and tool usage metrics. |
| **GET** | `/analytics/certifications` | Zoho approved, pending, and rejected certifications indexed by tech, BU, or location. |
| **GET** | `/analytics/flagship-programs` | YMP and Quantum Shift executive program participants and completion ratings. |
| **GET** | `/analytics/learning-trends` | YoY, QoQ, and MoM training satisfaction growth percentages. |
| **GET** | `/analytics/training-effectiveness` | Trainer and session CSAT rating distributions. |
| **GET** | `/analytics/learning-champions` | Top learners and cloud session mentors badges. |
| **GET** | `/analytics/project-investment` | Practice-level and BU training budget investments. |
| **GET** | `/analytics/fresher-journey` | Campus hiring pipelines, freshers-to-project time-to-deployment indexes. |
| **GET** | `/analytics/skill-gap` | Target capability versus current skills mapping templates. |

---

## 7. Login Credentials

You can sign in to the portal using these local SSO credentials:

| Profile | Email Address | Password | Role |
| :--- | :--- | :--- | :---: |
| **Learner Profile** | `learner@xebia.com` | `learner123` | `learner` |
| **Admin Profile** | `admin@xebia.com` | `admin123` | `admin` |

---

## 8. Backend Deployment (Render.com)

Since the Railway trial has expired, you can deploy the Spring Boot backend to Render.com (free tier) with one click using the button below:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/ranaveer53/xebia-lms-portal)

### Setup Steps on Render:
1. Click the **Deploy to Render** button above.
2. Log in to Render and configure the following environment variables:
   * **`APP_CORS_ALLOWED_ORIGINS`**: `https://xebia-lms-portal-three.vercel.app`
   * **`SPRING_PROFILES_ACTIVE`**: `demo`
   * **`MONGODB_URI`**: *(Highly Recommended)* Set a connection string from a free MongoDB Atlas cluster to keep your assessments, submissions, materials, and classes persisted securely (e.g. `mongodb+srv://<user>:<password>@cluster.mongodb.net/employeeDB`).
3. Click **Apply** or **Create Service**. Render will build the Docker container and start the backend.

### Update Vercel Frontend:
Once Render has completed the deployment, copy your service's URL (e.g., `https://xebia-lms-backend-xxxx.onrender.com`) and update your Vercel project environment variables:
1. Go to your **Vercel Dashboard** > **xebia-lms-portal** > **Settings** > **Environment Variables**.
2. Update **`NEXT_PUBLIC_API_URL`** to: `https://xebia-lms-backend-xxxx.onrender.com/api`
3. Update **`NEXTAUTH_API_URL`** to: `https://xebia-lms-backend-xxxx.onrender.com/api`
4. Redeploy your Vercel project to apply the changes.

