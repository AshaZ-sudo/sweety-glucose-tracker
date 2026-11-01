# Sweety – Blood Glucose Tracker

Sweety is a full-stack web application that helps users record, manage, and review their blood glucose readings. Users can create an account, securely log in, track readings by date and time slot, and view daily and monthly reports.

## Features

- User registration and login
- JWT-based authentication
- Add glucose readings
- View reading history
- Edit and delete readings
- Prevent duplicate readings for the same date and slot
- Daily glucose report
- Monthly report with average, minimum, maximum, and total readings
- Previous-month summary
- Responsive user interface

## Technologies Used

**Frontend**
- React
- Vite
- JavaScript
- HTML
- CSS

**Backend**
- Node.js
- Express.js
- PostgreSQL
- JSON Web Token (JWT)
- bcrypt

## Project Structure

```text
sweety-glucose-tracker/
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
├── server/
│   ├── src/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── db.js
│   │   └── server.js
│   ├── package.json
│   └── .env
└── README.md