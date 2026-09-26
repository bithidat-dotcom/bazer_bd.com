# Pbazar Seller App: Profile, Loyalty Points, and Checkout Enhancement

This plan outlines the implementation of a user profile page with loyalty points, order history, and a dedicated, full-screen checkout page.

### User Review & Critical Decisions

> [!IMPORTANT]
> The loyalty system uses a 1:1 product-to-point ratio, with 5 points = 350 taka coupon. Coupons can be used for products costing <= 350 taka.

- **Confirmed Decision 1**: Loyalty points calculation (1 product = 1 point).
- **Confirmed Decision 2**: Profile and order history are accessible after phone number login.
- **Confirmed Decision 3**: Full-screen checkout page for improved focus.
- **Open Question / Choice 1**: I have decided to store user profiles and order history in the Firestore `users` collection keyed by phone number.

### 1. Overview & Core Concept
- **What It Does**: Adds a user dashboard for profile management, loyalty tracking, and a streamlined checkout experience.
- **Key Value**: Increased customer retention via loyalty points and better order management.

### 2. User Experience & Visual Design
- **Key User Flows**: 
    - User signs in with phone number -> Profile page shows points, history, and image.
    - User adds products -> Proceeds to full-screen Checkout -> Can apply loyalty coupon if eligible.
- **Visual Identity & Theme**:
    - Consistent with the existing "Drink Cafe" / "Food" blue theme.
    - Clean, unboxed text metadata (Zero-Pill Discipline).

### 3. Key Product Decisions & Trade-Offs
- **Decision 1**: Phone-based Auth/Identity
    - *Approach*: Firestore-based user profile lookup using phone number as the unique ID.
    - *Why*: Direct mapping to user interactions and order history without complex Auth provider setup.
- **Decision 2**: Loyalty Points
    - *Approach*: Firestore `users` document tracks `totalPoints` and `orders`.
    - *Why*: Simple, reliable state management for points logic.

### 4. Technical Architecture & Data Strategy
```text
┌─────────────────┐      ┌────────────────────────┐      ┌─────────────────┐
│  Client (React) │ <──> │  Firestore             │ <──> │  Pbazar DB      │
│ (Profile, Check)│      │ (Users/Orders)         │      │                 │
└────────┬────────┘      └────────────────────────┘      └─────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Loyalty Engine (Logic)      │
└─────────────────────────────────┘
```
- **Firestore Collections**:
    - `users/{phone}`: `{ profileImage, points, orderHistory }`
    - `orders`: Link to user via phone number.
