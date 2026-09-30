// ⚠️ DELIBERATELY WRONG. This is what Lab B.4 asks you to find and fix.
//
// Every value below is fake, but the mistake is real and extremely common:
// credentials written straight into source code, then committed to git.
//
// Once a secret is committed it is in the repository history FOREVER, even if you
// delete the line in the next commit. The only real fix is to rotate the secret.

const config = {
  port: 3000,

  // PROBLEM: a real-looking API key in source control
  apiKey: 'sk_live_51H8xQ2KpL9mNvR3tY7wZ4aB6cD8eF0gH',

  // PROBLEM: database credentials in source control
  database: {
    host: 'prod-db.example.com',
    user: 'admin',
    password: 'P@ssw0rd123!'
  },

  // PROBLEM: a private token in source control
  dockerHubToken: 'dckr_pat_aBcDeFgHiJkLmNoPqRsTuVwXyZ'
};

module.exports = config;

// ---------------------------------------------------------------------------
// THE FIX — read them from the environment instead, and supply the values at
// run time from a secret store (GitHub Secrets, AWS Secrets Manager, Vault):
//
// const config = {
//   port: process.env.PORT || 3000,
//   apiKey: process.env.API_KEY,
//   database: {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD
//   },
//   dockerHubToken: process.env.DOCKERHUB_TOKEN
// };
//
// Nothing secret is in the file. The file is safe to commit. The values arrive
// from outside, and can be rotated without changing any code.
// ---------------------------------------------------------------------------
