const openpgp = require('openpgp')
const inquirer = require('inquirer')

openpgp.config.show_comment = false
openpgp.config.show_version = false

async function generate(name, passphrase) {
  const key = await openpgp.generateKey({
    userIds: [{ name, email: `${name.toLowerCase()}@example.com` }],
    curve: 'ed25519',
    passphrase
  })
  console.log('Public key:')
  console.log(key.publicKeyArmored)
  console.log('\nPrivate key:')
  console.log(key.privateKeyArmored)

  console.log('Public key:')
  console.log(JSON.stringify(key.publicKeyArmored).replace(/\\r/g, ''))
  console.log('\nPrivate key:')
  console.log(JSON.stringify(key.privateKeyArmored).replace(/\\r/g, ''))
}

inquirer
  .prompt([
    {
      type: 'password',
      message: 'Enter a password',
      name: 'password',
      mask: '*'
    }
  ])
  .then(answers => {
    generate('originstore', answers.password)
  })
