const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
  console.error('用法：node scripts/hash-password.cjs <明碼密碼>');
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 10));
