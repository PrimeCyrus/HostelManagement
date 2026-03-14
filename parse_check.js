const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('views/admin-dashboard.html', 'utf-8');
const dom = new JSDOM(html);
const modal = dom.window.document.getElementById('wardenModal');
console.log("Modal display style:", dom.window.getComputedStyle(modal).display);
console.log("Modal classes:", modal.className);
