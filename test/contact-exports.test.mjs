import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {contactsXlsx,contactsPrint} from '../server/contact-exports.mjs';
test('Excel exports keep Vietnamese text, phone prefixes and formulas as literal strings',()=>{
 const rows=[{reference:'QA-ONLY',created_at:'2026-11-19T18:00:00Z',payload:{name:'Nguyễn <An> & "Bình"',phone:'+84879089789',message:'=HYPERLINK("https://invalid.test")',route:'US',carrier:'uniuni'},status:'received',notes:'Tiếng Việt'}];
 const files=unzipSync(contactsXlsx(rows,true));
 assert.ok(files['[Content_Types].xml']);assert.ok(files['xl/_rels/workbook.xml.rels']);
 const sheet=strFromU8(files['xl/worksheets/sheet1.xml']);
 assert.ok(sheet.includes('UniUni'));assert.ok(sheet.includes('autoFilter ref="A1:M2"'));
 assert.ok(sheet.includes('Nguyễn &lt;An&gt; &amp; &quot;Bình&quot;'));assert.ok(sheet.includes('+84879089789'));assert.ok(sheet.includes('2026-11-20 01:00:00'));
 assert.ok(sheet.includes('=HYPERLINK'));assert.ok(!sheet.includes('<f>'));assert.ok(sheet.includes('t="inlineStr"'));assert.ok(sheet.includes('Tiếng Việt'));
 const html=contactsPrint(rows,new URLSearchParams('lang=vi&q=%3Cscript%3E'));
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('In / Lưu PDF'));assert.ok(html.includes('Nguyễn &lt;An&gt;'));
});
