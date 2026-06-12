# Health & Fitness Tracker

## Overview

Health & Fitness Tracker is a web-based application designed to help users monitor and manage their health and fitness activities in a centralized platform. The system allows users to track workouts, daily steps, nutrition intake, hydration, fitness goals, and progress over time while receiving reminders and personalized insights.

The project aims to encourage healthier lifestyles by providing users with an easy-to-use dashboard for monitoring fitness-related activities and performance trends.

---

## Features

### Authentication & User Management

* User registration and login
* JWT-based authentication and authorization
* Secure password hashing using bcrypt
* Password reset via email

### Fitness Activity Tracking

* Log workouts and exercises
* Record daily step counts
* Calculate estimated calories burned
* View activity history

### Nutrition Planner

* Track daily meals and calorie intake
* Manage nutrition plans
* Monitor nutritional progress

### Hydration Tracking

* Record daily water consumption
* Monitor hydration goals
  
### Goal Management

* Create fitness goals
* Track goal completion progress
* Monitor achievement status

### Progress Visualization

* Interactive charts and graphs
* Activity trends over time
* Progress comparison and analysis

### Dashboard Analytics

* Aggregated health statistics
* Personalized fitness insights
* Overview of activities, nutrition, hydration, and goals

### Notifications & Reminders

* Email reminders using Nodemailer
* Scheduled email & browser notifications for fitness activities
* Goal and hydration reminders

---

## System Architecture

```
Frontend
(HTML, CSS, JavaScript, Bootstrap)
          │
          ▼
REST API
(Node.js + Express.js)
          │
          ▼
MongoDB Atlas
(Database)
```

### Technology Stack

#### Frontend

* HTML5
* CSS3
* JavaScript (ES6+)
* Bootstrap 5
* Chart.js

#### Backend

* Node.js
* Express.js
* JWT Authentication
* bcrypt
* Zod Validation
* Nodemailer
* node-cron

#### Database

* MongoDB Atlas
* Mongoose ODM

---

## Project Structure

```
health-fitness-tracker/
│
├── public/
│   ├── css/
│   ├── js/
│   └── images/
│
├── src/
│   ├── config/
│   ├── middleware/
│   ├── modules/
│   │   ├── authentication/
│   │   ├── dashboard/
│   │   ├── fitness-tracker/
│   │   ├── nutrition-planner/
│   │   ├── hydration-tracker/
│   │   ├── progress-charts/
│   │   ├── notifications/
│   │   └── profile/
│   │
│   ├── services/
│   ├── utils/
│   └── app.js
│
├── tests/
├── docs/
├── .env
├── package.json
└── README.md
```

---

## Installation

### Prerequisites

Ensure the following are installed:

* Node.js (v18 or above)
* npm
* MongoDB Atlas account

### Clone Repository

```bash
git clone https://github.com/your-username/health-fitness-tracker.git

cd health-fitness-tracker
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the project root.

```env
PORT=3000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
```

### Run Application

Development Mode:

```bash
npm run dev
```

Production Mode:

```bash
npm start
```

Server will run on:

```text
http://localhost:3000
```

---

## API Modules

| Module            | Description                              |
| ----------------- | ---------------------------------------- |
| Authentication    | User registration, login, password reset |
| Profile           | User profile management                  |
| Fitness Tracker   | Workout and step tracking                |
| Nutrition Planner | Meal and calorie management              |
| Hydration Tracker | Water intake tracking                    |
| Progress Charts   | Data visualization and analytics         |
| Dashboard         | Aggregated user insights                 |
| Notifications     | Email reminders and alerts               |

---

## Testing

The project includes:

### Unit Testing

Tests individual functions, services, and utility modules.

### Integration Testing

Tests interactions between APIs, services, and database components.

### Functional Testing

Validates complete user workflows and system requirements.

Run tests:

```bash
npm test
```

---

## Security Features

* JWT Authentication
* Password Hashing (bcrypt)
* Input Validation (Zod)
* Protected API Routes
* Environment Variable Protection
* Error Handling Middleware

---


