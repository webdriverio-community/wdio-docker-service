# Contributing to wdio-docker-service

Considering that purpose of this project is to test things I can't stress enough the importance to test your contribution.
Most of the code styling configuration should be handled by `.editorconfig` and `.eslintrc` included in the project. 
Please check your editor to see if it requires a plugin-in to run `.editorconfig` to ensure proper static analysis of your code.

## Setup
1. Fork this repository
2. Clone forked repo to your computer
3. Configure git remotes by adding `upstream` an setting it to `https://github.com/stsvilik/wdio-docker-service.git`
4. Install dependencies by running `npm install`.

# Making changes
1. Before you begin making your changes, please make sure you're in-sync with `upstream` by running `git reset --hard upstream/master`
2. Once you're in-sync with master, make your changes and commit them to a new branch. Please provide good messages for your commits.
3. Test your code to make sure it doesn't break by running `npm test` and `npm run test:integration`.
4. Once you're confident that your code works push your change branch to `origin` and open a pull request (PR)

## Code Style Guide
In case your editor does not respect `.editorconfig`, here is a summary of rules.
- spacing - use spaces not tabs
  - 4 spaces for `.js` files
  - 2 spaces for `package.json`, `.yml` and other configuration files that start with a `.`
- semicolons - mandatory!
- quotes - single-quote
- syntax - ES6/ES2015
- variable declarations - use `const` and `let`

Please look through existing code to get a general sense of the coding style and practice. Keep your changes consistent with original.

Thank You for deciding to help the community!
