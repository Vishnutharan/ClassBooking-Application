# ClassBooking Platform

## Overview
ClassBooking is a comprehensive online education platform connecting students with teachers for scheduled classes. It supports three distinct roles: Students, Teachers, and Admins, offering tailored dashboards and features for each.

## Features

### General
- **Authentication**: Secure login/registration with role-based access control (RBAC).
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices.
- **Notifications**: Real-time alerts for bookings and system updates.

### For Students
- **Search Teachers**: Filter by subject, level, and rating.
- **Book Classes**: Schedule one-time or recurring classes.
- **Resource Library**: Access study materials and past papers.
- **Progress Tracking**: Monitor study hours and completed classes.

### For Teachers
- **Schedule Management**: Set availability and working hours.
- **Class Management**: View upcoming classes, mark attendance.
- **Profile Customization**: Update qualifications, subjects, and rates.
- **Resource Upload**: Share learning materials with students.

### For Admins
- **User Management**: Create, suspend, or activate accounts.
- **Reporting**: Generate PDF/Excel reports for revenue and usage.
- **System Settings**: Configure platform fees and global settings.
- **Timetable**: Manage public holidays and exam seasons.

## Technology Stack
- **Frontend**: Angular 19 (SSR enabled)
- **Language**: TypeScript
- **State Management**: RxJS (BehaviorSubjects)
- **Styling**: CSS (Modular)
- **Build Tool**: Angular CLI

## Team
- **Developer**: Vishnutharan
- **Role**: Full Stack Engineer

## Repository structure

This repository contains both parts of the application:

- **Front end** – Angular 19 app (with SSR) at the repository root (`src/`, `angular.json`, `package.json`).
- **Back end** – ASP.NET Core Web API (.NET 9) in `Backend/ClassBooking.API`, solution file `Backend/ClassBooking.sln`.

```text
ClassBooking-Application/
├── .vscode/
├── Backend/
│   ├── ClassBooking.API/
│   └── ClassBooking.sln
├── public/
├── src/
│   ├── app/
│   ├── environments/
│   ├── index.html
│   └── main.ts
├── .editorconfig
├── .gitignore
├── angular.json
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.app.json
├── tsconfig.json
└── tsconfig.spec.json
```

## Prerequisites

- Node.js 18.19+ / 20+ and npm (Angular 19 requirement)
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- SQL Server or SQL Server LocalDB
- Optional: `dotnet-ef` tool (`dotnet tool install --global dotnet-ef`)

## Back-end setup (Backend/ClassBooking.API)

`appsettings.json` only contains placeholders for secrets. Create your local, git-ignored settings file:

```bash
cd Backend/ClassBooking.API
cp appsettings.Development.example.json appsettings.Development.json
```

Then set:

- `ConnectionStrings:DefaultConnection` – your SQL Server connection string
- `Jwt:Key` – a long random secret (32+ characters)

Apply the EF Core migrations and run the API:

```bash
dotnet ef database update      # creates/updates ClassBookingDB from Migrations/
dotnet run                     # http://localhost:5197 (see Properties/launchSettings.json)
```

Swagger UI is available at `http://localhost:5197/swagger` in Development. Seed data is inserted on start-up by `Data/DataSeeder.cs`.

## Front-end setup

```bash
npm install
npm start                      # ng serve → http://localhost:4200
```

The API base URL is configured in `src/environments/environment.ts` (`apiUrl`, default `http://localhost:5197/api`).

Production build and SSR server:

```bash
npm run build
npm run serve:ssr:Classbooking
```
