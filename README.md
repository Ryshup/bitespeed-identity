🧠 Bitespeed Backend Task — Identity Reconciliation
🚀 Live API

Endpoint

POST https://bitespeed-identity-hz5c.onrender.com/identify

📌 Problem Statement

FluxKart customers may place orders using different combinations of email addresses and phone numbers.

The objective of this service is to:

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
Rules

The oldest contact in a cluster is marked "primary".

All other linked contacts are marked "secondary".

Secondary contacts reference the primary contact using linkedId.

🧩 Approach

This problem is modeled as a graph connectivity problem:

Each contact row represents a node.

A shared email or phone number creates an edge.

All connected nodes form a cluster.

The oldest contact (by createdAt) becomes the primary node.

🔍 Algorithm Overview

Search for contacts matching the incoming email OR phoneNumber.

If no match is found → create a new primary contact.

If matches exist:

Fetch the full connected component.

Determine the oldest primary contact.

Convert any newer primaries into secondary contacts.

If an exact (email + phoneNumber) pair does not exist → create a secondary contact.

Return the consolidated identity response.

📡 API Specification
Endpoint

POST /identify

Request Body
{
  "email": "string?",
  "phoneNumber": "string?"
}

At least one field (email or phoneNumber) is required.

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
🧪 Adding a Secondary Contact
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
🧪 Merging Two Primary Contacts
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

✔ Duplicate request handling (idempotency)

✔ Two primary contacts merging correctly

✔ Prevent duplicate secondary creation

✔ Oldest primary preserved

✔ Proper ordering (primary contact info appears first in arrays)

🔒 Data Integrity Guarantees

A secondary contact is created only if the exact (email + phoneNumber) pair does not already exist.

Merge logic ensures there is only one primary per cluster.

Response arrays contain no duplicate values.

Primary contact information always appears first in response arrays.

🧪 Running Locally
1️⃣ Install Dependencies
npm install
2️⃣ Setup Environment Variables

Create a .env file:

DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bitespeed"
3️⃣ Run Migrations
npx prisma migrate dev
4️⃣ Start the Server
npm run dev

Server runs at:

http://localhost:3000
🚀 Deployment

Hosted on Render

PostgreSQL hosted on Render

Production migrations executed via:

npx prisma migrate deploy

Note: Free-tier instances may experience cold starts after inactivity.

⚠️ Challenges Faced

Handling conversion of primary contacts to secondary during merges

Ensuring strict idempotency

Preventing duplicate secondary entries

Maintaining proper response ordering

Correctly identifying connected clusters

Managing cold start behavior on free-tier deployment

📎 GitHub Repository

https://github.com/Ryshup/bitespeed-identity

✅ Final Notes

This implementation:

Correctly reconciles customer identities

Maintains a single primary per cluster

Handles complex merge scenarios

Preserves data consistency

Fully satisfies the requirements outlined in the assignment
