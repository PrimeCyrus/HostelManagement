const fs = require('fs');
const html = fs.readFileSync('views/admin-dashboard.html', 'utf-8');
const cheerio = require('cheerio');
const $ = cheerio.load(html);
const modal = $('#wardenModal');
console.log("Modal classes:", modal.attr('class'));
console.log("Modal display style from style attr:", modal.attr('style'));
const css = $('style').text();
if(css.includes('.modal-overlay')) {
  console.log("Found .modal-overlay in CSS.");
} else {
  console.log("MISSING .modal-overlay in CSS!");
}
