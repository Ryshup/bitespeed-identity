🧠 Bitespeed Backend Task — Identity Reconciliation
🚀 Live API

Endpoint:

POST https://bitespeed-identity-hz5c.onrender.com/identify
📌 Problem Statement

FluxKart customers may place orders using different combinations of email addresses and phone numbers.

The goal of this service is to:

Identify whether incoming contact information belongs to an existing customer

Link related contact records together

Maintain one primary contact

Convert others into secondary contacts

Return a consolidated customer identity response

Contacts are considered linked if they share either:

email

OR phoneNumber

🏗️ Tech Stack

Node.js

TypeScript

Express

PostgreSQL

Prisma ORM

Render (Deployment)

🗄️ Database Schema
Contact
-------
id                Int (Primary Key)
phoneNumber       String?
email             String?
linkedId          Int? (Self reference)
linkPrecedence    "primary" | "secondary"
createdAt         DateTime
updatedAt         DateTime
deletedAt         DateTime?
Rules:

Oldest contact in a cluster is marked "primary"

All other linked contacts are "secondary"

Secondary contacts reference primary via linkedId

🧩 Approach

This problem is modeled as a graph connectivity problem:

Each contact row is a node

Shared email or phone creates an edge

All connected nodes form a cluster

The oldest contact becomes the primary node

Algorithm Overview

Search contacts matching incoming email OR phoneNumber.

If no match → create new primary.

If matches found:

Fetch full connected component.

Determine oldest primary (by createdAt).

Convert any newer primaries to secondary.

If exact email+phone pair does not exist → create secondary.

Return consolidated identity.

📡 API Specification
Endpoint
POST /identify
Request Body
{
  "email": "string?",
  "phoneNumber": "string?"
}

At least one field is required.

📤 Sample Responses
🧪 New Contact
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["doc@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
🧪 Adding Secondary Contact
{
  "contact": {
    "primaryContactId": 1,
    "emails": [
      "doc@hillvalley.edu",
      "mcfly@hillvalley.edu"
    ],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
🧪 Merging Two Primaries
{
  "contact": {
    "primaryContactId": 3,
    "emails": [
      "george@hillvalley.edu",
      "biffsucks@hillvalley.edu"
    ],
    "phoneNumbers": [
      "919191",
      "717171"
    ],
    "secondaryContactIds": [4, 5]
  }
}
✅ Edge Cases Handled

✔ Only email provided

✔ Only phoneNumber provided

✔ Duplicate request (idempotency)

✔ Two primary contacts merging

✔ Prevent duplicate secondary creation

✔ Oldest primary preserved

✔ Proper ordering (primary contact info first)

🔒 Data Integrity

Secondary created only if exact (email + phoneNumber) pair does not already exist

Merge logic ensures a single primary per cluster

Response arrays contain no duplicates

🧪 How to Run Locally
1️⃣ Install Dependencies
npm install
2️⃣ Setup Environment Variables

Create .env file:

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bitespeed"
3️⃣ Run Migrations
npx prisma migrate dev
4️⃣ Start Server
npm run dev

Server runs at:

http://localhost:3000
🚀 Deployment

Hosted on Render

PostgreSQL hosted on Render

Prisma migrations deployed via:

npx prisma migrate deploy
⚠️ Challenges Faced

Handling conversion of primary to secondary correctly

Ensuring idempotency (avoiding duplicate secondaries)

Maintaining proper ordering in response arrays

Managing connected contact clusters safely

Handling deployment cold start behavior on free tier

📎 GitHub Repository
https://github.com/Ryshup/bitespeed-identity
