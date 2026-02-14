const bcrypt = require('bcryptjs');
const User = require('../model/User.model');

const seedOwnerAccount = async () => {
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerPhone = process.env.OWNER_PHONE;
  const ownerName = process.env.OWNER_NAME || 'System Owner';
  const ownerPassword = process.env.OWNER_PASSWORD;

  if (!ownerEmail || !ownerPhone || !ownerPassword) {
    console.warn('Skip owner seed: OWNER_EMAIL/OWNER_PHONE/OWNER_PASSWORD not configured');
    return;
  }

  const existingOwner = await User.findOne({
    $or: [{ email: ownerEmail }, { phone: ownerPhone }]
  });

  if (existingOwner) {
    let shouldSave = false;

    if (existingOwner.role !== 'owner') {
      existingOwner.role = 'owner';
      shouldSave = true;
    }

    if (existingOwner.status !== 'active') {
      existingOwner.status = 'active';
      shouldSave = true;
    }

    if (shouldSave) {
      await existingOwner.save();
    }

    console.log('Owner account already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  await User.create({
    role: 'owner',
    name: ownerName,
    phone: ownerPhone,
    email: ownerEmail,
    passwordHash,
    status: 'active'
  });

  console.log('Owner account seeded successfully');
};

module.exports = seedOwnerAccount;
