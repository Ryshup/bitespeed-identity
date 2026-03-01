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
        { email: email ?? undefined },
        { phoneNumber: phoneNumber ?? undefined },
      ],
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
        emails: [newContact.email],
        phoneNumbers: [newContact.phoneNumber],
        secondaryContactIds: [],
      },
    });
  }

  // 3️⃣ Get all linked contacts (connected component)
  const contactIds = matchedContacts.map((c) =>
    c.linkPrecedence === "primary" ? c.id : c.linkedId!
  );

  const allLinkedContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: { in: contactIds } },
        { linkedId: { in: contactIds } },
      ],
    },
  });

  // 4️⃣ Determine oldest primary
  const primary = allLinkedContacts
    .filter((c) => c.linkPrecedence === "primary")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];

  // 5️⃣ Convert other primaries to secondary if needed
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

  // 6️⃣ If new info → create secondary
  const emailExists = allLinkedContacts.some((c) => c.email === email);
  const phoneExists = allLinkedContacts.some((c) => c.phoneNumber === phoneNumber);

  if (!emailExists || !phoneExists) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "secondary",
        linkedId: primary.id,
      },
    });
  }

  // 7️⃣ Fetch updated full component
  const finalContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primary.id },
        { linkedId: primary.id },
      ],
    },
  });

  return res.json({
    contact: {
      primaryContactId: primary.id,
      emails: [...new Set(finalContacts.map((c) => c.email).filter(Boolean))],
      phoneNumbers: [...new Set(finalContacts.map((c) => c.phoneNumber).filter(Boolean))],
      secondaryContactIds: finalContacts
        .filter((c) => c.linkPrecedence === "secondary")
        .map((c) => c.id),
    },
  });
});

export default router;