const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
    // Puppeteer browser ko isi folder me install karne ke liye
    cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
