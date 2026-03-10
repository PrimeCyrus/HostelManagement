Build a **Hostel Management System Web Application** using a clean and scalable architecture.

## Tech Stack

Use the following technologies:

Backend

* Node.js
* Express.js

Frontend

* HTML
* CSS
* JavaScript
* Mobile-first responsive design

Database

* SQLite

Use **MVC architecture** and maintain clean project structure.

---

# Step 1 — Generate Full Project Structure

First generate the complete folder structure before writing code.

Example structure:

```
hostel-management/
│
├── server.js
├── package.json
├── database/
│   └── database.js
│
├── models/
│   ├── userModel.js
│   ├── studentModel.js
│   ├── roomModel.js
│   ├── hostelModel.js
│   ├── feeModel.js
│   └── complaintModel.js
│
├── controllers/
│   ├── authController.js
│   ├── studentController.js
│   ├── roomController.js
│   ├── hostelController.js
│   ├── feeController.js
│   └── complaintController.js
│
├── routes/
│   ├── authRoutes.js
│   ├── studentRoutes.js
│   ├── roomRoutes.js
│   ├── hostelRoutes.js
│   ├── feeRoutes.js
│   └── complaintRoutes.js
│
├── middleware/
│   └── authMiddleware.js
│
├── public/
│   ├── css/
│   ├── js/
│   └── images/
│
└── views/
    ├── login.html
    ├── admin-dashboard.html
    ├── warden-dashboard.html
    ├── student-dashboard.html
```

---

# Step 2 — Authentication System

Create login authentication with **role-based access control**.

Roles:

* Admin
* Warden
* Student

Features:

* Login page
* Password hashing
* Session management
* Middleware for role protection

---

# Step 3 — Core Modules

## Admin Dashboard

Admin can:

* Manage hostels
* Manage rooms
* Add/edit/delete students
* Assign students to rooms
* Manage wardens
* Track hostel fees
* View and resolve complaints
* Generate reports

Dashboard cards:

* Total students
* Total rooms
* Available rooms
* Occupied rooms
* Pending complaints

---

## Warden Module

Warden can:

* View rooms in assigned hostel
* View student list
* Manage room allocation
* View complaints
* Update complaint status

---

## Student Module

Students can:

* Register account
* View profile
* View room allocation
* View hostel information
* View fee details
* Submit complaints
* Track complaint status

Registration form fields:

* Name
* Gender
* Course
* Phone number
* Guardian name
* Guardian contact
* Address

---

# Step 4 — SQLite Database Schema

Create tables:

Users

* id
* name
* email
* password
* role

Students

* student_id
* name
* course
* phone
* guardian_name
* guardian_contact
* address

Hostels

* hostel_id
* hostel_name

Rooms

* room_id
* hostel_id
* capacity
* available_beds

Allocations

* allocation_id
* student_id
* room_id
* bed_number

Fees

* fee_id
* student_id
* amount
* payment_status
* payment_date

Complaints

* complaint_id
* student_id
* description
* status
* created_at

---

# Step 5 — UI Requirements

Create pages:

* Login
* Admin Dashboard
* Warden Dashboard
* Student Dashboard
* Hostel Management
* Room Management
* Student Management
* Fee Management
* Complaint Page
* Reports

UI should include:

* Sidebar navigation
* Dashboard cards
* Tables
* Forms
* Mobile-friendly layout

---

# Step 6 — Deliverables

Generate:

* Complete working backend
* Express API routes
* SQLite database setup
* Frontend UI pages
* Authentication system
* Sample seed data

The final project must **run locally with `npm install` and `node server.js`.**
