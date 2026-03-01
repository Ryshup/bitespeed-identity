import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.post("/", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "Email or phoneNumber required" });
  }

  // 1️⃣ Find all contacts matching email OR phone
  const matchedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined,
      ].filter(Boolean) as any,
    },
  });

  // 2️⃣ If none found → create new primary
  if (matchedContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary",
      },
    });

    return res.json({
      contact: {
        primaryContactId: newContact.id,
        emails: newContact.email ? [newContact.email] : [],
        phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
        secondaryContactIds: [],
      },
    });
  }

  // 3️⃣ Collect all related contact IDs
  const rootIds = new Set<number>();

  for (const contact of matchedContacts) {
    if (contact.linkPrecedence === "primary") {
      rootIds.add(contact.id);
    } else if (contact.linkedId) {
      rootIds.add(contact.linkedId);
    }
  }

  const allLinkedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: Array.from(rootIds) } },
        { linkedId: { in: Array.from(rootIds) } },
      ],
    },
  });

  // 4️⃣ Determine oldest primary
  const primary = allLinkedContacts
    .filter((c) => c.linkPrecedence === "primary")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  // 5️⃣ Convert other primaries to secondary
  for (const contact of allLinkedContacts) {
    if (
      contact.linkPrecedence === "primary" &&
      contact.id !== primary.id
    ) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: primary.id,
        },
      });
    }
  }

  // 6️⃣ Create secondary ONLY if both email & phone exist AND exact pair doesn't exist
  if (email && phoneNumber) {
    const exactMatchExists = allLinkedContacts.some(
      (c) => c.email === email && c.phoneNumber === phoneNumber
    );

    if (!exactMatchExists) {
      await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: primary.id,
        },
      });
    }
  }

  // 7️⃣ Fetch updated cluster
  const finalContacts = await prisma.contact.findMany({
    where: {
      OR: [{ id: primary.id }, { linkedId: primary.id }],
    },
  });

  // Ensure primary's email/phone come first
  const primaryContact = finalContacts.find(
    (c) => c.id === primary.id
  );

  const emails = [
    primaryContact?.email,
    ...finalContacts
      .filter((c) => c.id !== primary.id)
      .map((c) => c.email),
  ]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const phoneNumbers = [
    primaryContact?.phoneNumber,
    ...finalContacts
      .filter((c) => c.id !== primary.id)
      .map((c) => c.phoneNumber),
  ]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return res.json({
    contact: {
      primaryContactId: primary.id,
      emails,
      phoneNumbers,
      secondaryContactIds: finalContacts
        .filter((c) => c.linkPrecedence === "secondary")
        .map((c) => c.id),
    },
  });
});

export default router;