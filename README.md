# ClassBooking Platform

## Local Stripe test payments

Card payments use Stripe Checkout in test mode. From `Backend/ClassBooking.API`, run `dotnet user-secrets init`, then set your Stripe test secret with `dotnet user-secrets set "Stripe:SecretKey" "sk_test_..."`. Start `stripe listen --forward-to http://localhost:5197/api/payments/stripe/webhook` and set its printed signing secret with `dotnet user-secrets set "Stripe:WebhookSecret" "whsec_..."`. Keep both keys out of source control. The checkout button reports a configuration error until these secrets are set; cash payments remain available.

Run the API workflow checks from the repository root with `node scripts/verify-workflows.cjs`.

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
