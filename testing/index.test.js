var assert = require("assert");
var goatee = require("../index.js");

describe(__filename, function() {
	// used to monkey patch console.log, console.warn in order to ensure that certain logging statements are working as intended
	var Monkey = function(type) {
		var self = this;
		
		self.type = type;
		self.messages = [];
		self.old = console[type];
		
		console[type] = self.process.bind(self);
	}
	
	Monkey.prototype.process = function() {
		var self = this;
		
		self.messages.push(Array.prototype.slice.call(arguments));
	}
	
	Monkey.prototype.unpatch = function() {
		var self = this;
		
		console[self.type] = self.old;
	}
	
	var warnPatch;
	
	beforeEach(function() {
		warnPatch = new Monkey("warn");
	});
	
	afterEach(function() {
		warnPatch.unpatch();
	});
	
	describe("lexer", function() {
		it("should handle basic tags", function() {
			assert.equal(goatee._lexer("{{foo}} {{bar}} {{:test.something}} () content {{/test.something}}"), "ϾfooϿ ϾbarϿ Ͼ:test.somethingϿ () content Ͼ/test.somethingϿ");
		});
		
		it("should handle parens", function() {
			assert.equal(goatee._lexer("{{foo.bar().baz(function() {}).qux(function() { console.log(')'); stuff = \")\"; }).moo}}"), "Ͼfoo.barԒ(Ԓ).bazԒ(function() {}Ԓ).quxԒ(function() { console.log(')'); stuff = \")\"; }Ԓ).mooϿ");
		});
		
		it("should unlex", function() {
			assert.equal(goatee._unlex("ϾfooϿ ϾbarϿ Ͼ:test.somethingϿ content Ͼ/test.somethingϿ"), "{{foo}} {{bar}} {{:test.something}} content {{/test.something}}");
		});
	});
	
	describe("filler", function() {
		it("should fail silently diving into subproperty of string", function() {
			var html = "{{key.bar}}";
			var result = goatee.fill(html, { key : "" });
			assert.equal(result, "");
		});
		
		it("should encode variables", function() {
			assert.equal("&lt;foo&gt;", goatee.fill("{{%key}}", { key : "<foo>" }));
		});
		
		it("should return yes", function() {
			assert.equal("yes", goatee.fill("{{key}}", { key : "yes" }));
		});
		
		it("should output true/false", function() {
			assert.equal("true", goatee.fill("{{key}}", { key : true }));
		});
		
		it("should do if statements", function() {
			assert.equal("yes", goatee.fill("{{:foo}}yes{{/foo}}", { foo : "yes" }));
			assert.equal("yes", goatee.fill("{{:foo}}yes{{/}}", { foo : "yes" }));
		});
		
		it("should prepend during and after content with sections", function() {
			// goatee has has to prepend non-tag characters within tags properly, test here to ensure it's doing it properly
			assert.equal(goatee.fill("AA {{#foo}} BB {{bar}} DD {{/foo}} EE", { foo : { bar : "CC" } }), "AA  BB CC DD  EE");
		});
		
		it("should access properties and prototypes on objects and arrays", function() {
			var data = {
				foo : [1,2,3],
				bar : {
					inner : "foo"
				}
			}
			
			assert.equal(goatee.fill("{{foo.length}} {{bar.inner}}", data), "3 foo");
		});
		
		it("should not fail on recursive undefined", function() {
			var html = "{{foo.bar.baz.qux}}";
			
			assert.equal(goatee.fill(html, {}), "");
		});
		
		it("should allow partials", function() {
			var html = "{{>foo}}";
			var foo = "{{key}}";
			
			var result = goatee.fill(html, { key : "yes" }, { foo : foo });
			assert.ok(result === "yes")
		});
		
		it("should allow declaration of partials", function() {
			var html = "{{+foo}}{{foo}}{{bar()}}{{/foo}}{{>foo}}";
			
			var result = goatee.fill(html, { foo : "yes", bar : function() { return "yes" } }, { foo : "fake" });
			assert.equal(result, "yesyes");
			
			var html = "{{+foo}}{{#data}}{{foo}}{{/data}}{{/foo}}{{>foo}}";
			var result = goatee.fill(html, { data : [{ foo : "one" }, { foo : "two" }] });
			assert.equal(result, "onetwo");
		});
		
		it("should allow partials with mixed case", function() {
			var html = "{{>FoO}}";
			var foo = "{{key}}";
			
			var result = goatee.fill(html, { key : "yes" }, { FoO : foo });
			assert.ok(result === "yes");
		});
		
		it("should give precendence to exact case match in partials", function() {
			var html = "{{>FoO}}";
			
			var result = goatee.fill(html, { key : "yes" }, { foo : "NO", foO : "NO", FoO : "{{key}}" });
			assert.ok(result === "yes");
		});
		
		it("should ignore case for keys", function() {
			var html = "{{FoO}}";
			
			var result = goatee.fill(html, { foo : "yes" });
			assert.equal(result, "yes");
		});
		
		it("should give precendence to exact case match in keys", function() {
			var html = "{{FoO}}";
			
			var result = goatee.fill(html, { FoO : "yes", foo : "no" });
			assert.equal(result, "yes");
		});
		
		it("should iterate over arrays with extraData and mixed case", function() {
			var html = "{{#data}}{{@row}} {{@FiRst}} {{@last}} {{@eVeN}} {{@ODD}} {{/data}}";
			
			var result = goatee.fill(html, { data : [1,2,3] });
			assert.equal(result, "1 true false false true 2 false false true false 3 false true false true ");
		});
		
		it("should access array rows by key", function() {
			var html = "{{data.1.foo}}";
			
			var result = goatee.fill(html, { data : [1, { foo : "yes" }, 3] });
			assert.equal(result, "yes");
		});
		
		it("should step into objects", function() {
			var html = "{{#data}}{{#foo}}{{bar}}{{/foo}}{{/data}}"
			
			var result = goatee.fill(html, { data : { foo : { bar : "yes" } } });
			assert.equal(result, "yes");
		});
		
		it("should autocreate global vars", function() {
			var html = "{{*foo}}";
			
			var result = goatee.fill(html, { foo : "yes" });
			assert.equal(result, "yes");
		});
		
		it("should access global vars", function() {
			var html = "{{#*foo}}{{bar}}{{/*foo}}";
			
			var result = goatee.fill(html, { foo : "notarray" }, {}, { foo : { bar : "yes" } });
			assert.equal(result, "yes");
		});
		
		it("should backTrack", function() {
			assert.equal(goatee.fill("{{#foo}}{{-bar}}{{/foo}}", { foo : { bar : "no" }, bar : "yes" }), "yes");
			assert.equal(goatee.fill("{{-foo}}", { foo : "no" }), "");
			assert.equal(goatee.fill("{{#foo}}{{----bar}}{{/}}", { foo : [1,2,3] }), "");
			assert.equal(goatee.fill("{{#foo}}{{#bar}}{{data}}{{-data}}{{--data}}{{---data}}{{/bar}}{{/foo}}", { foo : [{ bar : [{ data : "1" }], data : "2" }], data : "3" }), "123");
			assert.equal(goatee.fill("{{#foo}}{{:-bar}}yes{{/-bar}}{{!bar}}yes{{/bar}}{{/foo}}", { foo : [{ bar : false }], bar : true }), "yesyes");
		});
		
		it("should call function", function() {
			var data = {
				foo : function() { return "yes" }
			}
			
			assert.equal(goatee.fill("{{foo}}", data), "");
			assert.equal(goatee.fill("{{foo()}}", data), "yes");
		});
		
		it("should handler string, number, boolean, array, object and function in function arguments", function() {
			var data = {
				foo : function(arg1, arg2, arg3, arg4, arg5, arg6) {
					assert.equal(arg1, "yes");
					assert.equal(arg2, 5);
					assert.equal(arg3, true);
					assert.deepEqual(arg4, [1,2,3]);
					assert.deepEqual(arg5, { foo : "bar" });
					assert.equal(arg6(), "passed");
					
					return "yes";
				}
			}
			
			var html = "{{foo('yes', 5, true, [1,2,3], { foo : 'bar' }, function() { return 'passed' })}}";
			
			assert.equal(goatee.fill(html, data), "yes");
		});
		
		it("should chain function calls", function() {
			var html = '{{foo(2).bar({ "foo" : "bar()" }).baz(1,2,3)}}';
			
			var result = goatee.fill(html, {
				foo : function(args) {
					assert.equal(args, 2);
					
					return {
						bar : function(args) {
							assert.equal(args.foo, "bar()");
							
							return {
								baz : function(args, args2, args3) {
									assert.equal(args, 1);
									assert.equal(args2, 2);
									assert.equal(args3, 3);
									
									return "yes";
								}
							}
						}
					}
				}
			});
			
			assert.equal(result, "yes");
		});
		
		it("should have access to data, global and extraData", function() {
			var html = "{{#array}}{{*foo(data.foo, global.bar, extra.row)}}{{/array}}"
			
			var data = {
				array : [{ foo : "yes" }]
			}
			
			var global = {
				foo : function(arg1, arg2, arg3) {
					return arg1 + " " + arg2 + " " + arg3;
				},
				bar : "yes2",
			}
			
			assert.equal(goatee.fill(html, data, {}, global), "yes yes2 1");
		});
		
		it("should not have access to important variables", function() {
			var allUndefined = function(arg1) { return arg1.filter(function(val) { return val !== undefined }).length === 0; }
			
			var html = "{{foo([window, process, require, setTimeout, setInterval, clearTimeout, clearInterval, __dirname, __filename, module, exports, Buffer, define])}}";
			assert.equal(goatee.fill(html, { foo : allUndefined }), "true");
		});
		
		it("should parse eval in function call", function() {
			var html = '{{foo({ "foo" : "foo_value", "bar" : 1, "baz" : true }, 2)}}';
			
			var MyObj = function(args) {
				var self = this;
				
				self.myFoo = "foo";
			}
			
			MyObj.prototype.foo = function(args, args2) {
				var self = this;
				
				assert.equal(self.myFoo, "foo"); // check to ensure 'this' is maintained
				assert.equal(args.foo, "foo_value");
				assert.equal(args.bar, 1);
				assert.equal(args.baz, true);
				assert.equal(args2, 2);
				
				return "yes";
			}
			
			var result = goatee.fill(html, new MyObj());
			
			assert.equal(result, "yes");
		});
		
		it("should not throw error on bogus javascript", function() {
			var html = "{{foo(broken)}}";
			var data = {
				foo : function(arg1) {
					throw new Error("Should not get here");
					
					return "no";
				}
			}
			
			assert.equal(goatee.fill(html, data), "");
			assert.equal(warnPatch.messages[0][0], "broken is not defined");
		});
		
		it("should execute equal helper", function() {
			// standard equality checks
			assert.equal(goatee.fill("{{~equal(1,1)}}", {}), "true");
			assert.equal(goatee.fill('{{~equal(data.foo, true)}}', { foo : true }), "true");
			assert.equal(goatee.fill('{{~equal(data.foo, data.bar)}}', { foo : 5, bar : 5 }), "true");
			assert.equal(goatee.fill('{{~equal(1,3)}}', {}), "false");
			
			// equality checks with bad data
			assert.equal(goatee.fill('{{:~equal(global.data.foo.bar, 3)}}yes{{/}}', {}), "");
			assert.equal(goatee.fill('{{!~equal(global.data.foo.bar, 3)}}yes{{/}}', {}), "yes");
		});
		
		it("should execute equal helper while iterating over array to other element", function() {
			var data = {
				array : [{ label : "Foo", value : "foo" }, { label : "Bar", value : "bar" }, { label : "Baz", value : "foo" }],
				current : "foo"
			}
			
			assert.equal(goatee.fill("{{#array}}{{~equal(data.value, global.current)}} {{/array}}", data), "true false true ");
		});
		
		it("should execute contains helper", function() {
			assert.equal(goatee.fill("{{~contains([1,2,3], 2)}}", {}), "true");
			
			// test various cases where variables are undefined or improper types
			assert.equal(goatee.fill("{{:~contains(data.foo.bar, 2)}}yes{{/}}", {}), "");
			assert.equal(goatee.fill("{{:~contains(data.foo.bar, fake)}}yes{{/}}", {}), "");
			assert.equal(goatee.fill("{{!~contains(data.foo.bar, 2)}}yes{{/}}", {}), "yes");
			assert.equal(goatee.fill("{{:~contains(5, 2)}}no{{/}}", {}), "");
			
			// ensure it works for the odd case of a string value on both sides
			assert.equal(goatee.fill("{{:~contains('foo', 'f')}}yes{{/}}", {}), "yes");
			
			var data = { array : [{ value : 1 }, { value : 2 }, { value : 1 }, { value : 3 }], current : [1,3] };
			assert.equal(goatee.fill("{{#array}}{{~contains(global.current, data.value)}} {{/array}}", data), "true false true true ");
		});
		
		it("should execute setVar and var helper", function() {
			assert.equal(goatee.fill("{{~setVar('foo', 'something awesome')}}{{~var.foo}}", {}), "something awesome");
			assert.equal(goatee.fill("{{~setVar('foo', (function() { return data.foo.length === 3; })())}} {{:~var.foo}}yes{{/~var.foo}}", { foo : [1,2,3] }), " yes");
			assert.equal(goatee.fill("{{~setVar('foo', 'yes')}}{{~equal(helpers.var.foo, 'yes')}}", {}), "true");
			
			// ensure set var from previous fill() call is not present
			assert.equal(goatee.fill("{{:~var.foo}}no{{/~var.foo}}", {}), "");
		});
		
		it("should execute exec helper", function() {
			// standard test
			assert.equal(goatee.fill("{{~exec(function() { return 'yes' })}}", {}), "yes");
			assert.equal(goatee.fill("{{~exec(function() { return global.foo + ' ' + data.foo; })}}", { foo : "local" }, {}, { foo : "global" }), "global local");
			// ensure it fails gracefully for non-functions
			assert.equal(goatee.fill("{{~exec('foo')}}", {}), "foo");
			// ensure it fails gracefully for execing functions which throw errors
			assert.equal(goatee.fill("{{~exec(function() { fake.is.real = foo; return 'no' })}}", {}), "");
			// ensure it does not allow access to important variables
			assert.equal(goatee.fill("{{~exec(function() { return process === undefined })}}", {}), "true");
			
			// ensure it can exec without an inner function
			var data = { foo : "bar", baz : [1,2] };
			assert.equal(goatee.fill("{{~exec(JSON.stringify(data))}}", { foo : "bar", baz : [1,2] }), JSON.stringify(data));
		});
		
		it("should handle complex nesting", function() {
			// inner content has }} which needs to be interpreted as a non-tag, in addition it contains ). which needs to not-trick the parenthesis tag term processor
			assert.equal(goatee.fill("{{~exec(function() { return JSON.stringify({ test : { foo : ([]).indexOf('i') }}) })}}", {}), '{"test":{"foo":-1}}');
			// another test more symbols, parens and even more garbage
			assert.equal(goatee.fill('{{~setVar("isValid", data.published === true && (new Date()).getTime() > data.startTime)}}{{~var.isValid}}', { published : true, startTime : 10 }), "true");
		});
		
		it("should handle multi-line exec", function() {
			var template = "{{~exec(function() {	\r\n\
				var temp = data.foo + '_trail';		\r\n\
				return temp;						\r\n\
			})}}";
			
			assert.equal(goatee.fill(template, { foo : "fooValue" }), "fooValue_trail");
		});
		
		it("should output partial", function() {
			// output standard partial
			assert.equal(goatee.fill("{{~partial('foo')}}", {}, { foo : "{{stuff}}" }), "{{stuff}}");
			
			// output dynamically declared partial
			assert.equal(goatee.fill("{{+test}}{{foo}}{{/}}{{~partial('test')}}", {}), "{{foo}}");
		});
		
		it("should execute log helper", function() {
			var result;
			
			// monkeyPatch console.log
			var logPatch = new Monkey("log");
			
			goatee.fill("{{~log(data)}}", { foo : "something", bar : [1] });
			assert.equal(logPatch.messages[0][0].foo, "something");
			assert.equal(logPatch.messages[0][0].bar[0], 1);
			
			//console.log = oldLog;
			goatee.fill("{{#data}}{{~log(data, extra)}}{{/data}}", { data : [{ foo : "fooValue" }] });
			assert.equal(logPatch.messages[1][0].foo, "fooValue");
			assert.equal(logPatch.messages[1][1].row, 1);
			
			// bad variable should effectively error
			logPatch.messages = [];
			result = undefined;
			goatee.fill("{{~log(bogus)}}", { foo : true });
			assert.equal(logPatch.messages.length, 0);
			
			var data = { a : "a" };
			data.b = data;
			goatee.fill("{{~log(data)}}", data);
			assert.equal(logPatch.messages[0][0].a, "a");
			assert.equal(logPatch.messages[0][0].b.a, "a");
			
			// remove console.log monkeyPatch
			logPatch.unpatch();
		});
		
		it("should not run preserved html", function() {
			var inner = "{{#foo}} {{something}} {{/foo}} {{>more}} {{#foo}}{{#bar}}{{>foo}}{{/bar}}{{/foo}}";
			assert.equal(goatee.fill("{{$}}" + inner + "{{/}}", { foo : "no" }), inner);
			var html = "{{foo}} {{>more}} {{bar}}";
			assert.equal(goatee.fill(html, { foo : "foo", bar : "bar" }, { more : "{{$}}{{foo}}{{/}}" }), "foo {{foo}} bar");
		});
		
		it("should not add partials within perserved html", function() {
			var html = "{{$}}{{+test}}{{foo}}{{/test}}{{/}}{{>test}}";
			var result = goatee.fill(html, { foo : "no" });
			assert.equal(result, "{{+test}}{{foo}}{{/test}}");
		});
		
		it("should leave non-goatee code unchanged", function() {
			assert.equal(goatee.fill("}}", {}), "}}");
		});
		
		// Odd regex situation, not sure how to classify this, the regex parser was unable to handle this previously for some reason
		// testing to prevent regression
		it("should handle odd nesting situation", function() {
			var template = "{{~setVar('something', true)}}{{foo(data.bar).baz(data.baz)}}";
			var data = {
				foo : function(bar) {
					return {
						baz : function(baz) {
							return bar + "_" + baz;
						}
					}
				},
				bar : "barValue",
				baz : "bazValue"
			}
			
			assert.equal(goatee.fill(template, data), "barValue_bazValue");
		});
	});
	
	describe("plugins", function() {
		it("should have instance version for plugins", function() {
			var temp = new goatee.Goatee();
			
			temp.addPlugin("test", { io : function(val) { return "fromPlugin" + val } });
			
			assert.equal(temp.fill("{{foo}}{{*foo}}{{~plugins.test.io(data.foo)}}", { foo : "fooLocal" }), "fooLocalfooLocalfromPluginfooLocal");
			assert.equal(temp.fill("{{foo}}{{*foo}}{{~plugins.test.io(data.foo)}}", { foo : "fooLocal" }, {}, { foo : "fooGlobal" }), "fooLocalfooGlobalfromPluginfooLocal");
			assert.equal(temp.fill("{{foo}}{{*foo}}{{>foo}}", { foo : "fooLocal" }, { foo : "partial" }, { foo : "fooGlobal" }), "fooLocalfooGlobalpartial");
		});
	});
});