import test from "node:test";
import assert from "node:assert/strict";
import { businessContactHrefs } from "./businessContacts.js";
test("empty enabled contacts never create actions",()=>{
 assert.deepEqual(businessContactHrefs({enabled:["call","directions","website"],call:"  ",directions:" ",website:""}),{});
 assert.deepEqual(businessContactHrefs({enabled:["call"],call:"+"}),{});
});
test("only enabled valid contacts have working destinations",()=>{
 const hrefs=businessContactHrefs({enabled:["call","directions","website"],call:"+94 77 123 4567",directions:" Colombo ",website:"https://example.com"});
 assert.equal(hrefs.call,"tel:+94771234567");
 assert.equal(hrefs.directions,"https://www.google.com/maps/search/?api=1&query=Colombo");
 assert.equal(hrefs.website,"https://example.com/");
 assert.deepEqual(businessContactHrefs({enabled:[],call:"123",directions:"Colombo",website:"https://example.com"}),{});
 assert.deepEqual(businessContactHrefs({enabled:["website"],website:"javascript:alert(1)"}),{});
});
