# Messaging App Server

This is a backend API for managing user registration, authentication, friend requests, and a chat system. The app is built using Express and TypeScript, with Prisma ORM managing MySQL database interactions.


## Client Repository
[Messaging-App-Client-Side](https://github.com/mpapila/Messaging-App-Client-Side)

## Technologies Used

- **Express**: Backend framework for routing and handling HTTP requests.
- **TypeScript**: Type-safe language for robust code.
- **Prisma ORM**: Used for database management and querying.
- **MySQL**: Relational database for storing user, friend, and message data.
- **JWT**: Used for secure authentication and route protection.
- **bcrypt**: Used for hashing passwords.
- **Socket.IO**: Real-time communication for chat functionality.

## Features

### User Registration

- **Endpoint**: `/register`
- Users can register with a unique username and email.
- Passwords are hashed using bcrypt for security.
- Validates that the username and email are unique.

### User Login

- **Endpoint**: `/login`
- Authenticates users using their username and password.
- On successful login, a JWT is returned, allowing access to protected routes.

### Authentication Middleware

- **Middleware**: `verifyToken`
- Protects specific routes by verifying JWT tokens in the request headers.
- Decodes the token to retrieve user details and attaches them to the request object.

### Friend Request System

- **Models**: `users`, `Friend`
- Users can send and receive friend requests.
- Friend requests have statuses of 'pending', 'accepted', or 'declined'.
- Both users in a friend request are stored as relationships in the database.

### Chat System

- **Models**: `Message`, `users`
- Users can send and receive messages within chat rooms.
- Messages are tied to specific chat rooms and linked to the sender's ID.
- Real-time messaging using Socket.IO (integration not fully described here but assumed as part of the app).

### Database Schema

- **Users**: Stores user information including usernames, emails, and hashed passwords.
- **Friends**: Manages friend requests between users, tracks the status of each request.
- **Messages**: Stores chat messages, links messages to chat rooms and users.

## Deployment

API
The server is deployed on Render and is only for API calls: https://flossy-spotless-garlic.glitch.me

Example API call: https://flossy-spotless-garlic.glitch.me/health-check
